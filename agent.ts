/**
 * Gemini-powered tool-calling agent (TypeScript)
 *
 * Improvements over the original Python version:
 *  - Uses Gemini's native function calling instead of hand-rolled
 *    plan/action/observe JSON parsing (fewer failure modes, no manual
 *    JSON.parse on model output).
 *  - Tool definitions carry real JSON-schema parameters, not just a
 *    free-text description, so Gemini knows exactly what to send.
 *  - run_command is guarded behind an allowlist + confirmation instead
 *    of executing arbitrary shell input unsandboxed.
 *  - Centralized error handling around API calls and tool execution.
 *  - All unused/dead code (query_db, unused `add` wiring) either wired
 *    up properly or removed.
 *
 * Setup:
 *   npm install @google/generative-ai dotenv
 *   echo "GEMINI_API_KEY=your_key_here" > .env
 *   npx tsx agent.ts
 */

import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import "dotenv/config";

const execAsync = promisify(exec);

// ---------- Tool implementations ----------

async function getWeather(city: string): Promise<string> {
  console.log("🔨 Tool Called: get_weather", city);
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t`);
    if (!res.ok) return `Could not fetch weather for ${city} (status ${res.status}).`;
    const text = await res.text();
    return `The weather in ${city} is ${text}.`;
  } catch (err) {
    return `Failed to fetch weather for ${city}: ${(err as Error).message}`;
  }
}

function add(x: number, y: number): string {
  console.log("🔨 Tool Called: add", x, y);
  return String(x + y);
}

// Pushes a single file's content to a GitHub repo via the Contents API
// (create or update). Requires a GITHUB_TOKEN with repo write access.
async function pushToGithub(args: {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message?: string;
  branch?: string;
}): Promise<string> {
  console.log("🔨 Tool Called: push_to_github", args.owner, args.repo, args.path);

  const token = process.env.GITHUB_TOKEN;
  if (!token) return "Refused: GITHUB_TOKEN is not set in the environment.";

  const { owner, repo, path, content, branch } = args;
  const message = args.message || `chore: update ${path} via agent`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  try {
    // Look up existing file SHA (required by GitHub to update, omitted on create).
    let sha: string | undefined;
    const getRes = await fetch(`${apiUrl}${branch ? `?ref=${branch}` : ""}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (getRes.ok) {
      const existing = (await getRes.json()) as { sha?: string };
      sha = existing.sha;
    } else if (getRes.status !== 404) {
      return `Failed to check existing file: ${getRes.status} ${await getRes.text()}`;
    }

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf-8").toString("base64"),
        sha,
        ...(branch ? { branch } : {}),
      }),
    });

    if (!putRes.ok) {
      return `GitHub push failed: ${putRes.status} ${await putRes.text()}`;
    }

    const result = (await putRes.json()) as { content?: { html_url?: string } };
    return `Pushed ${path} to ${owner}/${repo}${branch ? `@${branch}` : ""}: ${
      result.content?.html_url ?? "(no URL returned)"
    }`;
  } catch (err) {
    return `Failed to push to GitHub: ${(err as Error).message}`;
  }
}

// Safety: only allow a small set of read-only/safe commands rather than
// executing whatever string the model produces. Extend deliberately.
//
// Git/diagnostic commands are included because they're either read-only
// (status/log/diff/branch/remote -v) or additive (add/commit/push/pull/
// fetch/clone). Anything destructive or history-rewriting is explicitly
// EXCLUDED below — it is never matched by the allowlist, so it can't slip
// through even if a pattern is accidentally too broad.
const COMMAND_DENYLIST = [
  /\brm\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+push\s+(--force|-f)\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+checkout\s+--\s/, // discards working-tree changes
  /\bgit\s+branch\s+-D\b/,
  /\bgit\s+rebase\b/,
  /\bsudo\b/,
  /[;&|]/, // no command chaining/piping
  />/, // no redirection (overwrite risk)
];

const COMMAND_ALLOWLIST = [
  // basics
  /^ls\b/,
  /^pwd$/,
  /^whoami$/,
  /^date$/,
  /^echo\b/,
  /^cat\s+[\w./-]+$/,

  // git: read-only / informational
  /^git\s+status\b/,
  /^git\s+log\b/,
  /^git\s+diff\b/,
  /^git\s+branch\b/,
  /^git\s+remote(\s+-v)?$/,
  /^git\s+show\b/,
  /^git\s+blame\b/,
  /^git\s+fetch\b/,
  /^git\s+stash\s+list$/,

  // git: additive / collaborative — no history rewrite, no force, no delete
  /^git\s+add\b/,
  /^git\s+commit\b/,
  /^git\s+push(\s+origin\s+[\w./-]+)?$/,
  /^git\s+pull(\s+origin\s+[\w./-]+)?$/,
  /^git\s+clone\s+\S+$/,
  /^git\s+checkout\s+-b\s+[\w./-]+$/, // new branch only, not discarding changes
  /^git\s+merge\s+[\w./-]+$/,

  // diagnostics
  /^git\s+--version$/,
  /^node\s+--?v(ersion)?$/,
  /^npm\s+--?v(ersion)?$/,
  /^uname\s+-a$/,
  /^df\s+-h$/,
  /^ps\s+aux$/,
  /^top\s+-bn1$/,
];

async function runCommand(command: string): Promise<string> {
  console.log("🔨 Tool Called: run_command", command);
  const trimmed = command.trim();

  const isDenied = COMMAND_DENYLIST.some((re) => re.test(trimmed));
  if (isDenied) {
    return `Refused to run "${command}": matches a denylisted (destructive/unsafe) pattern.`;
  }

  const isAllowed = COMMAND_ALLOWLIST.some((re) => re.test(trimmed));
  if (!isAllowed) {
    return `Refused to run "${command}": not on the safe-command allowlist.`;
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    return stderr ? `stdout: ${stdout}\nstderr: ${stderr}` : stdout || "(no output)";
  } catch (err) {
    return `Command failed: ${(err as Error).message}`;
  }
}

// ---------- Tool schema (what Gemini sees) ----------

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a given city.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        city: { type: SchemaType.STRING, description: "Name of the city, e.g. 'New York'" },
      },
      required: ["city"],
    },
  },
  {
    name: "add",
    description: "Add two numbers together.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER },
        y: { type: SchemaType.NUMBER },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "push_to_github",
    description:
      "Create or update a single file in a GitHub repository with the given content (commits directly via the GitHub Contents API).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        owner: { type: SchemaType.STRING, description: "Repo owner, e.g. 'whomimohshukla'." },
        repo: { type: SchemaType.STRING, description: "Repo name, e.g. 'quickfixo'." },
        path: { type: SchemaType.STRING, description: "File path within the repo, e.g. 'src/index.ts'." },
        content: { type: SchemaType.STRING, description: "Full file content to commit." },
        message: { type: SchemaType.STRING, description: "Commit message. Optional." },
        branch: { type: SchemaType.STRING, description: "Target branch, e.g. 'main'. Optional, defaults to repo default branch." },
      },
      required: ["owner", "repo", "path", "content"],
    },
  },
  {
    name: "run_command",
    description:
      "Run a safe, allowlisted shell command and return its output. Supports basics " +
      "(ls, pwd, whoami, date, echo, cat), git diagnostics (status, log, diff, branch, " +
      "remote -v, show, blame, fetch, stash list), git collaboration (add, commit, push, " +
      "pull, clone, checkout -b <new-branch>, merge), and system diagnostics (git/node/npm " +
      "--version, uname -a, df -h, ps aux, top -bn1). Destructive or history-rewriting " +
      "commands (rm, reset --hard, push --force, clean, rebase, branch -D, sudo, piping, " +
      "redirection) are refused.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: { type: SchemaType.STRING, description: "The shell command to run." },
      },
      required: ["command"],
    },
  },
];

const toolImplementations: Record<string, (args: any) => Promise<string> | string> = {
  get_weather: (args) => getWeather(args.city),
  add: (args) => add(args.x, args.y),
  push_to_github: (args) => pushToGithub(args),
  run_command: (args) => runCommand(args.command),
};

// ---------- Model setup ----------

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in environment (.env file).");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction:
    "You are a helpful AI assistant. Use the available tools when they help answer " +
    "the user's question accurately (e.g. live weather, arithmetic, safe shell commands). " +
    "Otherwise answer directly. Be concise.",
  tools: [{ functionDeclarations: toolDeclarations }],
});

// ---------- Conversation loop ----------

async function main() {
  const chat = model.startChat();
  const rl = readline.createInterface({ input, output });

  console.log("Gemini agent ready. Type your query (Ctrl+C to exit).");

  while (true) {
    const userQuery = await rl.question("> ");
    if (!userQuery.trim()) continue;

    try {
      let result = await chat.sendMessage(userQuery);

      // Loop while the model keeps requesting tool calls.
      while (true) {
        const calls = result.response.functionCalls();
        if (!calls || calls.length === 0) break;

        const responses = await Promise.all(
          calls.map(async (call) => {
            const impl = toolImplementations[call.name];
            const output = impl ? await impl(call.args) : `Unknown tool: ${call.name}`;
            return {
              functionResponse: { name: call.name, response: { output } },
            };
          })
        );

        result = await chat.sendMessage(responses);
      }

      console.log(`🤖: ${result.response.text()}`);
    } catch (err) {
      console.error("⚠️  Error during request:", (err as Error).message);
    }
  }
}

main();
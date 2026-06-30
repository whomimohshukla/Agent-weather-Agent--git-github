/**
 * VibeCode — lightweight AI coding agent (TypeScript + Gemini)
 *
 * Tools: read_file · write_file · edit_file · list_directory
 *        search_files · run_command (dev-safe allowlist)
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
import * as fs from "node:fs/promises";
import * as path from "node:path";
import "dotenv/config";

const execAsync = promisify(exec);

// ─── ANSI colours (zero deps) ────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  dim:   "\x1b[2m",
  cyan:  "\x1b[36m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  red:   "\x1b[31m",
  magenta:"\x1b[35m",
  blue:  "\x1b[34m",
  white: "\x1b[97m",
};
const paint = (color: string, text: string) => `${color}${text}${c.reset}`;

// ─── Spinner ──────────────────────────────────────────────────────────────────
function spinner(label: string) {
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${paint(c.cyan, frames[i++ % frames.length])} ${paint(c.dim, label)}   `);
  }, 80);
  return () => { clearInterval(id); process.stdout.write("\r\x1b[K"); };
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function readFile(filePath: string): Promise<string> {
  console.log(paint(c.yellow, `  📄 read_file`) + paint(c.dim, ` ${filePath}`));
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (err) {
    return `Error reading file: ${(err as Error).message}`;
  }
}

async function writeFile(filePath: string, content: string): Promise<string> {
  console.log(paint(c.green, `  ✏️  write_file`) + paint(c.dim, ` ${filePath}`));
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return `Written ${filePath} (${content.length} chars)`;
  } catch (err) {
    return `Error writing file: ${(err as Error).message}`;
  }
}

async function editFile(filePath: string, oldStr: string, newStr: string): Promise<string> {
  console.log(paint(c.magenta, `  🔧 edit_file`) + paint(c.dim, ` ${filePath}`));
  try {
    const original = await fs.readFile(filePath, "utf-8");
    if (!original.includes(oldStr)) return `edit_file: old_str not found in ${filePath}`;
    const updated = original.replace(oldStr, newStr);
    await fs.writeFile(filePath, updated, "utf-8");
    return `Edited ${filePath} successfully.`;
  } catch (err) {
    return `Error editing file: ${(err as Error).message}`;
  }
}

async function listDirectory(dirPath: string, recursive = false): Promise<string> {
  console.log(paint(c.blue, `  📁 list_directory`) + paint(c.dim, ` ${dirPath}`));
  try {
    const flag = recursive ? "-R" : "";
    const { stdout } = await execAsync(`ls ${flag} ${dirPath}`, { timeout: 5000 });
    return stdout || "(empty)";
  } catch (err) {
    return `Error listing directory: ${(err as Error).message}`;
  }
}

async function searchFiles(pattern: string, directory = "."): Promise<string> {
  console.log(paint(c.cyan, `  🔍 search_files`) + paint(c.dim, ` "${pattern}" in ${directory}`));
  try {
    const { stdout } = await execAsync(
      `grep -r --include="*.ts" --include="*.js" --include="*.tsx" --include="*.json" -n "${pattern}" ${directory} 2>/dev/null || true`,
      { timeout: 8000 }
    );
    return stdout.trim() || "No matches found.";
  } catch (err) {
    return `Search error: ${(err as Error).message}`;
  }
}

// ─── run_command: denylist first, then allowlist ──────────────────────────────

const DENYLIST = [
  /\brm\s+-rf?\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+push\s+(--force|-f)\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+rebase\b/,
  /\bgit\s+branch\s+-D\b/,
  /\bsudo\b/,
  /\bchmod\s+777\b/,
  /\bkill\s+-9\b/,
  /\bdd\s+if=/,
  /[;&|`]/, // no chaining
  />/,       // no redirection
];

const ALLOWLIST = [
  // filesystem (read-only)
  /^ls\b/, /^pwd$/, /^cat\s+[\w./-]+$/, /^head\b/, /^tail\b/, /^wc\b/, /^find\b/,
  // system info
  /^whoami$/, /^date$/, /^uname\b/, /^df\s+-h$/, /^ps\s+aux$/, /^top\s+-bn1$/,
  // node / package managers
  /^node\b/, /^npm\b/, /^npx\b/, /^pnpm\b/, /^yarn\b/, /^bun\b/,
  // typescript / build tools
  /^tsc\b/, /^tsx\b/, /^vite\b/, /^esbuild\b/, /^swc\b/, /^turbo\b/,
  // testing
  /^jest\b/, /^vitest\b/, /^mocha\b/, /^playwright\b/, /^cypress\b/,
  // linting / formatting
  /^eslint\b/, /^prettier\b/, /^biome\b/,
  // git (safe subset)
  /^git\s+(status|log|diff|branch|remote|show|blame|fetch|stash list)\b/,
  /^git\s+add\b/,
  /^git\s+commit\b/,
  /^git\s+push(\s+origin\s+[\w./-]+)?$/,
  /^git\s+pull(\s+origin\s+[\w./-]+)?$/,
  /^git\s+clone\s+\S+$/,
  /^git\s+checkout\s+-b\s+[\w./-]+$/,
  /^git\s+merge\s+[\w./-]+$/,
  /^git\s+--version$/,
  // version checks
  /^(node|npm|npx|pnpm|yarn|bun|tsc|git)\s+--?v(ersion)?$/,
];

async function runCommand(command: string): Promise<string> {
  console.log(paint(c.yellow, `  🖥️  run_command`) + paint(c.dim, ` ${command}`));
  const trimmed = command.trim();

  if (DENYLIST.some((re) => re.test(trimmed)))
    return `Refused: "${command}" matches a destructive/unsafe pattern.`;
  if (!ALLOWLIST.some((re) => re.test(trimmed)))
    return `Refused: "${command}" is not on the safe-command allowlist.`;

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 15000 });
    return stderr ? `stdout:\n${stdout}\nstderr:\n${stderr}` : stdout || "(no output)";
  } catch (err) {
    return `Command failed: ${(err as Error).message}`;
  }
}

// ─── Tool declarations (Gemini schema) ───────────────────────────────────────

const declarations: FunctionDeclaration[] = [
  {
    name: "read_file",
    description: "Read the full contents of a file.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: { path: { type: SchemaType.STRING, description: "File path to read." } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with the given content. Creates parent directories if needed.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path:    { type: SchemaType.STRING, description: "Destination file path." },
        content: { type: SchemaType.STRING, description: "Full file content to write." },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Surgically replace an exact string in a file. Fails if old_str is not found.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path:    { type: SchemaType.STRING },
        old_str: { type: SchemaType.STRING, description: "Exact text to find and replace." },
        new_str: { type: SchemaType.STRING, description: "Replacement text." },
      },
      required: ["path", "old_str", "new_str"],
    },
  },
  {
    name: "list_directory",
    description: "List files and directories at a given path.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path:      { type: SchemaType.STRING },
        recursive: { type: SchemaType.BOOLEAN, description: "List recursively? Default false." },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Grep for a pattern across TS/JS/JSON files in a directory.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        pattern:   { type: SchemaType.STRING, description: "Search string or regex." },
        directory: { type: SchemaType.STRING, description: "Directory to search. Default '.'." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description:
      "Run a safe, allowlisted shell command. Allowed: ls/cat/find, node/npm/npx/pnpm/yarn/bun, " +
      "tsc/tsx/vite/esbuild, jest/vitest, eslint/prettier, git (status/log/diff/add/commit/push/pull/clone/merge/checkout -b). " +
      "Destructive commands (rm -rf, reset --hard, force-push, sudo, piping, redirection) are refused.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: { type: SchemaType.STRING },
      },
      required: ["command"],
    },
  },
];

const tools: Record<string, (args: any) => Promise<string> | string> = {
  read_file:      (a) => readFile(a.path),
  write_file:     (a) => writeFile(a.path, a.content),
  edit_file:      (a) => editFile(a.path, a.old_str, a.new_str),
  list_directory: (a) => listDirectory(a.path, a.recursive ?? false),
  search_files:   (a) => searchFiles(a.pattern, a.directory ?? "."),
  run_command:    (a) => runCommand(a.command),
};

// ─── Model ────────────────────────────────────────────────────────────────────

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error("Missing GEMINI_API_KEY in .env"); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `You are VibeCode, an expert AI coding assistant running in the terminal.
You have access to the user's file system and can read, write, and edit code files directly.
You can also run safe dev commands (npm, tsc, git, etc).

Workflow:
1. Understand what the user wants.
2. Use list_directory / read_file / search_files to explore context before making changes.
3. Use write_file to create new files, edit_file for targeted changes to existing ones.
4. Run commands to verify (tsc --noEmit, npm test, git status, etc).
5. Report what you did clearly and concisely.

Be decisive. Don't ask for confirmation unless the change is ambiguous — just do it.`,
  tools: [{ functionDeclarations: declarations }],
  generationConfig: { temperature: 0.2 },
});

// ─── Banner ───────────────────────────────────────────────────────────────────

function banner() {
  console.log();
  console.log(paint(c.cyan + c.bold, "  ╔══════════════════════════════╗"));
  console.log(paint(c.cyan + c.bold, "  ║") + paint(c.white + c.bold, "     ⚡ VibeCode Agent          ") + paint(c.cyan + c.bold, "║"));
  console.log(paint(c.cyan + c.bold, "  ║") + paint(c.dim,            "   Gemini 2.5 Flash · TS CLI  ") + paint(c.cyan + c.bold, " ║"));
  console.log(paint(c.cyan + c.bold, "  ╚══════════════════════════════╝"));
  console.log(paint(c.dim, "  Type your coding task. Ctrl+C to exit.\n"));
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  banner();
  const chat = model.startChat();
  const rl = readline.createInterface({ input, output });

  while (true) {
    const userQuery = await rl.question(paint(c.green + c.bold, "you ❯ ") + c.reset);
    if (!userQuery.trim()) continue;

    const stop = spinner("thinking…");

    try {
      let result = await chat.sendMessage(userQuery);
      stop();

      while (true) {
        const calls = result.response.functionCalls();
        if (!calls || calls.length === 0) break;

        console.log(); // breathing room before tool logs

        const responses = await Promise.all(
          calls.map(async (call) => {
            const impl = tools[call.name];
            const toolOutput = impl ? await impl(call.args) : `Unknown tool: ${call.name}`;
            return { functionResponse: { name: call.name, response: { output: toolOutput } } };
          })
        );

        const spin2 = spinner("processing…");
        result = await chat.sendMessage(responses);
        spin2();
      }

      console.log();
      console.log(paint(c.magenta + c.bold, "vibe ❯ ") + result.response.text());
      console.log();

    } catch (err) {
      stop();
      console.error(paint(c.red, `\n⚠️  ${(err as Error).message}\n`));
    }
  }
}

main();
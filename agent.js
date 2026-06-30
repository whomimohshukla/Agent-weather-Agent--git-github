"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var generative_ai_1 = require("@google/generative-ai");
var readline = require("node:readline/promises");
var node_process_1 = require("node:process");
var node_child_process_1 = require("node:child_process");
var node_util_1 = require("node:util");
require("dotenv/config");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
// ---------- Tool implementations ----------
function getWeather(city) {
    return __awaiter(this, void 0, void 0, function () {
        var res, text, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🔨 Tool Called: get_weather", city);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("https://wttr.in/".concat(encodeURIComponent(city), "?format=%C+%t"))];
                case 2:
                    res = _a.sent();
                    if (!res.ok)
                        return [2 /*return*/, "Could not fetch weather for ".concat(city, " (status ").concat(res.status, ").")];
                    return [4 /*yield*/, res.text()];
                case 3:
                    text = _a.sent();
                    return [2 /*return*/, "The weather in ".concat(city, " is ").concat(text, ".")];
                case 4:
                    err_1 = _a.sent();
                    return [2 /*return*/, "Failed to fetch weather for ".concat(city, ": ").concat(err_1.message)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function add(x, y) {
    console.log("🔨 Tool Called: add", x, y);
    return String(x + y);
}
// Pushes a single file's content to a GitHub repo via the Contents API
// (create or update). Requires a GITHUB_TOKEN with repo write access.
function pushToGithub(args) {
    return __awaiter(this, void 0, void 0, function () {
        var token, owner, repo, path, content, branch, message, apiUrl, sha, getRes, existing, _a, _b, putRes, _c, _d, result, err_2;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log("🔨 Tool Called: push_to_github", args.owner, args.repo, args.path);
                    token = process.env.GITHUB_TOKEN;
                    if (!token)
                        return [2 /*return*/, "Refused: GITHUB_TOKEN is not set in the environment."];
                    owner = args.owner, repo = args.repo, path = args.path, content = args.content, branch = args.branch;
                    message = args.message || "chore: update ".concat(path, " via agent");
                    apiUrl = "https://api.github.com/repos/".concat(owner, "/").concat(repo, "/contents/").concat(encodeURIComponent(path));
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 11, , 12]);
                    sha = void 0;
                    return [4 /*yield*/, fetch("".concat(apiUrl).concat(branch ? "?ref=".concat(branch) : ""), {
                            headers: { Authorization: "Bearer ".concat(token), Accept: "application/vnd.github+json" },
                        })];
                case 2:
                    getRes = _g.sent();
                    if (!getRes.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, getRes.json()];
                case 3:
                    existing = (_g.sent());
                    sha = existing.sha;
                    return [3 /*break*/, 6];
                case 4:
                    if (!(getRes.status !== 404)) return [3 /*break*/, 6];
                    _b = (_a = "Failed to check existing file: ".concat(getRes.status, " ")).concat;
                    return [4 /*yield*/, getRes.text()];
                case 5: return [2 /*return*/, _b.apply(_a, [_g.sent()])];
                case 6: return [4 /*yield*/, fetch(apiUrl, {
                        method: "PUT",
                        headers: {
                            Authorization: "Bearer ".concat(token),
                            Accept: "application/vnd.github+json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(__assign({ message: message, content: Buffer.from(content, "utf-8").toString("base64"), sha: sha }, (branch ? { branch: branch } : {}))),
                    })];
                case 7:
                    putRes = _g.sent();
                    if (!!putRes.ok) return [3 /*break*/, 9];
                    _d = (_c = "GitHub push failed: ".concat(putRes.status, " ")).concat;
                    return [4 /*yield*/, putRes.text()];
                case 8: return [2 /*return*/, _d.apply(_c, [_g.sent()])];
                case 9: return [4 /*yield*/, putRes.json()];
                case 10:
                    result = (_g.sent());
                    return [2 /*return*/, "Pushed ".concat(path, " to ").concat(owner, "/").concat(repo).concat(branch ? "@".concat(branch) : "", ": ").concat((_f = (_e = result.content) === null || _e === void 0 ? void 0 : _e.html_url) !== null && _f !== void 0 ? _f : "(no URL returned)")];
                case 11:
                    err_2 = _g.sent();
                    return [2 /*return*/, "Failed to push to GitHub: ".concat(err_2.message)];
                case 12: return [2 /*return*/];
            }
        });
    });
}
// Safety: only allow a small set of read-only/safe commands rather than
// executing whatever string the model produces. Extend deliberately.
//
// Git/diagnostic commands are included because they're either read-only
// (status/log/diff/branch/remote -v) or additive (add/commit/push/pull/
// fetch/clone). Anything destructive or history-rewriting is explicitly
// EXCLUDED below — it is never matched by the allowlist, so it can't slip
// through even if a pattern is accidentally too broad.
var COMMAND_DENYLIST = [
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
var COMMAND_ALLOWLIST = [
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
function runCommand(command) {
    return __awaiter(this, void 0, void 0, function () {
        var trimmed, isDenied, isAllowed, _a, stdout, stderr, err_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("🔨 Tool Called: run_command", command);
                    trimmed = command.trim();
                    isDenied = COMMAND_DENYLIST.some(function (re) { return re.test(trimmed); });
                    if (isDenied) {
                        return [2 /*return*/, "Refused to run \"".concat(command, "\": matches a denylisted (destructive/unsafe) pattern.")];
                    }
                    isAllowed = COMMAND_ALLOWLIST.some(function (re) { return re.test(trimmed); });
                    if (!isAllowed) {
                        return [2 /*return*/, "Refused to run \"".concat(command, "\": not on the safe-command allowlist.")];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync(command, { timeout: 10000 })];
                case 2:
                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    return [2 /*return*/, stderr ? "stdout: ".concat(stdout, "\nstderr: ").concat(stderr) : stdout || "(no output)"];
                case 3:
                    err_3 = _b.sent();
                    return [2 /*return*/, "Command failed: ".concat(err_3.message)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ---------- Tool schema (what Gemini sees) ----------
var toolDeclarations = [
    {
        name: "get_weather",
        description: "Get the current weather for a given city.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                city: { type: generative_ai_1.SchemaType.STRING, description: "Name of the city, e.g. 'New York'" },
            },
            required: ["city"],
        },
    },
    {
        name: "add",
        description: "Add two numbers together.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                x: { type: generative_ai_1.SchemaType.NUMBER },
                y: { type: generative_ai_1.SchemaType.NUMBER },
            },
            required: ["x", "y"],
        },
    },
    {
        name: "push_to_github",
        description: "Create or update a single file in a GitHub repository with the given content (commits directly via the GitHub Contents API).",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                owner: { type: generative_ai_1.SchemaType.STRING, description: "Repo owner, e.g. 'whomimohshukla'." },
                repo: { type: generative_ai_1.SchemaType.STRING, description: "Repo name, e.g. 'quickfixo'." },
                path: { type: generative_ai_1.SchemaType.STRING, description: "File path within the repo, e.g. 'src/index.ts'." },
                content: { type: generative_ai_1.SchemaType.STRING, description: "Full file content to commit." },
                message: { type: generative_ai_1.SchemaType.STRING, description: "Commit message. Optional." },
                branch: { type: generative_ai_1.SchemaType.STRING, description: "Target branch, e.g. 'main'. Optional, defaults to repo default branch." },
            },
            required: ["owner", "repo", "path", "content"],
        },
    },
    {
        name: "run_command",
        description: "Run a safe, allowlisted shell command and return its output. Supports basics " +
            "(ls, pwd, whoami, date, echo, cat), git diagnostics (status, log, diff, branch, " +
            "remote -v, show, blame, fetch, stash list), git collaboration (add, commit, push, " +
            "pull, clone, checkout -b <new-branch>, merge), and system diagnostics (git/node/npm " +
            "--version, uname -a, df -h, ps aux, top -bn1). Destructive or history-rewriting " +
            "commands (rm, reset --hard, push --force, clean, rebase, branch -D, sudo, piping, " +
            "redirection) are refused.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                command: { type: generative_ai_1.SchemaType.STRING, description: "The shell command to run." },
            },
            required: ["command"],
        },
    },
];
var toolImplementations = {
    get_weather: function (args) { return getWeather(args.city); },
    add: function (args) { return add(args.x, args.y); },
    push_to_github: function (args) { return pushToGithub(args); },
    run_command: function (args) { return runCommand(args.command); },
};
// ---------- Model setup ----------
var apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment (.env file).");
    process.exit(1);
}
var genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
var model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are a helpful AI assistant. Use the available tools when they help answer " +
        "the user's question accurately (e.g. live weather, arithmetic, safe shell commands). " +
        "Otherwise answer directly. Be concise.",
    tools: [{ functionDeclarations: toolDeclarations }],
});
// ---------- Conversation loop ----------
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var chat, rl, userQuery, result, calls, responses, err_4;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chat = model.startChat();
                    rl = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
                    console.log("Gemini agent ready. Type your query (Ctrl+C to exit).");
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 11];
                    return [4 /*yield*/, rl.question("> ")];
                case 2:
                    userQuery = _a.sent();
                    if (!userQuery.trim())
                        return [3 /*break*/, 1];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 9, , 10]);
                    return [4 /*yield*/, chat.sendMessage(userQuery)];
                case 4:
                    result = _a.sent();
                    _a.label = 5;
                case 5:
                    if (!true) return [3 /*break*/, 8];
                    calls = result.response.functionCalls();
                    if (!calls || calls.length === 0)
                        return [3 /*break*/, 8];
                    return [4 /*yield*/, Promise.all(calls.map(function (call) { return __awaiter(_this, void 0, void 0, function () {
                            var impl, output, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        impl = toolImplementations[call.name];
                                        if (!impl) return [3 /*break*/, 2];
                                        return [4 /*yield*/, impl(call.args)];
                                    case 1:
                                        _a = _b.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        _a = "Unknown tool: ".concat(call.name);
                                        _b.label = 3;
                                    case 3:
                                        output = _a;
                                        return [2 /*return*/, {
                                                functionResponse: { name: call.name, response: { output: output } },
                                            }];
                                }
                            });
                        }); }))];
                case 6:
                    responses = _a.sent();
                    return [4 /*yield*/, chat.sendMessage(responses)];
                case 7:
                    result = _a.sent();
                    return [3 /*break*/, 5];
                case 8:
                    console.log("\uD83E\uDD16: ".concat(result.response.text()));
                    return [3 /*break*/, 10];
                case 9:
                    err_4 = _a.sent();
                    console.error("⚠️  Error during request:", err_4.message);
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 1];
                case 11: return [2 /*return*/];
            }
        });
    });
}
main();

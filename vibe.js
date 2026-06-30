"use strict";
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
var fs = require("node:fs/promises");
var path = require("node:path");
require("dotenv/config");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
// ─── ANSI colours (zero deps) ────────────────────────────────────────────────
var c = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
    white: "\x1b[97m",
};
var paint = function (color, text) { return "".concat(color).concat(text).concat(c.reset); };
// ─── Spinner ──────────────────────────────────────────────────────────────────
function spinner(label) {
    var frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    var i = 0;
    var id = setInterval(function () {
        process.stdout.write("\r".concat(paint(c.cyan, frames[i++ % frames.length]), " ").concat(paint(c.dim, label), "   "));
    }, 80);
    return function () { clearInterval(id); process.stdout.write("\r\x1b[K"); };
}
// ─── Tool implementations ─────────────────────────────────────────────────────
function readFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(paint(c.yellow, "  \uD83D\uDCC4 read_file") + paint(c.dim, " ".concat(filePath)));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs.readFile(filePath, "utf-8")];
                case 2:
                    content = _a.sent();
                    return [2 /*return*/, content];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, "Error reading file: ".concat(err_1.message)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function writeFile(filePath, content) {
    return __awaiter(this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(paint(c.green, "  \u270F\uFE0F  write_file") + paint(c.dim, " ".concat(filePath)));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fs.mkdir(path.dirname(filePath), { recursive: true })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(filePath, content, "utf-8")];
                case 3:
                    _a.sent();
                    return [2 /*return*/, "Written ".concat(filePath, " (").concat(content.length, " chars)")];
                case 4:
                    err_2 = _a.sent();
                    return [2 /*return*/, "Error writing file: ".concat(err_2.message)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function editFile(filePath, oldStr, newStr) {
    return __awaiter(this, void 0, void 0, function () {
        var original, updated, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(paint(c.magenta, "  \uD83D\uDD27 edit_file") + paint(c.dim, " ".concat(filePath)));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fs.readFile(filePath, "utf-8")];
                case 2:
                    original = _a.sent();
                    if (!original.includes(oldStr))
                        return [2 /*return*/, "edit_file: old_str not found in ".concat(filePath)];
                    updated = original.replace(oldStr, newStr);
                    return [4 /*yield*/, fs.writeFile(filePath, updated, "utf-8")];
                case 3:
                    _a.sent();
                    return [2 /*return*/, "Edited ".concat(filePath, " successfully.")];
                case 4:
                    err_3 = _a.sent();
                    return [2 /*return*/, "Error editing file: ".concat(err_3.message)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function listDirectory(dirPath_1) {
    return __awaiter(this, arguments, void 0, function (dirPath, recursive) {
        var flag, stdout, err_4;
        if (recursive === void 0) { recursive = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(paint(c.blue, "  \uD83D\uDCC1 list_directory") + paint(c.dim, " ".concat(dirPath)));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    flag = recursive ? "-R" : "";
                    return [4 /*yield*/, execAsync("ls ".concat(flag, " ").concat(dirPath), { timeout: 5000 })];
                case 2:
                    stdout = (_a.sent()).stdout;
                    return [2 /*return*/, stdout || "(empty)"];
                case 3:
                    err_4 = _a.sent();
                    return [2 /*return*/, "Error listing directory: ".concat(err_4.message)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function searchFiles(pattern_1) {
    return __awaiter(this, arguments, void 0, function (pattern, directory) {
        var stdout, err_5;
        if (directory === void 0) { directory = "."; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(paint(c.cyan, "  \uD83D\uDD0D search_files") + paint(c.dim, " \"".concat(pattern, "\" in ").concat(directory)));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync("grep -r --include=\"*.ts\" --include=\"*.js\" --include=\"*.tsx\" --include=\"*.json\" -n \"".concat(pattern, "\" ").concat(directory, " 2>/dev/null || true"), { timeout: 8000 })];
                case 2:
                    stdout = (_a.sent()).stdout;
                    return [2 /*return*/, stdout.trim() || "No matches found."];
                case 3:
                    err_5 = _a.sent();
                    return [2 /*return*/, "Search error: ".concat(err_5.message)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ─── run_command: denylist first, then allowlist ──────────────────────────────
var DENYLIST = [
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
    />/, // no redirection
];
var ALLOWLIST = [
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
function runCommand(command) {
    return __awaiter(this, void 0, void 0, function () {
        var trimmed, _a, stdout, stderr, err_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log(paint(c.yellow, "  \uD83D\uDDA5\uFE0F  run_command") + paint(c.dim, " ".concat(command)));
                    trimmed = command.trim();
                    if (DENYLIST.some(function (re) { return re.test(trimmed); }))
                        return [2 /*return*/, "Refused: \"".concat(command, "\" matches a destructive/unsafe pattern.")];
                    if (!ALLOWLIST.some(function (re) { return re.test(trimmed); }))
                        return [2 /*return*/, "Refused: \"".concat(command, "\" is not on the safe-command allowlist.")];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execAsync(command, { timeout: 15000 })];
                case 2:
                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    return [2 /*return*/, stderr ? "stdout:\n".concat(stdout, "\nstderr:\n").concat(stderr) : stdout || "(no output)"];
                case 3:
                    err_6 = _b.sent();
                    return [2 /*return*/, "Command failed: ".concat(err_6.message)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ─── Tool declarations (Gemini schema) ───────────────────────────────────────
var declarations = [
    {
        name: "read_file",
        description: "Read the full contents of a file.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: { path: { type: generative_ai_1.SchemaType.STRING, description: "File path to read." } },
            required: ["path"],
        },
    },
    {
        name: "write_file",
        description: "Create or overwrite a file with the given content. Creates parent directories if needed.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                path: { type: generative_ai_1.SchemaType.STRING, description: "Destination file path." },
                content: { type: generative_ai_1.SchemaType.STRING, description: "Full file content to write." },
            },
            required: ["path", "content"],
        },
    },
    {
        name: "edit_file",
        description: "Surgically replace an exact string in a file. Fails if old_str is not found.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                path: { type: generative_ai_1.SchemaType.STRING },
                old_str: { type: generative_ai_1.SchemaType.STRING, description: "Exact text to find and replace." },
                new_str: { type: generative_ai_1.SchemaType.STRING, description: "Replacement text." },
            },
            required: ["path", "old_str", "new_str"],
        },
    },
    {
        name: "list_directory",
        description: "List files and directories at a given path.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                path: { type: generative_ai_1.SchemaType.STRING },
                recursive: { type: generative_ai_1.SchemaType.BOOLEAN, description: "List recursively? Default false." },
            },
            required: ["path"],
        },
    },
    {
        name: "search_files",
        description: "Grep for a pattern across TS/JS/JSON files in a directory.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                pattern: { type: generative_ai_1.SchemaType.STRING, description: "Search string or regex." },
                directory: { type: generative_ai_1.SchemaType.STRING, description: "Directory to search. Default '.'." },
            },
            required: ["pattern"],
        },
    },
    {
        name: "run_command",
        description: "Run a safe, allowlisted shell command. Allowed: ls/cat/find, node/npm/npx/pnpm/yarn/bun, " +
            "tsc/tsx/vite/esbuild, jest/vitest, eslint/prettier, git (status/log/diff/add/commit/push/pull/clone/merge/checkout -b). " +
            "Destructive commands (rm -rf, reset --hard, force-push, sudo, piping, redirection) are refused.",
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                command: { type: generative_ai_1.SchemaType.STRING },
            },
            required: ["command"],
        },
    },
];
var tools = {
    read_file: function (a) { return readFile(a.path); },
    write_file: function (a) { return writeFile(a.path, a.content); },
    edit_file: function (a) { return editFile(a.path, a.old_str, a.new_str); },
    list_directory: function (a) { var _a; return listDirectory(a.path, (_a = a.recursive) !== null && _a !== void 0 ? _a : false); },
    search_files: function (a) { var _a; return searchFiles(a.pattern, (_a = a.directory) !== null && _a !== void 0 ? _a : "."); },
    run_command: function (a) { return runCommand(a.command); },
};
// ─── Model ────────────────────────────────────────────────────────────────────
var apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env");
    process.exit(1);
}
var genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
var model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are VibeCode, an expert AI coding assistant running in the terminal.\nYou have access to the user's file system and can read, write, and edit code files directly.\nYou can also run safe dev commands (npm, tsc, git, etc).\n\nWorkflow:\n1. Understand what the user wants.\n2. Use list_directory / read_file / search_files to explore context before making changes.\n3. Use write_file to create new files, edit_file for targeted changes to existing ones.\n4. Run commands to verify (tsc --noEmit, npm test, git status, etc).\n5. Report what you did clearly and concisely.\n\nBe decisive. Don't ask for confirmation unless the change is ambiguous \u2014 just do it.",
    tools: [{ functionDeclarations: declarations }],
    generationConfig: { temperature: 0.2 },
});
// ─── Banner ───────────────────────────────────────────────────────────────────
function banner() {
    console.log();
    console.log(paint(c.cyan + c.bold, "  ╔══════════════════════════════╗"));
    console.log(paint(c.cyan + c.bold, "  ║") + paint(c.white + c.bold, "     ⚡ VibeCode Agent          ") + paint(c.cyan + c.bold, "║"));
    console.log(paint(c.cyan + c.bold, "  ║") + paint(c.dim, "   Gemini 2.5 Flash · TS CLI  ") + paint(c.cyan + c.bold, " ║"));
    console.log(paint(c.cyan + c.bold, "  ╚══════════════════════════════╝"));
    console.log(paint(c.dim, "  Type your coding task. Ctrl+C to exit.\n"));
}
// ─── Main loop ────────────────────────────────────────────────────────────────
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var chat, rl, userQuery, stop_1, result, calls, responses, spin2, err_7;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    banner();
                    chat = model.startChat();
                    rl = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 11];
                    return [4 /*yield*/, rl.question(paint(c.green + c.bold, "you ❯ ") + c.reset)];
                case 2:
                    userQuery = _a.sent();
                    if (!userQuery.trim())
                        return [3 /*break*/, 1];
                    stop_1 = spinner("thinking…");
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 9, , 10]);
                    return [4 /*yield*/, chat.sendMessage(userQuery)];
                case 4:
                    result = _a.sent();
                    stop_1();
                    _a.label = 5;
                case 5:
                    if (!true) return [3 /*break*/, 8];
                    calls = result.response.functionCalls();
                    if (!calls || calls.length === 0)
                        return [3 /*break*/, 8];
                    console.log(); // breathing room before tool logs
                    return [4 /*yield*/, Promise.all(calls.map(function (call) { return __awaiter(_this, void 0, void 0, function () {
                            var impl, toolOutput, _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        impl = tools[call.name];
                                        if (!impl) return [3 /*break*/, 2];
                                        return [4 /*yield*/, impl(call.args)];
                                    case 1:
                                        _a = _b.sent();
                                        return [3 /*break*/, 3];
                                    case 2:
                                        _a = "Unknown tool: ".concat(call.name);
                                        _b.label = 3;
                                    case 3:
                                        toolOutput = _a;
                                        return [2 /*return*/, { functionResponse: { name: call.name, response: { output: toolOutput } } }];
                                }
                            });
                        }); }))];
                case 6:
                    responses = _a.sent();
                    spin2 = spinner("processing…");
                    return [4 /*yield*/, chat.sendMessage(responses)];
                case 7:
                    result = _a.sent();
                    spin2();
                    return [3 /*break*/, 5];
                case 8:
                    console.log();
                    console.log(paint(c.magenta + c.bold, "vibe ❯ ") + result.response.text());
                    console.log();
                    return [3 /*break*/, 10];
                case 9:
                    err_7 = _a.sent();
                    stop_1();
                    console.error(paint(c.red, "\n\u26A0\uFE0F  ".concat(err_7.message, "\n")));
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 1];
                case 11: return [2 /*return*/];
            }
        });
    });
}
main();

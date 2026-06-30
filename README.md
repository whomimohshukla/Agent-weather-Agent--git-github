# Gemini Tool-Calling Agent

A small TypeScript CLI agent powered by Google Gemini's native function calling. Ask it things in plain English and it decides whether to answer directly or call a tool — live weather lookups, arithmetic, or safe shell/git commands.

## Features

- **Native function calling** — uses Gemini's structured tool-calling API instead of hand-rolled JSON parsing, so tool inputs are schema-validated by the model itself.
- **Live weather** via [wttr.in](https://wttr.in).
- **Safe command execution** — `run_command` only executes allowlisted shell and git commands. Destructive or history-rewriting commands (`rm`, `git reset --hard`, `git push --force`, `git clean`, `git rebase`, `sudo`, piping, redirection) are explicitly denylisted and refused.
- **Git workflow support** — status, log, diff, branch, remote -v, show, blame, fetch, stash list, add, commit, push, pull, clone, checkout -b, merge.
- **System diagnostics** — `git/node/npm --version`, `uname -a`, `df -h`, `ps aux`, `top -bn1`.

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_key_here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

## Usage

```bash
npm start
```

Then just type queries at the `>` prompt:

```
> what's the weather in Cardiff?
> what is 42 + 17?
> show me git status
> commit my changes with message "fix login bug" and push
```

Press `Ctrl+C` to exit.

## How it works

1. Your message is sent to Gemini along with the tool schema (`get_weather`, `add`, `run_command`).
2. If Gemini decides a tool is needed, it returns a function call request instead of text.
3. The agent runs the corresponding local function and sends the result back to Gemini.
4. This repeats until Gemini has what it needs, then it replies with a final text answer.

## Allowed commands

| Category | Commands |
|---|---|
| Basics | `ls`, `pwd`, `whoami`, `date`, `echo`, `cat <file>` |
| Git (read-only) | `git status`, `log`, `diff`, `branch`, `remote -v`, `show`, `blame`, `fetch`, `stash list` |
| Git (collaborative) | `git add`, `commit`, `push [origin <branch>]`, `pull [origin <branch>]`, `clone <url>`, `checkout -b <new-branch>`, `merge <branch>` |
| Diagnostics | `git/node/npm --version`, `uname -a`, `df -h`, `ps aux`, `top -bn1` |

Anything not on this list — or matching the denylist (deletions, force pushes, history rewrites, `sudo`, chaining, redirection) — is refused with an explanation instead of being executed.

## Tech stack

- TypeScript, run via [tsx](https://github.com/privatenumber/tsx)
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) (Gemini 2.0 Flash)
- Node's built-in `readline/promises` and `child_process`

## License

MIT
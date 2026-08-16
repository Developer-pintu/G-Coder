<div align="center">

```text
  ____        ____ ___  ____  _____ ____  
 / ___|      / ___/ _ \|  _ \| ____|  _ \ 
| |  _ _____| |  | | | | | | |  _| | |_) |
| |_| |_____| |__| |_| | |_| | |___|  _ < 
 \____|      \____\___/|____/|_____|_| \_\
```
**Enterprise-Grade Autonomous AI Coding Agent**

</div>

<br />

Welcome to **g-coder**, the ultimate universal, multi-provider AI coding assistant designed to live right inside your terminal. Built with an architecture focused on safety, speed, and massive autonomous capabilities.

---

## 🚀 Features at a Glance

G-coder is not just a chat tool; it's a complete software engineering lifecycle agent.

- **🤖 Zero-Knowledge Project Generator:** Run `g-coder create <prompt>` to generate an entire application (frontend, backend, database) from scratch, complete with automated dependency installation.
- **⚡ Precise Diff-Patching (Smart Token Optimizer):** Replaces full-file overwrites with lightweight `<<SEARCH>>` and `<<REPLACE>>` diff blocks to massively reduce token usage and bypass API limits seamlessly.
- **⏱️ API Request Throttling & Backoff:** Implements strict request delays (2.5s) and dynamic exponential backoffs (5s, 10s, 15s) to guarantee high-performance execution without triggering `429 Too Many Requests` or `503 Server Overload` limits.
- **📸 Visual Preview Engine:** Automatically launch a headless browser (Puppeteer) and local static server to take high-res screenshots of your generated UI with `g-coder preview`.
- **📦 Atomic Batch Editor:** Safely edit multiple inter-dependent files at once with `g-coder batch`. All changes are atomic—if one fails, the whole transaction rolls back safely.
- **🛡️ GitGuard & Self-Healing:** The agent creates invisible soft-commits before touching your code. If the code breaks, the `SelfHealer` automatically catches build errors, asks the LLM to fix them (up to 3 times), and rolls back perfectly if it fails.
- **🌐 AI Git Operations:** Run `g-coder git push` to let the AI analyze your code changes and automatically write a professional `Conventional Commit` message. Or use `g-coder git publish` to automatically bootstrap a new GitHub repository from your terminal.
- **🕵️ Model Scout:** An intelligent background engine that constantly pings global registries to notify you the moment a new AI model drops.
- **🔑 Secure Key Rotator:** Your keys are kept completely safe in a hidden global folder (`~/.g-coder/.env`), completely avoiding accidental git leaks.
- **🙈 Masked Credential Input:** API keys entered through the configuration wizard are masked in an interactive cross-platform password prompt and stored with restrictive file permissions.
- **🪄 Prompt Enhancement:** Coding requests, including common Hinglish phrases, are normalized into structured, repository-aware engineering instructions before execution.
- **💾 Stateful Resume:** Long-running tasks persist completed actions and touched files in `.g-coder-state.json`, allowing provider failover to continue without repeating finished work.
- **🧠 Dynamic Model Registry:** OpenAI, Groq, and OpenRouter catalogs are refreshed at runtime, ranked for heavyweight coding, cached securely, and backed by offline-safe defaults.
- **⬆️ Verified Self-Updates:** `g-coder update` verifies npm package identity and semantic versions before performing a shell-free global update.
- **🛡️ Deterministic Deep Audit:** The entire workspace is checked for exposed secrets, unmasked input, unsafe commands, network timeouts, rejection gaps, and incomplete provider routing; `--fix` rolls back edits unless the build passes.

---

## 🚀 Branding
**Developed by Developer Pintu**

G-coder is engineered to bring enterprise-level AI autonomy directly to your command line. Built with passion and designed to support any major AI provider natively. While the source code is provided openly for the community to learn and contribute, the specific implementation logic, branding of "g-coder", and architecture remain the intellectual property of **Developer Pintu**.

---

## 🛠️ Installation

G-coder is designed to be installed globally on your system.

```bash
# Clone the repository
git clone https://github.com/Developer-pintu/G-Coder.git

# Navigate into the project
cd G-Coder

# Install dependencies and build the TypeScript source
npm install
npm run build

# Install globally on your machine
npm install -g .
```

---

## 🔑 Secure Configuration Wizard

G-coder supports **Google Gemini**, **OpenAI**, **Anthropic Claude**, **Groq**, **OpenRouter**, and **DeepSeek**.
To prevent accidental GitHub leaks, **do not manually create `.env` files in your projects.**

Run the built-in Secure Configuration Wizard anywhere in your terminal:

```bash
g-coder config
```

To securely set or replace keys for a single provider:

```bash
g-coder config --set openai
```

### Model selection and custom providers

Model selection is automatic for providers that expose model catalogs. Pin a model when reproducibility is more important than automatic discovery:

```bash
OPENAI_MODEL=gpt-4.1 g-coder run "Refactor the API layer" -p openai
GROQ_MODEL=llama-3.3-70b-versatile g-coder ask "Explain this stack trace" -p groq
```

Generic OpenAI-compatible providers use `<PROVIDER>_API_KEYS`, `<PROVIDER>_MODEL`, and `<PROVIDER>_BASE_URL`. HTTPS is required unless `G_CODER_ALLOW_INSECURE_HTTP=true` is explicitly set for local development.

### Updating and auditing

```bash
g-coder update --check   # Check the trusted npm release without installing
g-coder update           # Safely install the verified latest global release
g-coder audit            # Offline deterministic whole-workspace diagnostics
g-coder audit --fix      # Generate guarded patches and keep them only if build passes
```

- This wizard will prompt you interactively for your API keys.
- The keys are securely written to a hidden global directory on your machine (`~/.g-coder/.env`).
- Interactive credentials are masked and are never printed by g-coder.
- G-coder automatically bootstraps these keys from your home directory no matter which project folder you are working in!

---

## 💻 Usage & Commands

Run `g-coder --help` to see all available commands.

### 🏗️ Project Generation
Generate complete projects from a single sentence.
```bash
g-coder create "A real-time chat application using Express and simple HTML"
```

### 📸 Visual Previews
Take a headless screenshot of a local folder or remote URL.
```bash
g-coder preview ./my-app
```

### ⚡ Atomic Batch Editing
Edit multiple files simultaneously with strict Git rollback protection.
```bash
g-coder batch "Rename user variables to account variables" --files src/db.ts src/auth.ts
```

### 🌐 Smart Git Ops
Automate your GitHub workflow using AI.
```bash
g-coder git publish   # Autonomously creates a GitHub repo, writes a description, and pushes!
g-coder git push      # Analyzes your code diff and writes a commit message automatically.
g-coder git cleanup   # Safely sweeps away old branches.
```

### 🤖 Core Agent Commands
```bash
g-coder chat          # Start a continuous context-aware REPL session
g-coder run [prompt]  # Run a single autonomous instruction
g-coder ask [prompt]  # Ask a question without giving it file-editing powers
g-coder audit         # Run an advanced static code analysis
g-coder clear / cls   # High-performance clear screen (flushes terminal and scrollback buffer)
```

---

## ⚖️ Legal & Licensing

**MIT License**
Copyright (c) 2026 Developer Pintu. All rights reserved.

The source code is licensed under the MIT License (see [LICENSE](LICENSE) for details). However, please note that while the code is open-source, the commercial branding, specific feature implementations, and identity of "g-coder" remain the sole property of **Developer Pintu**.

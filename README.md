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
- **📸 Visual Preview Engine:** Automatically launch a headless browser (Puppeteer) and local static server to take high-res screenshots of your generated UI with `g-coder preview`.
- **📦 Atomic Batch Editor:** Safely edit multiple inter-dependent files at once with `g-coder batch`. All changes are atomic—if one fails, the whole transaction rolls back safely.
- **🛡️ GitGuard & Self-Healing:** The agent creates invisible soft-commits before touching your code. If the code breaks, the `SelfHealer` automatically catches build errors, asks the LLM to fix them (up to 3 times), and rolls back perfectly if it fails.
- **🌐 AI Git Operations:** Run `g-coder git push` to let the AI analyze your code changes and automatically write a professional `Conventional Commit` message. Or use `g-coder git publish` to automatically bootstrap a new GitHub repository from your terminal.
- **🕵️ Model Scout:** An intelligent background engine that constantly pings global registries to notify you the moment a new AI model drops.
- **🔑 Secure Key Rotator:** Your keys are kept completely safe in a hidden global folder (`~/.g-coder/.env`), completely avoiding accidental git leaks.

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

- This wizard will prompt you interactively for your API keys.
- The keys are securely written to a hidden global directory on your machine (`~/.g-coder/.env`).
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
```

---

## ⚖️ Legal & Licensing

**MIT License**
Copyright (c) 2026 Developer Pintu. All rights reserved.

The source code is licensed under the MIT License (see [LICENSE](LICENSE) for details). However, please note that while the code is open-source, the commercial branding, specific feature implementations, and identity of "g-coder" remain the sole property of **Developer Pintu**.

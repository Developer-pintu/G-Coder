<div align="center">

```text
   ____                 _           
  / ___|      ___ ___  | | ___ _ __ 
 | |  _ _____/ __/ _ \ | |/ _ \ '__|
 | |_| |____| (_| (_) || |  __/ |   
  \____|     \___\___/ |_|\___|_|   
```
**Enterprise-Grade Autonomous AI Coding Agent**

</div>

<br />

Welcome to **g-coder**, the ultimate universal, multi-provider AI coding assistant designed to live right inside your terminal. Built with an architecture focused on security, speed, and autonomous capabilities.

---

## 🚀 Branding
**Developed by Developer Pintu**

G-coder is engineered to bring enterprise-level AI autonomy directly to your command line. Built with passion and designed to support any major AI provider natively. While the source code is provided openly for the community to learn and contribute, the specific implementation logic, branding of "g-coder", and architecture remain the intellectual property of **Developer Pintu**.

---

## 🔒 Safety-First Architecture
Security is at the heart of g-coder. When executing autonomous commands:
- **Global Key Storage:** Your API keys are NEVER stored in your local project's `.env`. They are safely managed globally in your home directory via the Secure Configuration Wizard.
- **Human-in-the-Loop:** Before ANY destructive system action (e.g., deleting a file, moving folders, or executing a shell command), g-coder strictly pauses and demands a manual `"YES"` confirmation. 

---

## 🛠️ Installation

G-coder is designed to be installed globally on your system.

```bash
# Clone the repository
git clone https://github.com/your-username/g-coder.git

# Navigate into the project
cd g-coder

# Install dependencies and build the TypeScript source
npm install
npm run build

# Install globally on your machine
npm install -g .
```

---

## 🔑 Secure Configuration Wizard (Important)

G-coder supports Google Gemini, OpenAI, Anthropic Claude, Groq, OpenRouter, and DeepSeek.
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

### 1. Interactive Chat (Recommended)
Start a continuous, context-aware REPL session with the agent:
```bash
g-coder chat
```

### 2. Run Autonomous Instructions
Give the agent a single, direct task to execute on your system:
```bash
g-coder run "Create a new file called math.ts and implement a calculator class" -p groq
```

### 3. Static Code Auditing
Run a full scan of your current workspace and calculate an Application Readiness Score:
```bash
g-coder audit
```

### 4. Self-Update Documentation
G-coder can autonomously analyze its own codebase and update this very README!
```bash
g-coder update-docs
```

---

## ⚖️ Legal & Licensing

**MIT License**
Copyright (c) 2026 Developer Pintu. All rights reserved.

The source code is licensed under the MIT License (see [LICENSE](LICENSE) for details). However, please note that while the code is open-source, the commercial branding, specific feature implementations, and identity of "g-coder" remain the sole property of **Developer Pintu**.

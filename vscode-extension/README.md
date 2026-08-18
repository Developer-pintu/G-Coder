# 🌌 Welcome to G-Coder Ghost

**G-Coder Ghost** is the official companion extension for the **[G-Coder CLI](https://www.npmjs.com/package/@developer-pintu/g-coder)**.

This extension establishes a real-time, ultra-fast WebSocket IPC (Inter-Process Communication) bridge between your VS Code editor and the autonomous G-Coder AI CLI running in your terminal.

### 🚀 Key Features

- **Live Context Streaming:** Automatically streams your active file, cursor position, and IDE state to the G-Coder AI.
- **Zero-Friction Integration:** No manual copy-pasting of code. The AI knows exactly what you are looking at.
- **Secure Local Server:** Runs entirely on `ws://localhost:8080`, ensuring your IDE data never leaves your machine unless you explicitly prompt the AI.

### 🛠️ Getting Started

1. Install the core CLI engine via NPM:
   ```bash
   npm install -g @developer-pintu/g-coder
   ```
2. Start the Ghost Server in your terminal:
   ```bash
   gcode ghost
   ```
3. In VS Code, press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac) and select:
   **`G-Coder: Connect Ghost Server`**

### 🛡️ Privacy & Security

Built with enterprise-grade security. The Ghost Bridge operates purely offline over a local WebSocket. It only reads the currently active file when a CLI intent is triggered.

---
*Developed with ❤️ by **Developer Pintu***

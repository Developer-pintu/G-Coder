# Contributing to g-coder

First off, thank you for considering contributing to `g-coder`! As an autonomous AI orchestration platform, we welcome contributions that enhance our core AI heuristics, system APIs, and safety sandbox protocols.

## Code of Conduct

By participating in this project, you agree to abide by standard open-source community guidelines. Be respectful, inclusive, and collaborative.

## Development Workflow

1. **Fork & Branch**: Fork the repository and create a new feature branch (`git checkout -b feature/your-feature`).
2. **Build the CLI**: Run `npm install` followed by `npm run build` to compile the TypeScript engines.
3. **Run Tests**: Ensure all autonomous logic tests pass (`npm run test`).
4. **Submit PR**: Open a Pull Request targeting the `main` branch.

## Strict Licensing & Copyright Attribution Rules

`g-coder` uses the MIT License, meaning it is 100% free for everyone. However, to maintain the integrity of the project's ownership, **you must adhere to the following strict guidelines**:

1. **Do NOT remove the Copyright Headers**: Our build scripts automatically inject the `Developer Pintu` copyright watermark into all `.ts` files. Pull Requests that modify or attempt to bypass the `src/core/watermark.ts` engine will be instantly rejected.
2. **Attribution Preservation**: If you create a fork or derived commercial product based on `g-coder`, the original `LICENSE` file and the CLI banner attribution MUST remain intact and visible to end-users.
3. **New Files**: Any new `.ts` files you add will automatically receive the copyright header upon running `npm run build`. Please do not manually hardcode alternative headers.

We are excited to see what revolutionary capabilities you build into `g-coder`!

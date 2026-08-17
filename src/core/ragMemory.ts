import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class RagMemory {
    private readonly brainPath = path.resolve(process.cwd(), '.gcode_brain.json');

    public addMemory(memoryStr: string) {
        let brain: string[] = [];
        if (fs.existsSync(this.brainPath)) {
            brain = JSON.parse(fs.readFileSync(this.brainPath, 'utf8'));
        }

        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${memoryStr}`;
        brain.push(entry);

        fs.writeFileSync(this.brainPath, JSON.stringify(brain, null, 2), 'utf8');
        console.log(chalk.green(`\n🧠 Memory successfully injected into Local RAG Brain.`));
        console.log(chalk.gray(`Entry: ${entry}`));
    }

    public listMemory() {
        if (!fs.existsSync(this.brainPath)) {
            console.log(chalk.yellow(`\n⚠ Local RAG Brain is empty.`));
            return;
        }

        const brain: string[] = JSON.parse(fs.readFileSync(this.brainPath, 'utf8'));
        console.log(chalk.cyan.bold(`\n🧠 G-Coder Contextual Memories:`));
        brain.forEach((mem, index) => {
            console.log(chalk.white(`${index + 1}. ${mem}`));
        });
    }

    public static getContextContext(): string {
        const p = path.resolve(process.cwd(), '.gcode_brain.json');
        if (!fs.existsSync(p)) return '';

        try {
            const brain: string[] = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (brain.length === 0) return '';

            // Return the last 20 memories to inject into LLM prompts seamlessly
            return `\n--- LOCAL PROJECT MEMORY (RAG CONTEXT) ---\nRemember these architectural decisions made by the team previously:\n${brain.slice(-20).join('\n')}\n------------------------------------------\n`;
        } catch (e) {
            return '';
        }
    }
}

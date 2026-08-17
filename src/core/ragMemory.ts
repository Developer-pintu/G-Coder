import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import glob from 'glob';

interface HolographicNode {
    filePath: string;
    content: string;
    keywords: string[];
}

export class RagMemory {
    private readonly brainPath = path.resolve(process.cwd(), '.gcode_brain.json');
    private readonly hologramPath = path.resolve(process.cwd(), '.gcode_hologram.json');

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

    /**
     * Holographic RAG: Indexes the entire workspace into a local semantic cache.
     */
    public indexWorkspaceHologram() {
        console.log(chalk.magenta.bold(`\n🌌 Initializing Holographic RAG Index...`));
        
        // Fast glob for source files
        const files = glob.sync('**/*.{ts,js,py,go,rs,cpp,java}', { ignore: ['node_modules/**', 'dist/**', 'build/**'] });
        const nodes: HolographicNode[] = [];

        console.log(chalk.gray(`Scanning ${files.length} files...`));
        for (const file of files) {
            try {
                const absolute = path.resolve(process.cwd(), file);
                const content = fs.readFileSync(absolute, 'utf-8');
                // Extremely simple tokenizer for local keyword extraction
                const keywords = content.toLowerCase().match(/[a-z0-9_]+/g) || [];
                const uniqueKeywords = Array.from(new Set(keywords));
                
                nodes.push({
                    filePath: file,
                    content: content.substring(0, 1500), // store chunk for context window
                    keywords: uniqueKeywords
                });
            } catch (e) {}
        }

        fs.writeFileSync(this.hologramPath, JSON.stringify(nodes), 'utf8');
        console.log(chalk.green(`✔ Holographic Brain synced. Indexed ${nodes.length} nodes.`));
    }

    /**
     * Finds top matching files based on local TF-IDF style keyword intersection
     */
    public queryHologram(query: string): string {
        if (!fs.existsSync(this.hologramPath)) {
            console.log(chalk.yellow(`⚠ Holographic Brain not indexed. Run 'gcode hunt --index' first.`));
            return '';
        }

        const nodes: HolographicNode[] = JSON.parse(fs.readFileSync(this.hologramPath, 'utf8'));
        const queryTerms = query.toLowerCase().match(/[a-z0-9_]+/g) || [];

        const scored = nodes.map(node => {
            const matchCount = queryTerms.filter(term => node.keywords.includes(term)).length;
            return { ...node, score: matchCount };
        }).sort((a, b) => b.score - a.score);

        const topNodes = scored.slice(0, 3).filter(n => n.score > 0);
        
        if (topNodes.length === 0) return '';
        
        return `\n--- HOLOGRAPHIC CONTEXT (TOP FILE MATCHES) ---\n` + 
               topNodes.map(n => `[FILE: ${n.filePath}]\n${n.content}\n...`).join('\n\n') + 
               `\n--------------------------------------------\n`;
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

            return `\n--- LOCAL PROJECT MEMORY (RAG CONTEXT) ---\nRemember these architectural decisions made by the team previously:\n${brain.slice(-20).join('\n')}\n------------------------------------------\n`;
        } catch (e) {
            return '';
        }
    }
}

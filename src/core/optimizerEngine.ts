/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fse from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class OptimizerEngine {
    
    /**
     * Extracts a sliding window of lines around a specific target string or line number
     * to reduce token usage when sending context to the LLM.
     */
    public extractContextWindow(filePath: string, targetLine: number, radius: number = 20): string {
        try {
            const absolutePath = path.resolve(process.cwd(), filePath);
            if (!fse.existsSync(absolutePath)) return '';

            const content = fse.readFileSync(absolutePath, 'utf-8');
            const lines = content.split('\n');
            
            const start = Math.max(0, targetLine - radius - 1);
            const end = Math.min(lines.length, targetLine + radius);
            
            const chunk = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
            return `\n--- SLICED CONTEXT: ${filePath} (Lines ${start + 1}-${end}) ---\n${chunk}\n--------------------\n`;
        } catch (e) {
            return '';
        }
    }

    /**
     * Parses the LLM's response for specific SEARCH and REPLACE blocks
     * and applies them to the target file.
     * Expected format:
     * <<SEARCH>>
     * old code
     * <<REPLACE>>
     * new code
     * <<END>>
     */
    public applyDiffPatch(filePath: string, llmResponse: string): boolean {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fse.existsSync(absolutePath)) {
            console.log(chalk.red(`[Optimizer] Target file not found for patching: ${filePath}`));
            return false;
        }

        let content = fse.readFileSync(absolutePath, 'utf-8');
        
        const patchRegex = /<<SEARCH>>\n([\s\S]*?)\n<<REPLACE>>\n([\s\S]*?)\n<<END>>/g;
        let match;
        let patched = false;

        while ((match = patchRegex.exec(llmResponse)) !== null) {
            const searchBlock = match[1];
            const replaceBlock = match[2];

            if (content.includes(searchBlock)) {
                content = content.replace(searchBlock, replaceBlock);
                patched = true;
                console.log(chalk.green(`[Optimizer] Successfully applied patch block to ${filePath}`));
            } else {
                console.log(chalk.yellow(`[Optimizer] Could not find SEARCH block in ${filePath}. Patch skipped.`));
            }
        }

        if (patched) {
            fse.writeFileSync(absolutePath, content, 'utf-8');
            return true;
        }

        return false;
    }
}

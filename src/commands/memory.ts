/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { RagMemory } from '../core/ragMemory';

export const registerMemoryCommand = (program: Command) => {
    program
        .command('memory <action> [content]')
        .description('Contextual Clone Memory (Local RAG): Add or list persistent memories (e.g. "gcode memory add \'use Redis\'")')
        .action((action: string, content: string) => {
            const memory = new RagMemory();
            if (action === 'add') {
                if (!content) {
                    console.log('Error: content is required for add action.');
                    return;
                }
                memory.addMemory(content);
            } else if (action === 'list') {
                memory.listMemory();
            } else {
                console.log('Invalid action. Use "add" or "list".');
            }
        });
};

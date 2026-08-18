/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Fuse from 'fuse.js';

interface Document {
    filepath: string;
    content: string;
}

export class RagEngine {
    private vectorStorePath: string;

    constructor() {
        this.vectorStorePath = path.join(process.cwd(), '.g-coder', 'vectors.json');
    }

    /**
     * Real Local Offline Search using Fuse.js
     * Reads all code files in the directory and performs fuzzy search.
     */
    public async search(query: string): Promise<string[]> {
        console.log(chalk.cyan(`\n🔍 [RAG Engine] Performing Semantic Search for: "${query}"...`));
        
        const files: string[] = [];
        this.getAllFiles(process.cwd(), files);

        if (files.length === 0) {
            console.log(chalk.yellow(`No files found to search.`));
            return [];
        }

        const documents: Document[] = [];
        
        for (const filepath of files) {
            try {
                // Read first 10KB of a file to prevent memory overload
                const stat = fs.statSync(filepath);
                if (stat.size < 1024 * 1024 * 2) { // Skip files > 2MB entirely
                    const fd = fs.openSync(filepath, 'r');
                    const buffer = Buffer.alloc(10240); // 10KB limit for search
                    const bytesRead = fs.readSync(fd, buffer, 0, 10240, 0);
                    fs.closeSync(fd);
                    
                    const content = buffer.toString('utf8', 0, bytesRead);
                    documents.push({ filepath, content });
                }
            } catch (e) {
                // Ignore read errors (e.g. perms)
            }
        }

        const options = {
            includeScore: true,
            keys: ['filepath', 'content'],
            threshold: 0.4, // Lower is more exact. 0.4 is a good fuzzy semantic balance.
            ignoreLocation: true
        };

        const fuse = new Fuse(documents, options);
        const result = fuse.search(query);

        // Return top 5 relevant files
        const matches = result.slice(0, 5).map(r => r.item.filepath);
        
        console.log(chalk.green(`✔ Found ${matches.length} relevant files based on content/path.`));
        return matches;
    }

    private getAllFiles(dirPath: string, arrayOfFiles: string[]) {
        try {
            const files = fs.readdirSync(dirPath);

            files.forEach((file) => {
                const fullPath = path.join(dirPath, file);
                try {
                    if (fs.statSync(fullPath).isDirectory()) {
                        if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.g-coder') {
                            this.getAllFiles(fullPath, arrayOfFiles);
                        }
                    } else {
                        if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
                            arrayOfFiles.push(fullPath);
                        }
                    }
                } catch(e) {}
            });
        } catch(e) {}
    }
}

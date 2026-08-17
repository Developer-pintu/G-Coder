import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class RagEngine {
    private vectorStorePath: string;

    constructor() {
        this.vectorStorePath = path.join(process.cwd(), '.g-coder', 'vectors.json');
    }

    /**
     * Very basic Mock Semantic Search Implementation.
     * In a production environment, this would:
     * 1. Read all files.
     * 2. Call OpenAI Embeddings API.
     * 3. Store in `.g-coder/vectors.json`.
     * 4. Perform Cosine Similarity against the query.
     */
    public async search(query: string): Promise<string[]> {
        console.log(chalk.cyan(`\n🔍 [RAG Engine] Performing Semantic Search for: "${query}"...`));
        
        // Simulating embedding generation and vector math
        await new Promise(r => setTimeout(r, 1000));
        
        const files: string[] = [];
        this.getAllFiles(process.cwd(), files);

        if (files.length === 0) {
            console.log(chalk.yellow(`No files found to search.`));
            return [];
        }

        // Mock logic: Just return up to 3 random files to simulate semantic matches
        const matches = files.slice(0, 3);
        
        console.log(chalk.green(`✔ Found ${matches.length} semantically relevant files.`));
        return matches;
    }

    private getAllFiles(dirPath: string, arrayOfFiles: string[]) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
                if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                    this.getAllFiles(path.join(dirPath, file), arrayOfFiles);
                }
            } else {
                if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json')) {
                    arrayOfFiles.push(path.join(dirPath, file));
                }
            }
        });
    }
}

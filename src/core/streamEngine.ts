import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import axios, { AxiosError } from 'axios';

export interface StreamState {
    currentChunkIndex: number;
    completedChunks: string[];
    failedProviders: string[];
}

export type LLMProvider = 'OpenAI' | 'OpenRouter' | 'Groq' | 'Gemini';

export class StreamEngine {
    private stateFilePath: string;
    private state: StreamState;
    private providers: LLMProvider[] = ['OpenAI', 'OpenRouter', 'Groq', 'Gemini'];

    constructor(projectRoot: string) {
        this.stateFilePath = path.join(projectRoot, '.g-coder-state.json');
        this.state = this.loadState();
    }

    private loadState(): StreamState {
        if (fs.existsSync(this.stateFilePath)) {
            try {
                const data = fs.readFileSync(this.stateFilePath, 'utf8');
                return JSON.parse(data);
            } catch (e) {
                console.warn(chalk.yellow(`⚠️ [g-coder]: Failed to parse state file. Starting fresh.`));
            }
        }
        return {
            currentChunkIndex: 0,
            completedChunks: [],
            failedProviders: []
        };
    }

    private saveState(): void {
        fs.outputFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
    }

    /**
     * Resets the generation state.
     */
    public resetState(): void {
        this.state = { currentChunkIndex: 0, completedChunks: [], failedProviders: [] };
        this.saveState();
    }

    private getActiveProviderKey(provider: LLMProvider): string | undefined {
        switch (provider) {
            case 'OpenAI': return process.env.OPENAI_API_KEY;
            case 'OpenRouter': return process.env.OPENROUTER_API_KEY;
            case 'Groq': return process.env.GROQ_API_KEY;
            case 'Gemini': return process.env.GEMINI_API_KEY;
            default: return undefined;
        }
    }

    private getNextAvailableProvider(): LLMProvider | null {
        for (const provider of this.providers) {
            if (!this.state.failedProviders.includes(provider) && this.getActiveProviderKey(provider)) {
                return provider;
            }
        }
        return null;
    }

    /**
     * Processes a list of chunks seamlessly with failover on 429 Rate Limits.
     * Reuses completed chunks from state without repeating work.
     */
    public async processStreamChunks(chunksToProcess: string[], streamCallback: (chunk: string, result: string) => void): Promise<void> {
        console.log(chalk.blue(`\n🌊 [g-coder]: Starting Stateful Streaming (Total Chunks: ${chunksToProcess.length})...`));
        
        while (this.state.currentChunkIndex < chunksToProcess.length) {
            const currentProvider = this.getNextAvailableProvider();
            
            if (!currentProvider) {
                throw new Error("All LLM providers exhausted or no valid API keys found. Cannot continue.");
            }

            const currentChunk = chunksToProcess[this.state.currentChunkIndex];
            console.log(chalk.dim(`[StreamEngine]: Processing chunk ${this.state.currentChunkIndex + 1}/${chunksToProcess.length} using ${currentProvider}...`));

            try {
                // Simulate an LLM streaming call
                const result = await this.mockLlmCall(currentProvider, currentChunk);
                
                // Success: update state
                streamCallback(currentChunk, result);
                this.state.completedChunks.push(result);
                this.state.currentChunkIndex++;
                this.saveState();

            } catch (error: any) {
                if (axios.isAxiosError(error) && error.response?.status === 429) {
                    console.warn(chalk.yellow(`\n⚠️ [g-coder]: Rate Limit (429) hit on ${currentProvider}.`));
                    console.log(chalk.cyan(`🔄 Automatically failing over to next provider... Resuming from chunk ${this.state.currentChunkIndex + 1}.`));
                    this.state.failedProviders.push(currentProvider);
                    this.saveState();
                    // Loop continues with next provider automatically without advancing index
                } else {
                    console.error(chalk.red(`\n❌ [g-coder]: Critical streaming error: ${error.message}`));
                    throw error;
                }
            }
        }

        console.log(chalk.green(`\n✅ [g-coder]: All stream chunks processed successfully.`));
    }

    /**
     * Simulates an LLM call for demonstration purposes.
     * Randomly throws a 429 error to test the failover logic if desired.
     */
    private async mockLlmCall(provider: LLMProvider, chunk: string): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate a 10% chance of a rate limit for testing
                // In production, this would be an actual Axios call.
                if (Math.random() < 0.1) {
                    const err = new AxiosError('Rate Limit Exceeded', '429', undefined, undefined, {
                        status: 429,
                        statusText: 'Too Many Requests',
                        data: {},
                        headers: {},
                        config: {} as any
                    });
                    reject(err);
                } else {
                    resolve(`Processed[${provider}]: ${chunk}`);
                }
            }, 500);
        });
    }
}

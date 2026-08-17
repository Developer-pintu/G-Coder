import chalk from 'chalk';

export class StreamEngine {
    private requestsInWindow = 0;
    private readonly maxRequestsPerMinute = 15;
    private windowStart = Date.now();

    /**
     * Token-Efficient Rate-Limit Shield (Sliding Window)
     */
    public async throttle(): Promise<void> {
        const now = Date.now();
        if (now - this.windowStart > 60000) {
            this.windowStart = now;
            this.requestsInWindow = 0;
        }

        this.requestsInWindow++;
        if (this.requestsInWindow > this.maxRequestsPerMinute) {
            console.log(chalk.yellow(`\n⚠ [Stream Shield] 429 Prevention: Throttle engaged. Waiting 10s...`));
            await new Promise(resolve => setTimeout(resolve, 10000));
            this.requestsInWindow = 1;
            this.windowStart = Date.now();
        }
    }
}

export const streamEngine = new StreamEngine();

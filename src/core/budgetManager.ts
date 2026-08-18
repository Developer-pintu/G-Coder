/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
export interface BudgetLimits { maxRequests?: number; maxTokens?: number; maxCostUsd?: number; }
export interface BudgetUsage { requests: number; tokens: number; costUsd: number; }

export class BudgetManager {
    private usage: BudgetUsage = { requests: 0, tokens: 0, costUsd: 0 };
    constructor(private readonly limits: BudgetLimits = {}) {}
    public consume(tokens: number = 0, costUsd: number = 0): void {
        const next = { requests: this.usage.requests + 1, tokens: this.usage.tokens + Math.max(0, tokens), costUsd: this.usage.costUsd + Math.max(0, costUsd) };
        if (this.limits.maxRequests !== undefined && next.requests > this.limits.maxRequests) throw new Error('Request budget exhausted.');
        if (this.limits.maxTokens !== undefined && next.tokens > this.limits.maxTokens) throw new Error('Token budget exhausted.');
        if (this.limits.maxCostUsd !== undefined && next.costUsd > this.limits.maxCostUsd) throw new Error('Cost budget exhausted.');
        this.usage = next;
    }
    public snapshot(): BudgetUsage { return { ...this.usage }; }
}

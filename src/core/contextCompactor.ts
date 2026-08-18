/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }
export class ContextCompactor {
    constructor(private readonly maxCharacters: number = 80_000) {}
    public compact(messages: ChatMessage[]): ChatMessage[] {
        let remaining = this.maxCharacters;
        const kept: ChatMessage[] = [];
        for (let index = messages.length - 1; index >= 0; index--) {
            const redacted = this.redact(messages[index].content);
            if (remaining <= 0) break;
            const content = redacted.slice(-remaining);
            kept.unshift({ ...messages[index], content }); remaining -= content.length;
        }
        if (kept.length < messages.length) kept.unshift({ role: 'system', content: `[Context compacted: ${messages.length - kept.length} older messages omitted. Persisted task state remains authoritative.]` });
        return kept;
    }
    private redact(value: string): string { return value.replace(/\b(sk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|token|password)\s*[:=]\s*\S+)/gi, '[REDACTED]'); }
}

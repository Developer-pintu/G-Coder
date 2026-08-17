export interface CompletionMessage { role: 'user' | 'assistant' | 'system'; content: string; }
export interface CompletionRequest { model: string; messages: CompletionMessage[]; maxTokens?: number; }
export interface CompletionResult { text: string; model: string; inputTokens?: number; outputTokens?: number; }
export interface ProviderError { retryable: boolean; status?: number; category: 'rate-limit' | 'authentication' | 'network' | 'invalid-request' | 'unknown'; message: string; }
export interface ProviderAdapter {
    readonly name: string;
    listModels(apiKey: string): Promise<string[]>;
    complete(apiKey: string, request: CompletionRequest): Promise<CompletionResult>;
    classifyError(error: unknown): ProviderError;
}

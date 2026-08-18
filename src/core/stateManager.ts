/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fse from 'fs-extra';
import path from 'path';

export type SessionStatus = 'active' | 'completed' | 'failed';

export interface CompletedStep {
    id: string;
    description: string;
    completedAt: string;
}

export interface SessionState {
    version: 1;
    sessionId: string;
    originalPrompt: string;
    enhancedPrompt: string;
    status: SessionStatus;
    completedSteps: CompletedStep[];
    generatedFiles: string[];
    lastProvider?: string;
    lastError?: string;
    startedAt: string;
    updatedAt: string;
}

export class StateManager {
    private readonly statePath: string;

    constructor(workspace: string = process.cwd()) {
        this.statePath = path.join(workspace, '.g-coder-state.json');
    }

    public start(originalPrompt: string, enhancedPrompt: string): SessionState {
        const existing = this.load();
        if (existing?.status === 'active' && existing.originalPrompt === originalPrompt) {
            return existing;
        }

        const now = new Date().toISOString();
        const state: SessionState = {
            version: 1,
            sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            originalPrompt,
            enhancedPrompt,
            status: 'active',
            completedSteps: [],
            generatedFiles: [],
            startedAt: now,
            updatedAt: now
        };
        this.save(state);
        return state;
    }

    public load(): SessionState | null {
        if (!fse.existsSync(this.statePath)) return null;
        try {
            const parsed = fse.readJsonSync(this.statePath) as SessionState;
            if (parsed.version !== 1 || !parsed.sessionId || !Array.isArray(parsed.completedSteps)) {
                throw new Error('Unsupported or malformed state schema.');
            }
            return parsed;
        } catch (error: any) {
            throw new Error(`Unable to read session state: ${error.message}`);
        }
    }

    public recordStep(id: string, description: string, generatedFile?: string): void {
        const state = this.requireActiveState();
        if (!state.completedSteps.some(step => step.id === id)) {
            state.completedSteps.push({ id, description, completedAt: new Date().toISOString() });
        }
        if (generatedFile && !state.generatedFiles.includes(generatedFile)) {
            state.generatedFiles.push(generatedFile);
        }
        this.save(state);
    }

    public recordHandoff(provider: string, error?: string): string {
        const state = this.requireActiveState();
        state.lastProvider = provider;
        state.lastError = error;
        this.save(state);
        return this.buildResumePrompt(state);
    }

    public complete(): void {
        const state = this.load();
        if (!state) return;
        state.status = 'completed';
        state.lastError = undefined;
        this.save(state);
    }

    public fail(error: string): void {
        const state = this.load();
        if (!state) return;
        state.status = 'failed';
        state.lastError = error;
        this.save(state);
    }

    public getResumePrompt(): string | null {
        const state = this.load();
        return state?.status === 'active' ? this.buildResumePrompt(state) : null;
    }

    private requireActiveState(): SessionState {
        const state = this.load();
        if (!state || state.status !== 'active') {
            throw new Error('No active g-coder session state exists.');
        }
        return state;
    }

    private buildResumePrompt(state: SessionState): string {
        const completed = state.completedSteps.length
            ? state.completedSteps.map(step => `- ${step.id}: ${step.description}`).join('\n')
            : '- No execution actions have completed yet.';
        const files = state.generatedFiles.length ? state.generatedFiles.join(', ') : 'None';
        return [
            'STATEFUL RESUME CONTEXT (authoritative):',
            `Session: ${state.sessionId}`,
            `Original task: ${state.enhancedPrompt}`,
            'Already completed steps (DO NOT repeat):',
            completed,
            `Files already generated or modified: ${files}`,
            'Continue from the next unfinished step. Inspect existing results before changing them and never regenerate completed work.'
        ].join('\n');
    }

    private save(state: SessionState): void {
        state.updatedAt = new Date().toISOString();
        const temporaryPath = `${this.statePath}.${process.pid}.tmp`;
        try {
            fse.writeJsonSync(temporaryPath, state, { spaces: 2, mode: 0o600 });
            fse.renameSync(temporaryPath, this.statePath);
            try { fse.chmodSync(this.statePath, 0o600); } catch { /* best effort on Windows */ }
        } catch (error: any) {
            fse.removeSync(temporaryPath);
            throw new Error(`Unable to persist session state: ${error.message}`);
        }
    }
}

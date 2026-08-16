export type ToolRisk = 'read' | 'write' | 'external-side-effect';
export interface AgentTool<T = unknown> { name: string; description: string; risk: ToolRisk; execute(input: unknown): Promise<T>; }
export class ToolRegistry {
    private readonly tools = new Map<string, AgentTool>();
    public register(tool: AgentTool): void { const name = tool.name.trim().toLowerCase(); if (!/^[a-z][a-z0-9._-]{1,63}$/.test(name)) throw new Error('Invalid tool name.'); if (this.tools.has(name)) throw new Error(`Tool already registered: ${name}`); this.tools.set(name, { ...tool, name }); }
    public list(): Array<Pick<AgentTool, 'name' | 'description' | 'risk'>> { return [...this.tools.values()].map(({ name, description, risk }) => ({ name, description, risk })); }
    public async execute(name: string, input: unknown): Promise<unknown> { const tool = this.tools.get(name.toLowerCase()); if (!tool) throw new Error(`Unknown tool: ${name}`); return tool.execute(input); }
}

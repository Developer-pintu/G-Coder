/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
export interface TaskNode { id: string; title: string; dependencies: string[]; status: TaskStatus; error?: string; }

export class TaskGraph {
    private readonly nodes = new Map<string, TaskNode>();
    public add(node: Omit<TaskNode, 'status'> & { status?: TaskStatus }): void {
        if (!/^[A-Za-z0-9._-]{1,100}$/.test(node.id)) throw new Error(`Invalid task id: ${node.id}`);
        if (this.nodes.has(node.id)) throw new Error(`Duplicate task id: ${node.id}`);
        this.nodes.set(node.id, { ...node, dependencies: [...new Set(node.dependencies)], status: node.status ?? 'pending' });
        this.assertAcyclic();
    }
    public ready(): TaskNode[] {
        return [...this.nodes.values()].filter(node => node.status === 'pending' && node.dependencies.every(id => this.nodes.get(id)?.status === 'completed'));
    }
    public update(id: string, status: TaskStatus, error?: string): void {
        const node = this.nodes.get(id); if (!node) throw new Error(`Unknown task: ${id}`); node.status = status; node.error = error;
        if (status === 'failed') for (const dependent of this.nodes.values()) if (dependent.dependencies.includes(id) && dependent.status === 'pending') dependent.status = 'blocked';
    }
    public snapshot(): TaskNode[] { return [...this.nodes.values()].map(node => ({ ...node, dependencies: [...node.dependencies] })); }
    private assertAcyclic(): void {
        const visiting = new Set<string>(); const visited = new Set<string>();
        const visit = (id: string): void => { if (visiting.has(id)) throw new Error('Task graph contains a cycle.'); if (visited.has(id)) return; visiting.add(id); for (const dep of this.nodes.get(id)?.dependencies ?? []) if (this.nodes.has(dep)) visit(dep); visiting.delete(id); visited.add(id); };
        for (const id of this.nodes.keys()) visit(id);
    }
}

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { WebSocketServer, WebSocket } from 'ws';
import chalk from 'chalk';

export class IdeSync {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private static instance: IdeSync;

    private constructor() {}

    public static getInstance(): IdeSync {
        if (!IdeSync.instance) {
            IdeSync.instance = new IdeSync();
        }
        return IdeSync.instance;
    }

    public startServer(port: number = 8080) {
        if (this.wss) {
            console.log(chalk.yellow(`[IDE Sync] Server already running on port ${port}`));
            return;
        }

        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws) => {
            console.log(chalk.green(`\n🔌 [IDE Sync] VS Code Client connected!`));
            this.clients.add(ws);

            ws.on('close', () => {
                console.log(chalk.yellow(`[IDE Sync] Client disconnected.`));
                this.clients.delete(ws);
            });
        });

        console.log(chalk.cyan.bold(`\n📡 [IDE Sync] Live Bridge started on ws://localhost:${port}`));
        console.log(chalk.gray(`G-Coder edits will now be broadcasted directly to connected IDEs.`));
    }

    public broadcastEdit(filePath: string, content: string) {
        if (this.clients.size === 0) return;

        const payload = JSON.stringify({
            type: 'file_edit',
            path: filePath,
            content: content
        });

        this.clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
                client.send(payload);
            }
        });
    }
}

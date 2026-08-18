/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { WebSocketServer, WebSocket } from 'ws';
import chalk from 'chalk';
import { executeAiRequest } from './api';

export class GhostServer {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();

    /**
     * Starts the local WebSocket IPC bridge for live IDE keystroke streaming.
     */
    public async start(port: number = 8080, provider: string) {
        this.wss = new WebSocketServer({ port });
        
        console.log(chalk.cyan.bold(`\n👻 [Ghost Server] Online.`));
        console.log(chalk.gray(`Listening for IDE IPC connections on ws://localhost:${port}...`));

        this.wss.on('connection', (ws) => {
            console.log(chalk.green(`\n✔ IDE Extractor connected to Ghost Server.`));
            this.clients.add(ws);

            ws.on('message', async (message) => {
                const prompt = message.toString();
                console.log(chalk.magenta(`\n[Ghost] Received IDE telepathy: "${prompt}"`));
                
                // Transmit typing status
                this.broadcast(JSON.stringify({ type: 'status', data: 'thinking' }));

                try {
                    // Send prompt to AI
                    const rawPrompt = `The user is actively coding in their IDE and asked: "${prompt}". 
Write pure code to solve this. Do NOT output any markdown formatting, no backticks, no explanations. ONLY RAW CODE that can be directly typed into the editor.`;
                    
                    const code = await executeAiRequest(rawPrompt, provider);

                    this.broadcast(JSON.stringify({ type: 'status', data: 'typing' }));

                    // Simulate "Live Typing" character by character to prevent IDE freezing
                    for (let i = 0; i < code.length; i++) {
                        this.broadcast(JSON.stringify({ type: 'keystroke', data: code[i] }));
                        await new Promise(r => setTimeout(r, 10)); // 10ms typing speed
                    }

                    this.broadcast(JSON.stringify({ type: 'status', data: 'idle' }));
                    console.log(chalk.green(`✔ Ghost code transmitted to IDE.`));
                } catch (e: any) {
                    console.error(chalk.red(`Ghost Transmission Failed: ${e.message}`));
                    this.broadcast(JSON.stringify({ type: 'error', data: e.message }));
                }
            });

            ws.on('close', () => {
                console.log(chalk.yellow(`⚠ IDE disconnected.`));
                this.clients.delete(ws);
            });
        });
    }

    private broadcast(message: string) {
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}

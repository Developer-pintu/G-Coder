import dgram from 'dgram';
import chalk from 'chalk';
import os from 'os';

export class SwarmP2P {
    private readonly PORT = 44444;
    private readonly MULTICAST_ADDR = '224.0.0.114';
    private client: dgram.Socket;
    private localHostname = os.hostname();

    constructor() {
        this.client = dgram.createSocket('udp4');
    }

    /**
     * Initializes the Swarm listener to detect other developers in the local network
     */
    public joinSwarm() {
        console.log(chalk.magenta.bold(`\n🌐 Initializing Local P2P Developer Swarm...`));

        this.client.on('listening', () => {
            this.client.setBroadcast(true);
            this.client.setMulticastTTL(128);
            this.client.addMembership(this.MULTICAST_ADDR);
            console.log(chalk.green(`✔ Swarm Engine active on port ${this.PORT}. Listening for peers...`));
            this.broadcastPresence();
        });

        this.client.on('message', (message, remote) => {
            try {
                const payload = JSON.parse(message.toString());
                if (payload.host !== this.localHostname) {
                    if (payload.type === 'PRESENCE') {
                        console.log(chalk.cyan(`\n👋 Peer Detected: ${payload.host} (${remote.address}) is also using G-Coder.`));
                    } else if (payload.type === 'LOCK') {
                        console.log(chalk.yellow(`\n🔒 [SWARM LOCK] ${payload.host} is editing: ${payload.file}. Avoid editing this file to prevent conflicts.`));
                    }
                }
            } catch (e) {}
        });

        this.client.bind(this.PORT);
    }

    private broadcastPresence() {
        const msg = JSON.stringify({ type: 'PRESENCE', host: this.localHostname });
        this.client.send(msg, 0, msg.length, this.PORT, this.MULTICAST_ADDR);
    }

    /**
     * Broadcasts a file lock when the AI is editing a file, warning local peers
     */
    public broadcastLock(filePath: string) {
        if (!this.client) return;
        const msg = JSON.stringify({ type: 'LOCK', host: this.localHostname, file: filePath });
        this.client.send(msg, 0, msg.length, this.PORT, this.MULTICAST_ADDR);
    }

    public disconnect() {
        if (this.client) {
            this.client.close();
        }
    }
}

// Global Swarm Instance
export const globalSwarm = new SwarmP2P();

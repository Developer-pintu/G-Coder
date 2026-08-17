import { Command } from 'commander';
import { globalSwarm } from '../core/swarmP2P';

export const registerSwarmCommand = (program: Command) => {
    program
        .command('swarm')
        .description('Initializes local P2P Developer Swarm to prevent merge conflicts')
        .action(() => {
            globalSwarm.joinSwarm();
            // Process stays alive listening to UDP
            console.log('Press Ctrl+C to exit swarm mode.');
        });
};

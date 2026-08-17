import { Command } from 'commander';
import { HologramRefactor } from '../core/hologram';

export const registerHologramCommand = (program: Command) => {
    program
        .command('hologram <target_entity>')
        .description('Holographic Refactoring: Safely load project into memory and execute an atomic, cross-file architectural rewrite')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (target: string, options) => {
            const holo = new HologramRefactor();
            await holo.executeHologram(target, options.provider);
        });
};

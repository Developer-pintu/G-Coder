import { Command } from 'commander';
import { InfraMorph } from '../core/infraMorph';

export const registerMorphCommand = (program: Command) => {
    program
        .command('morph')
        .description('Infra Morphing: Autonomously scans code and generates Docker/Terraform infrastructure based on dependencies')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (options) => {
            const morph = new InfraMorph();
            await morph.morphInfrastructure(options.provider);
        });
};

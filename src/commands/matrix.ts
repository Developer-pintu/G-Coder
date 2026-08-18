/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { MatrixEngine } from '../core/matrix';

export const registerMatrixCommand = (program: Command) => {
    program
        .command('matrix <component>')
        .description('Monorepo Maestro: Mass-refactor all files dependent on a specific component')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (component: string, options) => {
            const matrix = new MatrixEngine();
            await matrix.refactorDependencies(component, options.provider);
        });
};

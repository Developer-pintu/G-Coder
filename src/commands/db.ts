import { Command } from 'commander';
import { DbArchitect } from '../core/dbArchitect';

export const registerDbCommand = (program: Command) => {
    program
        .command('db <schemaDescription>')
        .description('Auto-DB Architect: Generate Prisma schema and dummy data seeder')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (schemaDescription: string, options) => {
            const architect = new DbArchitect();
            await architect.generateSchema(schemaDescription, options.provider);
        });
};

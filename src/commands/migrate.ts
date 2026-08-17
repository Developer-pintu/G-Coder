import { Command } from 'commander';
import { DbMigrator } from '../core/dbMigrator';

export const registerMigrateCommand = (program: Command) => {
    program
        .command('migrate')
        .description('Database Auto-Migrator: Safely migrates schema, detects data-loss, and auto-heals DB errors')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (options) => {
            const migrator = new DbMigrator();
            await migrator.autoMigrate(options.provider);
        });
};

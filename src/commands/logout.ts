import { Command } from 'commander';
import { SessionAuthEngine } from '../core/sessionAuthEngine';

export const registerLogoutCommand = (program: Command) => {
    program
        .command('logout')
        .description('Securely wipe all local browser session cookies and fallbacks')
        .action(() => {
            const engine = new SessionAuthEngine();
            engine.logout();
        });
};

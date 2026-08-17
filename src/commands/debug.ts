import { Command } from 'commander';
import { ExecutionDebugger } from '../core/debugger';

export const registerDebugCommand = (program: Command) => {
    program
        .command('debug <file>')
        .description('"Time-Travel" Debugger: Execute script, catch crashes, and auto-fix the code')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (file: string, options) => {
            const debuggerEngine = new ExecutionDebugger();
            await debuggerEngine.debugScript(file, options.provider);
        });
};

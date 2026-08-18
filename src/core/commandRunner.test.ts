/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CommandRunner, StructuredCommand } from './commandRunner';

describe('CommandRunner', () => {
    it('should reject commands outside the workspace', async () => {
        const runner = new CommandRunner(process.cwd());
        const command: StructuredCommand = {
            executable: 'node',
            cwd: '../outside-dir'
        };

        await assert.rejects(
            runner.run(command),
            { message: 'Command working directory is outside the workspace.' }
        );
    });

    it('should execute a simple command successfully', async () => {
        const runner = new CommandRunner(process.cwd());
        const command: StructuredCommand = {
            executable: 'node',
            args: ['-e', 'console.log("hello test");']
        };

        const result = await runner.run(command);
        assert.strictEqual(result.exitCode, 0);
        assert.ok(result.stdout.includes('hello test'));
        assert.strictEqual(result.timedOut, false);
    });

    it('should capture stderr from a command', async () => {
        const runner = new CommandRunner(process.cwd());
        const command: StructuredCommand = {
            executable: 'node',
            args: ['-e', 'console.error("error output"); process.exit(1);']
        };

        const result = await runner.run(command);
        assert.strictEqual(result.exitCode, 1);
        assert.ok(result.stderr.includes('error output'));
    });

    it('should handle timeouts correctly', async () => {
        const runner = new CommandRunner(process.cwd());
        const command: StructuredCommand = {
            executable: 'node',
            args: ['-e', 'setTimeout(() => {}, 5000);'], // Sleep for 5s
            timeoutMs: 1000 // Timeout after 1s
        };

        const result = await runner.run(command);
        assert.strictEqual(result.timedOut, true);
        assert.notStrictEqual(result.exitCode, 0); 
    });
});

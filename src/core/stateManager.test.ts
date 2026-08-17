import assert from 'node:assert/strict';
import test from 'node:test';
import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { StateManager } from './stateManager';

test('persists completed work and produces a non-repeating resume prompt', () => {
    const workspace = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-state-'));
    try {
        const manager = new StateManager(workspace);
        manager.start('login bana do', 'Build a login page');
        manager.recordStep('1.1', 'write src/login.ts', 'src/login.ts');
        manager.recordStep('1.1', 'write src/login.ts', 'src/login.ts');

        const resume = manager.recordHandoff('gemini', 'Rate Limit Exceeded');
        const state = manager.load();
        assert.equal(state?.completedSteps.length, 1);
        assert.deepEqual(state?.generatedFiles, ['src/login.ts']);
        assert.match(resume, /DO NOT repeat/);
        assert.match(resume, /src\/login.ts/);

        manager.complete();
        assert.equal(manager.load()?.status, 'completed');
    } finally {
        fse.removeSync(workspace);
    }
});

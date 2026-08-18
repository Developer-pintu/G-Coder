/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { PromptEnhancer } from './promptEnhancer';

test('translates common Hinglish and adds repository-aware engineering constraints', () => {
    const result = new PromptEnhancer().enhance('mujhe login page bana do');
    assert.match(result.enhanced, /I need authentication login page build/i);
    assert.match(result.enhanced, /authentication\/authorization/i);
    assert.match(result.enhanced, /existing repository/i);
    assert.deepEqual(result.detectedSignals, ['authentication', 'user-interface']);
});

test('rejects empty prompts', () => {
    assert.throws(() => new PromptEnhancer().enhance('   '), /empty prompt/);
});

import { Command } from 'commander';
import chalk from 'chalk';
import { VoiceEngine } from '../core/voiceEngine';
import { executeAiRequest, buildAiPrompt } from '../core/api';
import { SystemAgent } from '../core/agentEngine';

export const registerListenCommand = (program: Command, engine: SystemAgent) => {
    program
        .command('listen <audioPath>')
        .description('Voice-to-Code: Process an audio file and generate code')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (audioPath: string, options) => {
            const transcript = await VoiceEngine.processAudio(audioPath);
            if (!transcript) {
                return;
            }

            console.log(chalk.green(`\n✔ Transcription successful: "${transcript}"`));
            console.log(chalk.cyan(`\n🧠 Processing instructions...`));

            const fullPrompt = buildAiPrompt('run', transcript);

            try {
                const res = await executeAiRequest(fullPrompt, options.provider);
                const actions = engine.parseActions(res);
                
                if (actions.length > 0) {
                    console.log(chalk.green(`\nVoice AI proposed ${actions.length} file actions. Executing...`));
                    await engine.executeActions(actions);
                } else {
                    console.log(chalk.yellow(`\nVoice AI provided advice but no file actions:\n\n${res}`));
                }
            } catch (error: any) {
                console.error(chalk.red(`\n❌ Voice Execution Failed: ${error.message}`));
            }
        });
};

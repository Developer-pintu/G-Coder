import { Command } from 'commander';
import { AiAcademy } from '../core/aiAcademy';

export const registerTrainCommand = (program: Command) => {
    program
        .command('train <source>')
        .description('Sentient AI Academy: Autonomously reads a file/topic, generates a synthetic dataset, and deploys a fine-tuned Ollama model')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (source: string, options) => {
            const academy = new AiAcademy();
            await academy.trainModel(source, options.provider);
        });
};

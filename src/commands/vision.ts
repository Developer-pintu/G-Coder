/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { VisionEngine } from '../core/visionEngine';
import { executeAiRequest, buildAiPrompt } from '../core/api';
import { SystemAgent } from '../core/agentEngine';

export const registerVisionCommand = (program: Command, engine: SystemAgent) => {
    program
        .command('vision <imagePath> <prompt>')
        .description('Generate code from an image or UI mockup using Vision AI')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (imagePath: string, prompt: string, options) => {
            console.log(chalk.cyan(`\n👁️  [VisionEngine] Processing image: ${imagePath}...`));
            
            const imageObj = await VisionEngine.processImage(imagePath);
            if (!imageObj) {
                console.error(chalk.red(`Aborting vision command due to image processing error.`));
                return;
            }

            console.log(chalk.cyan(`Generating code based on the image...`));
            
            // Build the multimodal payload
            const instruction = buildAiPrompt('run', prompt, 'designer');
            
            const messages = [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: instruction },
                        { type: 'image_url', image_url: { url: `data:${imageObj.mimeType};base64,${imageObj.base64}` } }
                    ]
                }
            ];

            try {
                const res = await executeAiRequest(messages, options.provider);
                const actions = engine.parseActions(res);
                
                if (actions.length > 0) {
                    console.log(chalk.green(`\nVision AI proposed ${actions.length} file actions. Executing...`));
                    await engine.executeActions(actions);
                } else {
                    console.log(chalk.yellow(`\nVision AI provided advice but no file actions:\n\n${res}`));
                }
            } catch (error: any) {
                console.error(chalk.red(`\n❌ Vision Execution Failed: ${error.message}`));
            }
        });
};

import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export class VisionEngine {
    /**
     * Reads a local image file and converts it to a base64 string suitable for multimodal LLM payloads.
     * @param imagePath Path to the local image file.
     * @returns An object containing the base64 string and mime type, or null if it fails.
     */
    public static async processImage(imagePath: string): Promise<{ base64: string, mimeType: string } | null> {
        try {
            const resolvedPath = path.resolve(process.cwd(), imagePath);
            if (!fs.existsSync(resolvedPath)) {
                console.error(chalk.red(`❌ [VisionEngine] Image file not found: ${resolvedPath}`));
                return null;
            }

            const ext = path.extname(resolvedPath).toLowerCase();
            let mimeType = 'image/jpeg';
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.gif') mimeType = 'image/gif';

            const fileBuffer = await fs.readFile(resolvedPath);
            const base64 = fileBuffer.toString('base64');

            console.log(chalk.green(`✅ [VisionEngine] Successfully processed image: ${path.basename(resolvedPath)}`));
            return { base64, mimeType };
        } catch (error: any) {
            console.error(chalk.red(`❌ [VisionEngine] Failed to process image: ${error.message}`));
            return null;
        }
    }
}

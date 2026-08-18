/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';
import { UniversalKeyRotator } from './rotator';

export class VoiceEngine {
    /**
     * Reads a local audio file and converts it to text using Gemini 1.5 Pro.
     */
    public static async processAudio(filePath: string): Promise<string | null> {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`\n❌ Audio file not found at: ${absolutePath}`));
            return null;
        }

        try {
            console.log(chalk.cyan(`\n🎙️  Processing audio file...`));
            const buffer = fs.readFileSync(absolutePath);
            const base64 = buffer.toString('base64');
            const mimeType = this.getMimeType(absolutePath);
            
            console.log(chalk.gray(`[VoiceEngine] Audio loaded: ${mimeType} (${base64.length} bytes)`));
            console.log(chalk.cyan(`Transcribing audio via Gemini 1.5 Pro...`));

            const rotator = new UniversalKeyRotator('gemini');
            const activeKey = rotator.getActiveKey();

            if (!activeKey) {
                throw new Error("No Gemini API key found for audio processing.");
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${activeKey}`;
            const payload = {
                contents: [{
                    parts: [
                        { text: "Transcribe the following audio accurately. If it contains a coding request, output exactly what the user asked. Do not add any extra conversational text." },
                        { inline_data: { mime_type: mimeType, data: base64 } }
                    ]
                }]
            };

            const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
            
            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                console.log(chalk.green(`✔ Transcription Success: "${text.trim()}"`));
                return text.trim();
            } else {
                throw new Error("Empty response from Gemini Audio API.");
            }
        } catch (error: any) {
            console.error(chalk.red(`\n❌ Failed to process audio: ${error.message}`));
            return null;
        }
    }

    private static getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.mp3') return 'audio/mp3';
        if (ext === '.wav') return 'audio/wav';
        if (ext === '.m4a') return 'audio/m4a';
        if (ext === '.ogg') return 'audio/ogg';
        return 'audio/mpeg';
    }
}

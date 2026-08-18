/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export interface FileMetadata {
    fileName: string;
    extension: string;
    absolutePath: string;
    sizeBytes: number;
    createdAt: Date;
    modifiedAt: Date;
    detectedFormat: string;
    magicBytes: string;
    entropy: number;
    securityFlags: string[];
    isTampered: boolean;
}

export class MetadataEngine {
    // Extensive dictionary of standard magic byte signatures
    private static readonly MAGIC_BYTES: Record<string, { name: string, hex: string }> = {
        '25504446': { name: 'PDF Document', hex: '25504446' },
        '89504e47': { name: 'PNG Image', hex: '89504e47' },
        'ffd8ffe0': { name: 'JPEG Image', hex: 'ffd8ffe0' },
        'ffd8ffe1': { name: 'JPEG Image', hex: 'ffd8ffe1' },
        'ffd8ffe2': { name: 'JPEG Image', hex: 'ffd8ffe2' },
        '504b0304': { name: 'ZIP Archive (DOCX/JAR/APK)', hex: '504b0304' },
        '7f454c46': { name: 'ELF Executable', hex: '7f454c46' },
        '4d5a': { name: 'Windows PE (EXE/DLL)', hex: '4d5a' },
        '52617221': { name: 'RAR Archive', hex: '52617221' },
        '1f8b08': { name: 'GZIP Archive', hex: '1f8b08' },
        '3c3f786d': { name: 'XML Document', hex: '3c3f786d' },
        '7b22': { name: 'JSON Document', hex: '7b22' }
    };

    /**
     * Calculates Shannon Entropy of a buffer.
     * High entropy (>7.5) strongly indicates encryption, packing, or compressed payloads.
     */
    private static calculateEntropy(buffer: Buffer): number {
        if (buffer.length === 0) return 0;
        const frequencies: Record<number, number> = {};
        for (let i = 0; i < buffer.length; i++) {
            const byte = buffer[i];
            frequencies[byte] = (frequencies[byte] || 0) + 1;
        }
        let entropy = 0;
        for (const byte in frequencies) {
            const p = frequencies[byte] / buffer.length;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }

    /**
     * Stream-based Magic Bytes detection.
     * Extracts only the necessary prefix bytes without blowing up heap memory.
     */
    private static async identifySignature(filePath: string): Promise<{ format: string, hex: string, buffer: Buffer }> {
        const fileHandle = await fs.promises.open(filePath, 'r');
        try {
            // Read first 1KB for magic bytes and entropy sampling
            const buffer = Buffer.alloc(1024); 
            const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
            const actualBuffer = buffer.subarray(0, bytesRead);
            
            const hexPrefix4 = actualBuffer.toString('hex', 0, 4);
            const hexPrefix3 = actualBuffer.toString('hex', 0, 3);
            const hexPrefix2 = actualBuffer.toString('hex', 0, 2);
            
            let detected = 'Unknown / Plaintext';
            let hexMatch = hexPrefix4;

            if (this.MAGIC_BYTES[hexPrefix4]) {
                detected = this.MAGIC_BYTES[hexPrefix4].name;
            } else if (this.MAGIC_BYTES[hexPrefix3]) {
                detected = this.MAGIC_BYTES[hexPrefix3].name;
                hexMatch = hexPrefix3;
            } else if (this.MAGIC_BYTES[hexPrefix2]) {
                detected = this.MAGIC_BYTES[hexPrefix2].name;
                hexMatch = hexPrefix2;
            } else {
                // Fast heuristic check for pure ASCII/UTF-8 plaintext
                let printableCount = 0;
                for (let i = 0; i < actualBuffer.length; i++) {
                    const b = actualBuffer[i];
                    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126)) {
                        printableCount++;
                    }
                }
                const isText = (printableCount / actualBuffer.length) > 0.85;
                if (isText) detected = 'Plaintext / Source Code';
                hexMatch = hexPrefix4; // fallback to showing first 4 bytes
            }

            return { format: detected, hex: hexMatch, buffer: actualBuffer };
        } finally {
            await fileHandle.close();
        }
    }

    /**
     * Cross-correlates file extension with signature and entropy to flag security threats.
     */
    private static scanIntegrity(metadata: Partial<FileMetadata>): { flags: string[], isTampered: boolean } {
        const flags: string[] = [];
        let isTampered = false;

        const ext = metadata.extension?.toLowerCase() || '';
        const format = metadata.detectedFormat || '';
        
        // --- Tampering & Spoofing Checks ---
        if (ext === '.pdf' && !format.includes('PDF')) {
            flags.push('CRITICAL: Extension spoofing detected. File is NOT a PDF.');
            isTampered = true;
        } else if (ext === '.exe' && !format.includes('Windows PE')) {
            flags.push('CRITICAL: Extension spoofing detected. File is NOT a valid executable.');
            isTampered = true;
        } else if ((ext === '.png' || ext === '.jpg' || ext === '.jpeg') && !format.includes('Image')) {
            flags.push('WARNING: Image extension spoofing. Possible steganography or hidden payload.');
            isTampered = true;
        } else if (ext === '.zip' && !format.includes('ZIP Archive')) {
            flags.push('CRITICAL: Malformed archive or extension spoofing detected.');
            isTampered = true;
        }

        // --- Encrypted Payload & Packing Checks ---
        const entropy = metadata.entropy || 0;
        if (entropy > 7.5 && format.includes('Plaintext')) {
            flags.push('CRITICAL: Exceptionally high entropy for plaintext. Strongly indicates obfuscated malware or encrypted payload blob.');
            isTampered = true;
        } else if (entropy > 7.9) {
            flags.push('INFO: Extremely high entropy near theoretical max (8.0). File is heavily packed or encrypted.');
        }

        return { flags, isTampered };
    }

    /**
     * Lightning-Fast extraction of internal metadata and security telemetry.
     * @param filePath Target file
     */
    public static async extractMetadata(filePath: string): Promise<FileMetadata> {
        const absolutePath = path.resolve(filePath);
        
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${absolutePath}`);
        }

        const stats = await fs.promises.stat(absolutePath);
        
        if (stats.isDirectory()) {
            throw new Error(`Path is a directory, not a file: ${absolutePath}`);
        }

        const { format, hex, buffer } = await this.identifySignature(absolutePath);
        const entropy = this.calculateEntropy(buffer);

        const metadata: Partial<FileMetadata> = {
            fileName: path.basename(absolutePath),
            extension: path.extname(absolutePath),
            absolutePath,
            sizeBytes: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            detectedFormat: format,
            magicBytes: hex.toUpperCase(),
            entropy: Number(entropy.toFixed(3))
        };

        const { flags, isTampered } = this.scanIntegrity(metadata);
        metadata.securityFlags = flags;
        metadata.isTampered = isTampered;

        return metadata as FileMetadata;
    }

    /**
     * Generates a structured ANSI terminal output table for beautiful CLI rendering.
     */
    public static formatAnsi(metadata: FileMetadata): string {
        let output = `\n${chalk.bgCyan.black.bold(' 🔍 High-Speed Deep Data Parser Report ')}\n\n`;
        output += `${chalk.bold('File:')}         ${chalk.white(metadata.fileName)}\n`;
        output += `${chalk.bold('Path:')}         ${chalk.gray(metadata.absolutePath)}\n`;
        output += `${chalk.bold('Size:')}         ${chalk.white((metadata.sizeBytes / 1024).toFixed(2) + ' KB')}\n`;
        output += `${chalk.bold('Created:')}      ${chalk.white(metadata.createdAt.toISOString())}\n`;
        output += `${chalk.bold('Modified:')}     ${chalk.white(metadata.modifiedAt.toISOString())}\n`;
        output += `${chalk.bold('Format:')}       ${chalk.yellow(metadata.detectedFormat)}\n`;
        output += `${chalk.bold('Magic Bytes:')}  0x${chalk.magenta(metadata.magicBytes)}\n`;
        
        // Heatmap coloring for entropy
        let entropyColor = chalk.green;
        if (metadata.entropy > 7.0) entropyColor = chalk.yellow;
        if (metadata.entropy > 7.5) entropyColor = chalk.red;
        
        output += `${chalk.bold('Entropy:')}      ${entropyColor(metadata.entropy + ' bits/byte')}\n`;

        if (metadata.securityFlags.length > 0) {
            output += `\n${chalk.red.bold('--- Security & Integrity Alerts ---')}\n`;
            metadata.securityFlags.forEach(flag => {
                output += `${chalk.red('⚠')} ${chalk.yellow(flag)}\n`;
            });
        } else {
            output += `\n${chalk.green.bold('--- Security Scanner ---')}\n`;
            output += `${chalk.green('✔')} No anomalies detected. Integrity verified.\n`;
        }

        output += `\n${chalk.cyan.bold('------------------------------------------')}\n`;
        return output;
    }
    
    /**
     * Generates JSON export format.
     */
    public static formatJson(metadata: FileMetadata): string {
        return JSON.stringify(metadata, null, 2);
    }
}

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import * as fs from 'fs';
import * as path from 'path';

const COPYRIGHT_HEADER = `/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */\n`;

function walkDir(dir: string, callback: (filePath: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function injectWatermark(directory: string) {
    let count = 0;
    walkDir(directory, (filePath: string) => {
        if (filePath.endsWith('.ts') && !filePath.includes('node_modules') && !filePath.endsWith('.d.ts')) {
            const content = fs.readFileSync(filePath, 'utf8');
            // Check if watermark is already present
            if (!content.includes('Project: g-coder CLI Tool')) {
                if (content.startsWith('#!')) {
                    const lines = content.split('\n');
                    const hashbang = lines.shift();
                    const newContent = `${hashbang}\n${COPYRIGHT_HEADER}${lines.join('\n')}`;
                    fs.writeFileSync(filePath, newContent);
                } else {
                    fs.writeFileSync(filePath, COPYRIGHT_HEADER + content);
                }
                count++;
            }
        }
    });
    console.log(`\n\x1b[32m✔ Automatically injected copyright watermark to ${count} files.\x1b[0m`);
}

const srcDir = path.resolve(__dirname, '..');
injectWatermark(srcDir);

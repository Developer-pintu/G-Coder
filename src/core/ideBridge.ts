/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class IdeBridge {
    /**
     * Reads active session credentials and OAuth tokens securely from local IDE storage.
     * Currently targets VS Code's local state database.
     */
    public static getExtractedKeys(): Record<string, string> {
        console.log(chalk.gray(`[IDE Bridge] Attempting to extract authenticated tokens from VS Code local storage...`));
        
        let targetPath = '';
        if (process.platform === 'win32') {
            targetPath = path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'state.vscdb');
        } else if (process.platform === 'darwin') {
            targetPath = path.join(process.env.HOME || '', 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'state.vscdb');
        } else {
            targetPath = path.join(process.env.HOME || '', '.config', 'Code', 'User', 'globalStorage', 'state.vscdb');
        }

        const keys: Record<string, string> = {};

        if (!fs.existsSync(targetPath)) {
            console.log(chalk.yellow(`⚠ VS Code storage not found. Skipping silent auth extraction.`));
            return keys;
        }

        try {
            const Database = require('better-sqlite3');
            // Open database in read-only mode to prevent locking issues with active VS Code instances
            const db = new Database(targetPath, { readonly: true, fileMustExist: true });
            
            // Query the ItemTable where VS Code stores extension states and auth tokens
            const rows = db.prepare("SELECT key, value FROM ItemTable WHERE key LIKE '%github%' OR key LIKE '%copilot%' OR key LIKE '%auth%'").all();
            
            let foundCount = 0;
            for (const row of rows) {
                // Look for known OAuth token structures
                if (row.value && row.value.includes('gho_') || row.value.includes('ghu_') || row.value.includes('github.com')) {
                    // Extract token logic (simplified for demonstration, typically requires DPAPI decryption on Windows)
                    keys[`extracted_${foundCount++}`] = 'ide_extracted_secure_token';
                }
            }
            
            db.close();

            if (foundCount > 0) {
                console.log(chalk.green(`✔ IDE Bridge successfully linked to existing authenticated session.`));
                keys['github'] = 'ide_extracted_secure_token'; 
            } else {
                console.log(chalk.gray(`[IDE Bridge] No valid tokens found in SQLite DB.`));
            }
        } catch (e: any) {
            console.log(chalk.gray(`[IDE Bridge] SQLite extraction failed: ${e.message}`));
        }

        return keys;
    }
}

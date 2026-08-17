import fse from 'fs-extra';
import path from 'path';
export interface PatchValidation { valid: boolean; reason: string; changedCharacters: number; }
export class PatchValidator {
    constructor(private readonly workspace: string = process.cwd(), private readonly maxChangedCharacters = 250_000) {}
    public validate(file: string, patch: string): PatchValidation {
        const absolute = path.resolve(this.workspace, file); const relation = path.relative(this.workspace, absolute);
        if (relation.startsWith('..') || path.isAbsolute(relation)) return { valid: false, reason: 'Target escapes workspace.', changedCharacters: 0 };
        if (!fse.existsSync(absolute)) return { valid: false, reason: 'Target does not exist.', changedCharacters: 0 };
        const content = fse.readFileSync(absolute, 'utf8'); const regex = /<<SEARCH>>\n([\s\S]*?)\n<<REPLACE>>\n([\s\S]*?)\n<<END>>/g;
        let match: RegExpExecArray | null; let changed = 0; let blocks = 0;
        while ((match = regex.exec(patch))) { blocks++; const occurrences = content.split(match[1]).length - 1; if (occurrences !== 1) return { valid: false, reason: `SEARCH block must match exactly once; found ${occurrences}.`, changedCharacters: changed }; changed += match[1].length + match[2].length; }
        if (blocks === 0) return { valid: false, reason: 'No valid patch blocks found.', changedCharacters: 0 };
        if (changed > this.maxChangedCharacters) return { valid: false, reason: 'Patch exceeds the configured size policy.', changedCharacters: changed };
        if (/\b(?:api[_-]?key|password|secret)\s*[:=]\s*['"][^'"]{8,}/i.test(patch)) return { valid: false, reason: 'Patch appears to introduce a credential.', changedCharacters: changed };
        return { valid: true, reason: 'Patch passed containment, uniqueness, size, and secret checks.', changedCharacters: changed };
    }
}

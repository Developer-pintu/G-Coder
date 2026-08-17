import * as fse from 'fs-extra';
import * as path from 'path';

export interface ProjectConfig {
    provider?: string;
    permission?: string;
    maxRequests?: number;
    maxCost?: number;
    sandbox?: boolean;
    dryRun?: boolean;
    noHeal?: boolean;
    nonInteractive?: boolean;
}

export const loadProjectConfig = (): ProjectConfig => {
    try {
        const configPath = path.join(process.cwd(), 'g-coder.config.json');
        if (fse.existsSync(configPath)) {
            const content = fse.readFileSync(configPath, 'utf8');
            return JSON.parse(content) as ProjectConfig;
        }
    } catch (e) {
        // Silently fallback if the JSON is malformed or permission issues occur
    }
    return {};
};

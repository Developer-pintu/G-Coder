import fse from 'fs-extra';
import path from 'path';
export interface PluginManifest { name: string; version: string; main: string; permissions: string[]; }
export class PluginManager {
    public inspect(pluginDirectory: string): PluginManifest {
        const root = path.resolve(pluginDirectory); const file = path.join(root, 'g-coder-plugin.json');
        if (!fse.existsSync(file)) throw new Error('Plugin manifest not found.');
        const manifest = fse.readJsonSync(file) as PluginManifest;
        if (!/^[a-z][a-z0-9-]{1,63}$/i.test(manifest.name) || !/^\d+\.\d+\.\d+/.test(manifest.version)) throw new Error('Invalid plugin identity.');
        const main = path.resolve(root, manifest.main); const relation = path.relative(root, main);
        if (relation.startsWith('..') || path.isAbsolute(relation) || !fse.existsSync(main)) throw new Error('Plugin entrypoint escapes its directory or is missing.');
        if (!Array.isArray(manifest.permissions) || manifest.permissions.some(value => !['workspace:read', 'workspace:write', 'network', 'tools'].includes(value))) throw new Error('Plugin requests an unsupported permission.');
        return manifest;
    }
}

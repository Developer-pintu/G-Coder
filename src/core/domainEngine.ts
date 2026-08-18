/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
export enum Domain {
    Mobile = 'Mobile',
    Web = 'Web',
    Systems = 'Systems',
    CyberSecurity = 'CyberSecurity',
    Backend = 'Backend',
    Unknown = 'Unknown'
}

export interface ScaffoldConfig {
    directoryStructure: string[];
    configFiles: Record<string, string>;
    techStack: string[];
    primaryLanguage: string;
}

export class DomainEngine {
    private static readonly KEYWORDS: Record<Domain, string[]> = {
        [Domain.Mobile]: ['android', 'ios', 'react native', 'flutter', 'swift', 'kotlin', 'mobile app', 'apk', 'ipa'],
        [Domain.Web]: ['react', 'vue', 'angular', 'nextjs', 'next.js', 'frontend', 'html', 'css', 'tailwind', 'vite', 'web app'],
        [Domain.Systems]: ['rust', 'c++', 'c', 'antivirus', 'kernel', 'os', 'driver', 'low-level', 'memory management', 'systems programming'],
        [Domain.CyberSecurity]: ['penetration', 'pen-test', 'exploit', 'malware', 'security', 'nmap', 'wireshark', 'cyber', 'vulnerability', 'payload'],
        [Domain.Backend]: ['node', 'express', 'python', 'django', 'fastapi', 'flask', 'go', 'golang', 'spring boot', 'java', 'backend', 'api', 'database', 'sql', 'mongodb'],
        [Domain.Unknown]: []
    };

    /**
     * Instantly analyzes the user's natural language prompt to detect the domain.
     * Uses keyword heuristics for zero-latency classification.
     */
    public static classifyIntent(prompt: string): Domain {
        const lowerPrompt = prompt.toLowerCase();
        
        const scores: Record<Domain, number> = {
            [Domain.Mobile]: 0,
            [Domain.Web]: 0,
            [Domain.Systems]: 0,
            [Domain.CyberSecurity]: 0,
            [Domain.Backend]: 0,
            [Domain.Unknown]: 0
        };

        for (const [domain, keywords] of Object.entries(this.KEYWORDS)) {
            const domainKey = domain as Domain;
            if (domainKey === Domain.Unknown) continue;
            
            for (const keyword of keywords) {
                // Use word boundaries if the keyword is alphanumeric
                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
                const matches = lowerPrompt.match(regex);
                if (matches) {
                    scores[domainKey] += matches.length;
                }
            }
        }

        let maxScore = 0;
        let detectedDomain: Domain = Domain.Unknown;

        for (const [domain, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedDomain = domain as Domain;
            }
        }

        return detectedDomain;
    }

    /**
     * Intelligently scaffolds the ideal project directory structure, config files,
     * and tech stack based on the classified domain.
     */
    public static getScaffoldConfig(domain: Domain): ScaffoldConfig {
        switch (domain) {
            case Domain.Mobile:
                return {
                    directoryStructure: ['src', 'src/components', 'src/screens', 'src/navigation', 'android', 'ios', 'assets'],
                    configFiles: {
                        'package.json': '{\n  "name": "mobile-app"\n}',
                        'app.json': '{\n  "name": "mobile-app",\n  "displayName": "Mobile App"\n}'
                    },
                    techStack: ['React Native', 'Expo', 'TypeScript'],
                    primaryLanguage: 'TypeScript'
                };
            case Domain.Web:
                return {
                    directoryStructure: ['src', 'src/components', 'src/pages', 'src/styles', 'public'],
                    configFiles: {
                        'package.json': '{\n  "name": "web-app"\n}',
                        'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head><title>Web App</title></head>\n<body><div id="root"></div></body>\n</html>'
                    },
                    techStack: ['React', 'Vite', 'TailwindCSS', 'TypeScript'],
                    primaryLanguage: 'TypeScript'
                };
            case Domain.Systems:
                return {
                    directoryStructure: ['src', 'tests', 'benches'],
                    configFiles: {
                        'Cargo.toml': '[package]\nname = "systems-tool"\nversion = "0.1.0"\nedition = "2021"'
                    },
                    techStack: ['Rust', 'Cargo'],
                    primaryLanguage: 'Rust'
                };
            case Domain.CyberSecurity:
                return {
                    directoryStructure: ['scripts', 'payloads', 'modules', 'tests'],
                    configFiles: {
                        'requirements.txt': 'requests\nbeautifulsoup4\nimpacket',
                        'setup.py': 'from setuptools import setup\n\nsetup(name="cyber-tool")'
                    },
                    techStack: ['Python', 'Bash'],
                    primaryLanguage: 'Python'
                };
            case Domain.Backend:
                return {
                    directoryStructure: ['src', 'src/controllers', 'src/models', 'src/routes', 'src/middleware', 'tests'],
                    configFiles: {
                        'package.json': '{\n  "name": "backend-api"\n}',
                        'tsconfig.json': '{\n  "compilerOptions": { "target": "es2022", "module": "commonjs" }\n}'
                    },
                    techStack: ['Node.js', 'Express', 'TypeScript', 'MongoDB / PostgreSQL'],
                    primaryLanguage: 'TypeScript'
                };
            case Domain.Unknown:
            default:
                return {
                    directoryStructure: ['src', 'tests'],
                    configFiles: {
                        'package.json': '{\n  "name": "generic-project"\n}'
                    },
                    techStack: ['Node.js', 'TypeScript'],
                    primaryLanguage: 'TypeScript'
                };
        }
    }
}

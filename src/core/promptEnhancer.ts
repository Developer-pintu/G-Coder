import chalk from 'chalk';

export interface EnhancedPrompt {
    original: string;
    enhanced: string;
    detectedSignals: string[];
}

const PHRASE_TRANSLATIONS: Array<[RegExp, string]> = [
    [/\b(?:logn|loging|lgin)\b/gi, 'login'],
    [/\b(?:singup|signp)\b/gi, 'signup'],
    [/\bmujhe\b/gi, 'I need'],
    [/\b(?:bana|bnaa)\s*(?:do|de|dena|ado)\b/gi, 'build'],
    [/\bkar\s*(?:do|de|dena)\b/gi, 'implement'],
    [/\btheek\s*(?:karo|kar do)\b/gi, 'fix'],
    [/\bacha\s*(?:sa)?\b/gi, 'high-quality'],
    [/\bsundar\b/gi, 'visually polished'],
    [/\bjaldi\b/gi, 'efficiently'],
    [/\bpage\b/gi, 'page'],
    [/\blogin\b/gi, 'authentication login'],
    [/\bsignup\b/gi, 'user registration'],
    [/\bbackend\b/gi, 'backend API'],
    [/\bfrontend\b/gi, 'frontend application']
];

const normalizeRequest = (input: string): string => {
    let normalized = input.normalize('NFKC').replace(/\s+/g, ' ').trim();
    for (const [pattern, replacement] of PHRASE_TRANSLATIONS) {
        normalized = normalized.replace(pattern, replacement);
    }
    return normalized.replace(/\s+/g, ' ').trim();
};

const detectSignals = (request: string): string[] => {
    const signals: string[] = [];
    const checks: Array<[RegExp, string]> = [
        [/login|auth|sign[ -]?in|registration/i, 'authentication'],
        [/page|ui|screen|dashboard|form|frontend/i, 'user-interface'],
        [/api|backend|server|database|endpoint/i, 'backend'],
        [/mobile|responsive/i, 'responsive-design'],
        [/test|coverage|spec/i, 'testing'],
        [/secure|security|token|password/i, 'security']
    ];
    for (const [pattern, signal] of checks) {
        if (pattern.test(request)) signals.push(signal);
    }
    return signals;
};

export class PromptEnhancer {
    public enhance(input: string): EnhancedPrompt {
        const original = input.trim();
        if (!original) throw new Error('Cannot enhance an empty prompt.');

        console.log(chalk.magenta('🪄 [g-coder]: Enhancing prompt for AI execution...'));

        const request = normalizeRequest(original);
        const detectedSignals = detectSignals(request);
        const uiRequirements = detectedSignals.includes('user-interface')
            ? 'Define accessible, responsive UI components, loading/empty/error states, validation, and a cohesive visual hierarchy.'
            : 'Preserve the existing user experience unless UI changes are required by the request.';
        const backendRequirements = detectedSignals.includes('backend') || detectedSignals.includes('authentication')
            ? 'Define API contracts, data validation, persistence boundaries, authentication/authorization, and safe error handling where applicable.'
            : 'Do not introduce a backend or database unless the requirements genuinely need one.';

        const enhanced = [
            'Act as a principal software engineer and implement the following request:',
            `"${request}"`,
            '',
            'Engineering requirements:',
            '- Inspect the existing repository and follow its established architecture, language, framework, dependencies, and conventions; do not invent a replacement stack.',
            '- For a greenfield project only, select and state a cohesive, maintainable technology stack justified by the functional and deployment requirements.',
            `- ${uiRequirements}`,
            `- ${backendRequirements}`,
            '- Produce complete, production-grade code with explicit types, secure defaults, edge-case handling, and no placeholders.',
            '- Keep changes minimal and modular, preserve backward compatibility, and avoid unrelated refactors.',
            '- Add or update focused tests and run the project\'s available build, lint, type-check, and test commands.',
            '- Summarize changed files, key decisions, and verification results when complete.'
        ].join('\n');

        return { original, enhanced, detectedSignals };
    }
}

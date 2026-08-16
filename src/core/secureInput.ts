import inquirer from 'inquirer';

export interface SecureInputOptions {
    mask?: string | boolean;
    allowEmpty?: boolean;
    validate?: (value: string) => boolean | string;
}

/**
 * Reads a secret using Inquirer's cross-platform password prompt. The value is
 * never printed, logged, or retained by this module after it is returned.
 */
export const readSecureInput = async (
    message: string,
    options: SecureInputOptions = {}
): Promise<string> => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error('Secure input requires an interactive terminal (TTY).');
    }

    const { secret } = await inquirer.prompt<{ secret: string }>([{
        type: 'password',
        name: 'secret',
        message,
        mask: options.mask ?? '*',
        validate: (value: string) => {
            const normalized = value.trim();
            if (!options.allowEmpty && normalized.length === 0) {
                return 'A value is required.';
            }
            return options.validate?.(normalized) ?? true;
        }
    }]);

    return secret.trim();
};

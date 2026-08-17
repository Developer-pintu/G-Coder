import inquirer from 'inquirer';
import chalk from 'chalk';

export const readSecureInput = async (message: string, _opts?: any): Promise<string> => {
    const answers = await inquirer.prompt([
        {
            type: 'password',
            name: 'secret',
            message: chalk.cyan(message),
            mask: '*'
        }
    ]);
    return answers.secret;
};

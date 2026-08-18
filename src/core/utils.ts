/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * A highly user-friendly, case-insensitive confirmation prompt.
 * Accepts y, yes, Y, YES, yEs as true.
 * Accepts n, no, N, NO as false.
 * Reprompts on invalid input.
 */
export const confirmAction = async (message: string): Promise<boolean> => {
    while (true) {
        const { answer } = await inquirer.prompt([{
            type: 'input',
            name: 'answer',
            message: `${message} (y/n):`
        }]);

        const normalized = answer.trim().toLowerCase();

        if (normalized === 'y' || normalized === 'yes') {
            return true;
        } else if (normalized === 'n' || normalized === 'no' || normalized === '') {
            return false; // Defaulting empty enter to No for safety
        } else {
            console.log(chalk.yellow(`  Invalid input "${answer}". Please type 'y' for yes, or 'n' for no.`));
        }
    }
};

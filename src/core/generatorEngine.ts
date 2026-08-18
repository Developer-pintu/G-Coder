/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { Domain, ScaffoldConfig } from './domainEngine';

export class GeneratorEngine {
    private targetDir: string;

    constructor(targetDir: string) {
        this.targetDir = path.resolve(targetDir);
    }

    /**
     * Core method to generate a production-ready codebase down to the architectural core.
     * Integrates advanced UI/UX & Security based on domain.
     */
    public async generateProject(domain: Domain, config: ScaffoldConfig): Promise<void> {
        console.log(chalk.blue(`\n🏗️  [g-coder]: Scaffolding core architecture for domain: ${domain}`));
        
        try {
            // 1. Create Directory Structure
            await this.createDirectories(config.directoryStructure);

            // 2. Write Config Files
            await this.writeConfigFiles(config.configFiles);

            // 3. Generate Domain-Specific Core Logic
            await this.generateDomainCore(domain);

            console.log(chalk.green(`\n✅ [g-coder]: Project generation complete in ${this.targetDir}`));
        } catch (error: any) {
            console.error(chalk.red(`\n❌ [g-coder]: Generation failed: ${error.message}`));
            throw error;
        }
    }

    private async createDirectories(dirs: string[]): Promise<void> {
        for (const dir of dirs) {
            const fullPath = path.join(this.targetDir, dir);
            await fs.ensureDir(fullPath);
            console.log(chalk.dim(`Created directory: ${dir}`));
        }
    }

    private async writeConfigFiles(files: Record<string, string>): Promise<void> {
        for (const [filename, content] of Object.entries(files)) {
            const fullPath = path.join(this.targetDir, filename);
            await fs.outputFile(fullPath, content);
            console.log(chalk.dim(`Created file: ${filename}`));
        }
    }

    private async generateDomainCore(domain: Domain): Promise<void> {
        switch (domain) {
            case Domain.Backend:
                await this.generateSecureBackend();
                break;
            case Domain.Web:
                await this.generateAdvancedFrontend();
                break;
            case Domain.Mobile:
                await this.generateMobileApp();
                break;
            case Domain.CyberSecurity:
            case Domain.Systems:
                await this.generateBulletproofSystemTool(domain);
                break;
            default:
                console.log(chalk.dim(`No specialized core logic applied for domain: ${domain}`));
                break;
        }
    }

    private async generateSecureBackend(): Promise<void> {
        console.log(chalk.magenta(`🔒 Injecting secure authentication/login/registration flows (JWT/bcrypt)...`));
        const authContent = `
// Core Security Middleware
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const hashPassword = async (password: string) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

export const verifyToken = (req: any, res: any, next: any) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const verified = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'fallback-secret');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};
`;
        await fs.outputFile(path.join(this.targetDir, 'src/middleware/auth.ts'), authContent.trim());
    }

    private async generateAdvancedFrontend(): Promise<void> {
        console.log(chalk.magenta(`✨ Injecting advanced UI/UX components (Framer Motion animations)...`));
        const componentContent = `
import React from 'react';
import { motion } from 'framer-motion';

export const FadeInContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-4xl mx-auto p-4"
        >
            {children}
        </motion.div>
    );
};
`;
        await fs.outputFile(path.join(this.targetDir, 'src/components/FadeInContainer.tsx'), componentContent.trim());
    }

    private async generateMobileApp(): Promise<void> {
        console.log(chalk.magenta(`📱 Injecting robust mobile architectures and native animation structures...`));
        const mobileContent = `
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export const AnimatedCard = () => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    return (
        <Animated.View style={{ ...styles.card, opacity: fadeAnim }}>
            <Text style={styles.text}>Welcome to Mobile App</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: { padding: 20, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    text: { fontSize: 18, fontWeight: 'bold' }
});
`;
        await fs.outputFile(path.join(this.targetDir, 'src/components/AnimatedCard.tsx'), mobileContent.trim());
    }

    private async generateBulletproofSystemTool(domain: Domain): Promise<void> {
        console.log(chalk.magenta(`🛡️ Injecting low-level strict input sanitization and secure error boundaries for ${domain}...`));
        const ext = domain === Domain.Systems ? 'rs' : 'py';
        const file = domain === Domain.Systems ? 'src/main.rs' : 'scripts/main.py';
        
        let content = '';
        if (domain === Domain.Systems) {
            content = `
// Bulletproof Memory-Safe Entry Point
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    
    // Strict input validation
    if args.len() < 2 {
        eprintln!("Usage: {} <target>", args[0]);
        std::process::exit(1);
    }

    let target = &args[1];
    if !target.chars().all(char::is_alphanumeric) {
        eprintln!("Error: Target contains invalid characters. Sanitization failed.");
        std::process::exit(1);
    }

    println!("Executing securely against target: {}", target);
    Ok(())
}
`;
        } else {
            content = `
# Secure entry point with robust error handling
import sys
import re

def sanitize_input(user_input: str) -> str:
    # Strict regex to prevent injection
    if not re.match(r'^[a-zA-Z0-9_.-]+$', user_input):
        raise ValueError("Invalid characters detected in input.")
    return user_input

def main():
    try:
        if len(sys.argv) < 2:
            print(f"Usage: {sys.argv[0]} <target>")
            sys.exit(1)
            
        target = sanitize_input(sys.argv[1])
        print(f"Executing securely against target: {target}")
    except ValueError as e:
        print(f"SECURITY ALERT: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"UNHANDLED EXCEPTION: {e}")
        sys.exit(2)

if __name__ == "__main__":
    main()
`;
        }
        await fs.outputFile(path.join(this.targetDir, file), content.trim());
    }
}

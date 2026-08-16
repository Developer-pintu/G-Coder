import puppeteer from 'puppeteer';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';

export class PreviewEngine {
    private server: http.Server | null = null;
    private port = 0;

    public async capturePreview(target: string) {
        console.log(chalk.magenta.bold(`\n📸 Initializing Visual Preview Engine...`));

        let url = target;
        let isLocalDir = false;

        // If target is a directory containing index.html, start a local server
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
            const indexPath = path.join(target, 'index.html');
            if (fs.existsSync(indexPath)) {
                isLocalDir = true;
                const spinner = ora('Starting lightweight local static server...').start();
                try {
                    this.port = await this.startStaticServer(target);
                    url = `http://localhost:${this.port}`;
                    spinner.succeed(`Static server running at ${url}`);
                } catch (err: any) {
                    spinner.fail(`Failed to start local server: ${err.message}`);
                    return;
                }
            } else {
                console.log(chalk.yellow(`No index.html found in ${target}. Cannot generate preview.`));
                return;
            }
        }

        const spinner = ora(`Launching headless browser and navigating to ${chalk.white(url)}...`).start();
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            // Set standard desktop viewport
            await page.setViewport({ width: 1280, height: 800 });

            // Go to URL and wait until network is idle
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            const screenshotPath = isLocalDir 
                ? path.join(target, 'preview-screenshot.png') 
                : path.join(process.cwd(), 'preview-screenshot.png');

            await page.screenshot({ path: screenshotPath, fullPage: true });
            await browser.close();

            spinner.succeed(`Screenshot captured successfully: ${chalk.green(screenshotPath)}`);

        } catch (error: any) {
            spinner.fail(`Failed to capture screenshot: ${error.message}`);
        } finally {
            if (this.server) {
                this.server.close();
                console.log(chalk.gray('Local static server stopped.'));
            }
        }
    }

    private startStaticServer(dir: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                let reqPath = req.url === '/' ? '/index.html' : req.url;
                
                // Secure against directory traversal
                const safeSuffix = reqPath ? reqPath.replace(/^\/+/, '') : '';
                const filePath = path.resolve(dir, safeSuffix);
                
                // Ensure the resolved path strictly starts with the base directory
                if (!filePath.startsWith(path.resolve(dir))) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }
                
                const extname = String(path.extname(filePath)).toLowerCase();
                const mimeTypes: Record<string, string> = {
                    '.html': 'text/html',
                    '.js': 'text/javascript',
                    '.css': 'text/css',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml'
                };

                const contentType = mimeTypes[extname] || 'application/octet-stream';

                fs.readFile(filePath, (error, content) => {
                    if (error) {
                        if (error.code == 'ENOENT') {
                            res.writeHead(404);
                            res.end('File Not Found');
                        } else {
                            res.writeHead(500);
                            res.end('Server Error: ' + error.code);
                        }
                    } else {
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(content, 'utf-8');
                    }
                });
            });

            this.server.on('error', reject);

            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server?.address();
                if (address && typeof address !== 'string') {
                    resolve(address.port);
                } else {
                    reject(new Error('Could not determine port'));
                }
            });
        });
    }
}

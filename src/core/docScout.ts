import puppeteer from 'puppeteer';
import chalk from 'chalk';

export class DocScout {
    /**
     * Autonomously browses a URL, extracts textual content, and returns it.
     * Useful for fetching real-time documentation or context.
     * @param url The target documentation URL to scrape.
     */
    public async scrapeDocs(url: string): Promise<string> {
        console.log(chalk.cyan(`\n🌐 [DocScout] Launching headless browser to scout: ${url}`));
        
        let browser;
        try {
            browser = await puppeteer.launch({ 
                headless: true, 
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // Set a user agent to prevent being blocked by basic bot protections
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
            
            console.log(chalk.dim(`[DocScout] Navigating...`));
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            console.log(chalk.dim(`[DocScout] Extracting text content...`));
            
            // Extract meaningful text, stripping out scripts, styles, and navigation
            const textContent = await page.evaluate(() => {
                const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header, noscript, iframe');
                elementsToRemove.forEach(el => el.remove());
                
                // Prioritize main, article, or fallback to body
                const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
                
                return mainContent ? mainContent.innerText : '';
            });
            
            const cleanedText = textContent.replace(/\s+/g, ' ').trim();
            console.log(chalk.green(`✅ [DocScout] Successfully extracted ${cleanedText.length} characters of context.`));
            
            return cleanedText.length > 50000 ? cleanedText.substring(0, 50000) : cleanedText; // Limit size to prevent context overflow

        } catch (error: any) {
            console.error(chalk.red(`❌ [DocScout] Failed to scrape documentation: ${error.message}`));
            return `[Failed to scrape ${url}]: ${error.message}`;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

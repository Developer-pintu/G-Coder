/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */

import puppeteer from 'puppeteer';
import chalk from 'chalk';
import ora from 'ora';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

export class WebSearchEngine {
    /**
     * Dynamically retrieves search results from the web using headless browsing.
     * @param query The search query
     * @returns A list of top search results
     */
    static async search(query: string): Promise<SearchResult[]> {
        const spinner = ora(`Searching the web for "${query}"...`).start();
        const results: SearchResult[] = [];
        
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // Set realistic User-Agent to avoid immediate blocks
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

            // Using DuckDuckGo HTML version for lightweight scraping without heavy JS execution
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Extract results
            const extractedResults = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('.result__body'));
                return links.slice(0, 5).map(link => {
                    const titleElement = link.querySelector('.result__title .result__a');
                    const snippetElement = link.querySelector('.result__snippet');
                    const urlElement = titleElement as HTMLAnchorElement;
                    
                    return {
                        title: titleElement ? titleElement.textContent?.trim() || '' : '',
                        url: urlElement ? urlElement.href : '',
                        snippet: snippetElement ? snippetElement.textContent?.trim() || '' : ''
                    };
                }).filter(r => r.title && r.url);
            });

            await browser.close();
            
            results.push(...extractedResults);
            spinner.succeed(chalk.green(`Successfully retrieved ${results.length} fresh results from the web.`));
        } catch (error: any) {
            spinner.fail(chalk.red(`Web search failed: ${error.message}`));
        }
        
        return results;
    }

    /**
     * Parses, cleans, and extracts main text content from a given URL to be fed into LLM context.
     * @param url The target URL to read
     * @returns The cleaned text content
     */
    static async extractContent(url: string): Promise<string> {
        const spinner = ora(`Extracting clean data from ${url}...`).start();
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Strip unnecessary heavy elements (ads, navbars, scripts, styles)
            const content = await page.evaluate(() => {
                const selectorsToRemove = ['nav', 'header', 'footer', 'script', 'style', 'noscript', 'iframe', 'svg', '.ad', '.ads', '.sidebar'];
                selectorsToRemove.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });
                
                // Try to find the main article container, fallback to body
                const main = document.querySelector('article') || document.querySelector('main') || document.body;
                
                // Basic cleanup of multiple empty lines
                return main.innerText.replace(/\n\s*\n/g, '\n').substring(0, 15000); // Limit to ~15k chars for token safety
            });

            await browser.close();
            spinner.succeed(chalk.green(`Extracted and cleaned content from URL.`));
            return content;
        } catch (error: any) {
            spinner.fail(chalk.red(`Failed to extract content: ${error.message}`));
            return '';
        }
    }

    /**
     * Feeds the fresh context to the LLM by synthesizing it into a structured prompt block.
     * @param query Original user query
     * @param results Parsed search results
     * @param fullContent Optional deep dive content from a specific URL
     * @returns Formatted RAG context string ready for LLM consumption
     */
    static buildRagContext(query: string, results: SearchResult[], fullContent?: string): string {
        let contextBlock = `\n--- [LIVE WEB RAG CONTEXT] ---\n`;
        contextBlock += `User Query: "${query}"\n\n`;
        contextBlock += `Search Results Summary:\n`;
        
        results.forEach((r, idx) => {
            contextBlock += `${idx + 1}. ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}\n\n`;
        });

        if (fullContent) {
            contextBlock += `[DEEP DIVE EXTRACTED CONTENT]\n`;
            contextBlock += `${fullContent}\n\n`;
        }

        contextBlock += `INSTRUCTIONS FOR LLM:\n`;
        contextBlock += `Use the above real-time data to answer the user's query accurately. Do not make up information if it is not present in the context.`;
        contextBlock += `\n------------------------------\n`;
        
        return contextBlock;
    }
}

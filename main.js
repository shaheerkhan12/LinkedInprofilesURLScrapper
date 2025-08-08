const { Actor } = require('apify');
const puppeteer = require('puppeteer');

Actor.main(async () => {
    // Get input data from Apify console
    const input = await Actor.getInput();
    
    // Validate input
    const {
        profession = 'software engineer',
        country = 'United States',
        maxPages = 10,
        delayMs = 2000
    } = input;

    console.log('Starting LinkedIn Profile Scraper', {
        profession,
        country,
        maxPages,
        delayMs
    });

    const foundUrls = new Set();
    const query = `site:linkedin.com/in "${profession}" "${country}"`;
    
    console.log(`Search query: ${query}`);

    // Launch browser with better stealth configuration (matching the working version)
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new', // Use the new headless mode like the working version
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--window-size=1920,1080',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });
    } catch (error) {
        console.error('Failed to launch browser:', error);
        throw error;
    }

    try {
        const page = await browser.newPage();
        
        // Set viewport to match window size
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Enhanced stealth configurations (matching the working version)
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });
        
        // Override the navigator.plugins property to use a custom getter
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
        });
        
        // Override the navigator.languages property to use a custom getter
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });
        
        // Set realistic user agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Add extra headers (enhanced version from working function)
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        });

        // Delay function
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Crawl multiple pages
        for (let pageNum = 0; pageNum < maxPages; pageNum++) {
            const start = pageNum * 10;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}`;
            
            console.log(`\n=== Crawling page ${pageNum + 1}/${maxPages} ===`);
            console.log(`URL: ${searchUrl}`);
            
            try {
                // Navigate to Google search with more realistic behavior (matching working version)
                console.log('Navigating to Google...');
                
                // First visit Google homepage to establish session
                if (pageNum === 0) {
                    await page.goto('https://www.google.com', { 
                        waitUntil: 'networkidle0',
                        timeout: 40000 
                    });
                    await delay(1000);
                }
                
                await page.goto(searchUrl, { 
                    waitUntil: 'networkidle0',
                    timeout: 40000 
                });

                // Wait for search results to load
                await page.waitForSelector('#search', { timeout: 10000 }).catch(() => {
                    console.log('Search results container not found, continuing...');
                });

                // Wait a bit more for dynamic content
                await delay(3000);

                // Check page content for debugging (from working version)
                const pageContent = await page.content();
                const hasSearchResults = pageContent.includes('search') && pageContent.length > 5000;
                
                if (!hasSearchResults) {
                    console.log('⚠️  Page seems to have minimal content, might be blocked');
                    console.log(`Page content length: ${pageContent.length}`);
                }

                // Extract LinkedIn URLs from the page (enhanced version from working function)
                console.log('Extracting LinkedIn URLs...');
                
                const pageUrls = await page.evaluate(() => {
                    const selectors = [
                        'a[href*="linkedin.com/in/"]',
                        'a[href*="/url?q="]',
                        'h3 a',
                        '.g a',
                        '.yuRUbf a'
                    ];
                    
                    const allLinks = [];
                    selectors.forEach(selector => {
                        const links = Array.from(document.querySelectorAll(selector));
                        allLinks.push(...links);
                    });
                    
                    const urls = [];
                    const processedUrls = new Set();
                    
                    allLinks.forEach(link => {
                        let href = link.href;
                        
                        if (!href) return;
                        
                        // Handle Google redirect URLs
                        if (href.includes('/url?q=')) {
                            const urlMatch = href.match(/\/url\?q=([^&]+)/);
                            if (urlMatch) {
                                href = decodeURIComponent(urlMatch[1]);
                            }
                        }
                        
                        // Check if it's a LinkedIn profile URL
                        if (href.includes('linkedin.com/in/') && 
                            !href.includes('/overlay/') && 
                            !href.includes('/company/')) {
                            const cleanUrl = href.split('?')[0].split('#')[0];
                            if (!processedUrls.has(cleanUrl)) {
                                urls.push(cleanUrl);
                                processedUrls.add(cleanUrl);
                            }
                        }
                    });
                    
                    return urls;
                });

                // Also search in page source for any missed URLs (from working version)
                const content = await page.content();
                const linkedinRegex = /https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/g;
                const regexMatches = content.match(linkedinRegex) || [];
                
                // Combine both methods
                const allUrls = [...pageUrls, ...regexMatches];
                const uniquePageUrls = [...new Set(allUrls)];
                
                console.log(`Found ${uniquePageUrls.length} LinkedIn URLs on this page:`);
                uniquePageUrls.forEach((url, index) => {
                    console.log(`  ${index + 1}. ${url}`);
                });
                
                // Save each URL to dataset
                for (const url of uniquePageUrls) {
                    if (!foundUrls.has(url)) {
                        foundUrls.add(url);
                        
                        // Save to Apify dataset
                        await Actor.pushData({
                            url,
                            profession,
                            country,
                            foundOnPage: pageNum + 1,
                            timestamp: new Date().toISOString()
                        });
                        
                        console.log(`Added profile: ${url}`);
                    }
                }

                // Check if there are more pages available (from working version)
                const hasNextPage = await page.evaluate(() => {
                    const nextButton = document.querySelector('a[aria-label="Next page"]') || 
                                     document.querySelector('a#pnnext') ||
                                     document.querySelector('td.b a');
                    return !!nextButton;
                });

                console.log(`Total unique URLs found so far: ${foundUrls.size}`);
                console.log(`Has next page: ${hasNextPage}`);

                if (!hasNextPage && pageNum < maxPages - 1) {
                    console.log('⚠️  No more pages available, stopping early');
                    break;
                }
                
                // Add delay between requests
                if (pageNum < maxPages - 1) {
                    console.log(`Waiting ${delayMs}ms before next request...`);
                    await delay(delayMs);
                }

            } catch (error) {
                console.error(`❌ Error on page ${pageNum + 1}:`, error.message);
                
                // Take screenshot for debugging (save to Apify key-value store)
                try {
                    const screenshot = await page.screenshot({ 
                        fullPage: true,
                        type: 'png'
                    });
                    const key = `error-page-${pageNum + 1}.png`;
                    await Actor.setValue(key, screenshot, { contentType: 'image/png' });
                    console.log(`Screenshot saved: ${key}`);
                } catch (screenshotError) {
                    console.error('Could not take screenshot:', screenshotError.message);
                }
                
                // Wait longer on error
                await delay(delayMs * 2);
            }
        }

        console.log(`\n🎉 Crawling completed! Found ${foundUrls.size} unique LinkedIn profiles.`);
        
        // Save summary to key-value store
        await Actor.setValue('SUMMARY', {
            totalProfiles: foundUrls.size,
            profession,
            country,
            maxPages,
            completedAt: new Date().toISOString(),
            profiles: Array.from(foundUrls)
        });

    } catch (error) {
        console.error('❌ Crawling failed:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});
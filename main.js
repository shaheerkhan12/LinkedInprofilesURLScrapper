const Apify = require('apify');
const { log } = Apify.utils;

Apify.main(async () => {
    // Get input data from Apify console
    const input = await Apify.getInput();
    
    // Validate input
    const {
        profession = 'software engineer',
        country = 'United States',
        maxPages = 10,
        delayMs = 2000,
        useApifyProxy = true,
        proxyGroup = 'RESIDENTIAL'
    } = input;

    log.info('Starting LinkedIn Profile Scraper', {
        profession,
        country,
        maxPages,
        delayMs,
        useApifyProxy,
        proxyGroup
    });

    // Initialize dataset to store results
    const dataset = await Apify.openDataset();
    
    // Set up proxy configuration
    const proxyConfig = useApifyProxy ? await Apify.createProxyConfiguration({
        groups: [proxyGroup],
        useApifyProxy: true
    }) : undefined;

    // Launch Puppeteer with Apify configuration
    const browser = await Apify.launchPuppeteer({
        proxyConfiguration: proxyConfig,
        useChrome: true,
        launchOptions: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--window-size=1920,1080'
            ]
        }
    });

    const foundUrls = new Set();
    const query = `site:linkedin.com/in "${profession}" "${country}"`;
    
    log.info(`Search query: ${query}`);

    try {
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Stealth configurations
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });
        
        // Set realistic user agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Add extra headers for more realistic requests
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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

        // Crawl multiple pages
        for (let pageNum = 0; pageNum < maxPages; pageNum++) {
            const start = pageNum * 10;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}`;
            
            log.info(`Crawling page ${pageNum + 1}/${maxPages}`, { url: searchUrl });
            
            try {
                // First visit to establish session
                if (pageNum === 0) {
                    await page.goto('https://www.google.com', { 
                        waitUntil: 'networkidle0',
                        timeout: 40000 
                    });
                    await Apify.utils.sleep(1000);
                }
                
                // Navigate to search page
                await page.goto(searchUrl, { 
                    waitUntil: 'networkidle0',
                    timeout: 40000 
                });

                // Wait for search results
                await page.waitForSelector('#search', { timeout: 10000 }).catch(() => {
                    log.warning('Search results container not found, continuing...');
                });

                await Apify.utils.sleep(3000);

                // Extract LinkedIn URLs from the page
                log.info('Extracting LinkedIn URLs...');
                
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

                // Also search in page source for missed URLs
                const content = await page.content();
                const linkedinRegex = /https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/g;
                const regexMatches = content.match(linkedinRegex) || [];
                
                // Combine and deduplicate
                const allUrls = [...pageUrls, ...regexMatches];
                const uniquePageUrls = [...new Set(allUrls)];
                
                log.info(`Found ${uniquePageUrls.length} LinkedIn URLs on page ${pageNum + 1}`);
                
                // Save each URL to dataset
                for (const url of uniquePageUrls) {
                    if (!foundUrls.has(url)) {
                        foundUrls.add(url);
                        
                        // Save to Apify dataset
                        await dataset.pushData({
                            url,
                            profession,
                            country,
                            foundOnPage: pageNum + 1,
                            timestamp: new Date().toISOString()
                        });
                        
                        log.info(`Added profile: ${url}`);
                    }
                }

                // Check if there are more pages
                const hasNextPage = await page.evaluate(() => {
                    const nextButton = document.querySelector('a[aria-label="Next page"]') || 
                                     document.querySelector('a#pnnext') ||
                                     document.querySelector('td.b a');
                    return !!nextButton;
                });

                log.info(`Total unique URLs found: ${foundUrls.size}, Has next page: ${hasNextPage}`);

                if (!hasNextPage && pageNum < maxPages - 1) {
                    log.info('No more pages available, stopping early');
                    break;
                }
                
                // Add delay between requests
                if (pageNum < maxPages - 1) {
                    log.info(`Waiting ${delayMs}ms before next request...`);
                    await Apify.utils.sleep(delayMs);
                }

            } catch (error) {
                log.error(`Error on page ${pageNum + 1}`, { error: error.message });
                
                // Take screenshot for debugging
                try {
                    const key = `error-page-${pageNum + 1}.png`;
                    await Apify.utils.puppeteer.saveSnapshot(page, { key });
                    log.info(`Screenshot saved: ${key}`);
                } catch (screenshotError) {
                    log.error('Could not take screenshot', { error: screenshotError.message });
                }
                
                // Wait longer on error
                await Apify.utils.sleep(delayMs * 2);
            }
        }

        log.info(`Crawling completed! Found ${foundUrls.size} unique LinkedIn profiles.`);
        
        // Save summary to key-value store
        await Apify.setValue('SUMMARY', {
            totalProfiles: foundUrls.size,
            profession,
            country,
            maxPages,
            completedAt: new Date().toISOString(),
            profiles: Array.from(foundUrls)
        });

    } catch (error) {
        log.error('Crawling failed', { error: error.message });
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});
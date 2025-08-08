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
        delayMs = 2000,
        useProxy = true,
        proxyCountry = 'US'
    } = input;

    console.log('Starting LinkedIn Profile Scraper', {
        profession,
        country,
        maxPages,
        delayMs,
        useProxy,
        proxyCountry
    });

    const foundUrls = new Set();
    const query = `site:linkedin.com/in "${profession}" "${country}"`;
    
    // console.log(`Search query: ${query}`);

    // Set up proxy configuration for better success rate
    const proxyConfiguration = useProxy ? await Actor.createProxyConfiguration({
        groups: ['RESIDENTIAL'],
        countryCode: proxyCountry,
        useApifyProxy: true
    }) : undefined;

    // Launch browser with enhanced anti-detection
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions-file-access-check',
                '--disable-extensions-https-browsing',
                '--disable-extensions-except',
                '--disable-component-extensions-with-background-pages',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
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

        // Use proxy if configured
        if (proxyConfiguration) {
            const proxyInfo = await proxyConfiguration.newUrl();
            console.log(`Using proxy: ${proxyInfo}`);
        }
        
        // Set viewport to match window size
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Enhanced anti-detection measures
        await page.evaluateOnNewDocument(() => {
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Override chrome property
            Object.defineProperty(navigator, 'chrome', {
                get: () => ({
                    runtime: {},
                    loadTimes: function() {},
                    csi: function() {},
                }),
            });
            
            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => ({
                    length: 3,
                    0: { name: 'Chrome PDF Plugin' },
                    1: { name: 'Chrome PDF Viewer' },
                    2: { name: 'Native Client' }
                }),
            });
        });
        
        // Set realistic user agent with more variation
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(randomUA);

        // Enhanced headers to look more human
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'DNT': '1'
        });

        // Delay function with random variation
        const delay = (ms) => {
            const randomDelay = ms + (Math.random() * 1000); // Add up to 1 second random delay
            return new Promise(resolve => setTimeout(resolve, randomDelay));
        };

        // Try alternative search engines if Google blocks us
        const searchEngines = [
            {
                name: 'Google',
                baseUrl: 'https://www.google.com/search',
                param: 'q'
            },
            {
                name: 'Bing',
                baseUrl: 'https://www.bing.com/search',
                param: 'q'
            }
        ];

        let searchEngineIndex = 0;
        let totalResults = 0;

        // Try different search engines
        for (const searchEngine of searchEngines) {
            if (totalResults > 0) break; // If we got results from previous engine, stop
            
            console.log(`\n=== Trying ${searchEngine.name} ===`);
            
            // Crawl multiple pages
            for (let pageNum = 0; pageNum < maxPages; pageNum++) {
                const start = pageNum * 10;
                let searchUrl;
                
                if (searchEngine.name === 'Google') {
                    searchUrl = `${searchEngine.baseUrl}?${searchEngine.param}=${encodeURIComponent(query)}&start=${start}`;
                } else if (searchEngine.name === 'Bing') {
                    const first = start + 1; // Bing uses 'first' parameter starting from 1
                    searchUrl = `${searchEngine.baseUrl}?${searchEngine.param}=${encodeURIComponent(query)}&first=${first}`;
                }
                
                // console.log(`\n=== Crawling ${searchEngine.name} page ${pageNum + 1}/${maxPages} ===`);
                // console.log(`URL: ${searchUrl}`);
                
                try {
                    // First visit to establish session
                    if (pageNum === 0) {
                        const homeUrl = searchEngine.name === 'Google' ? 'https://www.google.com' : 'https://www.bing.com';
                        // console.log(`Visiting ${homeUrl} to establish session...`);
                        await page.goto(homeUrl, { 
                            waitUntil: 'networkidle0',
                            timeout: 30000 
                        });
                        await delay(2000);
                        
                        // Handle potential cookie consent
                        try {
                            if (searchEngine.name === 'Google') {
                                await page.click('#L2AGLb', { timeout: 5000 }); // Accept cookies
                            }
                        } catch (e) {
                            // Ignore if cookie consent not found
                        }
                    }
                    
                    console.log('Navigating to search results...');
                    await page.goto(searchUrl, { 
                        waitUntil: 'networkidle0',
                        timeout: 30000 
                    });

                    // Wait for search results based on search engine
                    try {
                        if (searchEngine.name === 'Google') {
                            await page.waitForSelector('#main', { timeout: 10000 });
                        } else if (searchEngine.name === 'Bing') {
                            await page.waitForSelector('#b_results', { timeout: 10000 });
                        }
                    } catch (error) {
                        console.log(`${searchEngine.name} results container not found, continuing...`);
                    }

                    await delay(3000);

                    // Check page content for debugging
                    const pageContent = await page.content();
                    const hasSearchResults = pageContent.includes('linkedin.com') && pageContent.length > 5000;
                    
                    if (!hasSearchResults) {
                        console.log('⚠️  Page seems to have minimal content, might be blocked');
                        console.log(`Page content length: ${pageContent.length}`);
                        
                        const title = await page.title();
                        console.log(`Page title: ${title}`);
                        
                        if (title.toLowerCase().includes('unusual traffic') || 
                            pageContent.includes('robots') || 
                            pageContent.includes('captcha')) {
                            console.log('⚠️  Detected blocking, trying next search engine...');
                            break; // Try next search engine
                        }
                    }

                    // Extract LinkedIn URLs with engine-specific selectors
                    console.log('Extracting LinkedIn URLs...');
                    
                    const pageUrls = await page.evaluate((engineName) => {
                        let selectors = [];
                        
                        if (engineName === 'Google') {
                            selectors = [
                                'a[href*="linkedin.com/in/"]',
                                'a[href*="/url?q="]',
                                'h3 a',
                                '.g a',
                                '.yuRUbf a',
                                '.rc .r a',
                                '.kCrYT a',
                                '[data-ved] a'
                            ];
                        } else if (engineName === 'Bing') {
                            selectors = [
                                'a[href*="linkedin.com/in/"]',
                                '.b_algo a',
                                'h2 a',
                                '.b_title a'
                            ];
                        }
                        
                        const allLinks = [];
                        selectors.forEach(selector => {
                            try {
                                const links = Array.from(document.querySelectorAll(selector));
                                allLinks.push(...links);
                            } catch (e) {
                                // Ignore selector errors
                            }
                        });
                        
                        console.log(`Found ${allLinks.length} total links to process`);
                        
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
                                !href.includes('/company/') &&
                                !href.includes('/posts/') &&
                                !href.includes('/activity/')) {
                                const cleanUrl = href.split('?')[0].split('#')[0];
                                if (!processedUrls.has(cleanUrl)) {
                                    urls.push(cleanUrl);
                                    processedUrls.add(cleanUrl);
                                }
                            }
                        });
                        
                        return urls;
                    }, searchEngine.name);

                    // Also search in page source for any missed URLs
                    const content = await page.content();
                    const linkedinRegex = /https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/g;
                    const regexMatches = content.match(linkedinRegex) || [];
                    
                    // Combine both methods
                    const allUrls = [...pageUrls, ...regexMatches];
                    const uniquePageUrls = [...new Set(allUrls)];
                    
                    console.log(`Found ${uniquePageUrls.length} LinkedIn URLs on this page:`);
                    uniquePageUrls.forEach((url, index) => {
                        // console.log(`  ${index + 1}. ${url}`);
                    });
                    
                    // Save each URL to dataset
                    for (const url of uniquePageUrls) {
                        if (!foundUrls.has(url)) {
                            foundUrls.add(url);
                            totalResults++;
                            
                            // Save to Apify dataset
                            await Actor.pushData({
                                url,
                                profession,
                                country,
                                foundOnPage: pageNum + 1,
                                searchEngine: searchEngine.name,
                                timestamp: new Date().toISOString()
                            });
                            
                            console.log(`Added profile: ${url}`);
                        }
                    }

                    // Check if there are more pages available
                    const hasNextPage = await page.evaluate((engineName) => {
                        if (engineName === 'Google') {
                            const nextButton = document.querySelector('a[aria-label="Next page"]') || 
                                             document.querySelector('a#pnnext') ||
                                             document.querySelector('td.b a');
                            return !!nextButton;
                        } else if (engineName === 'Bing') {
                            const nextButton = document.querySelector('.sb_pagN') || 
                                             document.querySelector('a[aria-label="Next page"]');
                            return !!nextButton;
                        }
                        return false;
                    }, searchEngine.name);

                    console.log(`Total unique URLs found so far: ${foundUrls.size}`);
                    console.log(`Has next page: ${hasNextPage}`);

                    if (!hasNextPage && pageNum < maxPages - 1) {
                        console.log('⚠️  No more pages available');
                        break;
                    }
                    
                    // Add delay between requests with random variation
                    if (pageNum < maxPages - 1) {
                        console.log(`Waiting ${delayMs}ms before next request...`);
                        await delay(delayMs);
                    }

                } catch (error) {
                    console.error(`❌ Error on ${searchEngine.name} page ${pageNum + 1}:`, error.message);
                    
                    // Take screenshot for debugging
                    try {
                        const screenshot = await page.screenshot({ 
                            fullPage: true,
                            type: 'png'
                        });
                        const key = `error-${searchEngine.name.toLowerCase()}-page-${pageNum + 1}.png`;
                        await Actor.setValue(key, screenshot, { contentType: 'image/png' });
                        console.log(`Screenshot saved: ${key}`);
                    } catch (screenshotError) {
                        console.error('Could not take screenshot:', screenshotError.message);
                    }
                    
                    // Wait longer on error
                    await delay(delayMs * 2);
                }
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
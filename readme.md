# LinkedIn Profile Scraper

This Apify actor scrapes LinkedIn profile URLs from Google search results based on profession and country criteria.

## Features

- **Google Search Integration**: Uses Google search with specific queries to find LinkedIn profiles
- **Stealth Mode**: Implements various anti-detection measures to avoid being blocked
- **Proxy Support**: Uses Apify's proxy service for reliable scraping
- **Error Handling**: Robust error handling with screenshots for debugging
- **Data Storage**: Saves results to Apify dataset with metadata

## Input Configuration

The actor accepts the following input parameters:

- **profession** (string): The profession or job title to search for (e.g., "software engineer", "marketing manager")
- **country** (string): The country to search for profiles in (e.g., "United States", "Canada")
- **maxPages** (integer): Maximum number of Google search result pages to crawl (1-50, default: 10)
- **delayMs** (integer): Delay in milliseconds between requests (1000-10000ms, default: 2000)
- **proxyConfiguration** (object): Proxy settings (default: uses Apify residential proxies)

## Output

The actor saves data to an Apify dataset with the following structure for each LinkedIn profile found:

```json
{
  "url": "https://www.linkedin.com/in/john-doe-123456",
  "profession": "software engineer",
  "country": "United States",
  "foundOnPage": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

A summary is also saved to the key-value store under the key `SUMMARY` containing:
- Total number of profiles found
- Search parameters used
- Complete list of all profile URLs
- Completion timestamp

## Usage

### Via Apify Console

1. Go to the [Apify Console](https://console.apify.com)
2. Create a new actor or use this one
3. Configure the input parameters
4. Run the actor

### Via API

```javascript
const { ApifyApi } = require('apify-client');

const client = new ApifyApi({
    token: 'YOUR_APIFY_TOKEN',
});

const run = await client.actor('YOUR_ACTOR_ID').call({
    profession: 'data scientist',
    country: 'Canada',
    maxPages: 5,
    delayMs: 3000
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

## Deployment

To deploy this actor to Apify:

1. **Install Apify CLI**:
   ```bash
   npm install -g @apify/cli
   ```

2. **Login to Apify**:
   ```bash
   apify login
   ```

3. **Create a new actor**:
   ```bash
   apify create my-linkedin-scraper
   ```

4. **Replace the generated files** with the ones from this repository

5. **Deploy**:
   ```bash
   apify push
   ```

## Local Development

To run locally:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd linkedin-profile-scraper
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create input file** (`apify_storage/key_value_stores/default/INPUT.json`):
   ```json
   {
     "profession": "software engineer",
     "country": "United States",
     "maxPages": 3,
     "delayMs": 2000
   }
   ```

4. **Run the actor**:
   ```bash
   npm start
   ```

## Important Notes

### Legal Considerations
- This scraper only collects publicly available LinkedIn profile URLs
- It does not access private profile information
- Ensure compliance with LinkedIn's Terms of Service and applicable laws
- Consider rate limiting and respectful scraping practices

### Rate Limiting
- The scraper includes built-in delays between requests
- Uses residential proxies to avoid IP blocking
- Implements realistic browser behavior to reduce detection

### Troubleshooting
- If you encounter CAPTCHAs, try increasing the delay between requests
- Use residential proxies for better success rates
- Check the screenshots saved on errors for debugging
- Monitor the logs for detailed execution information

## File Structure

```
├── src/
│   └── main.js          # Main scraper logic
├── package.json         # Node.js dependencies
├── INPUT_SCHEMA.json    # Input validation schema
├── Dockerfile           # Container configuration
└── README.md           # This file
```

## Support

For issues and questions:
- Check the Apify documentation: https://docs.apify.com/
- Review the actor logs for error details
- Ensure your input parameters are valid
- Consider adjusting delays if encountering rate limits
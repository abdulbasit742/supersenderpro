// Web Scraper & Browserless Capture Connector
const fs = require('fs');

async function scrapeWebsite(url, apiKey) {
  if (!url) throw new Error("URL is required");

  // Format URL properly
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  if (apiKey) {
    try {
      console.log(`[webScraper] Scraping with Firecrawl: ${url}`);
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown', 'html']
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return {
            title: data.data.metadata?.title || 'Scraped Website',
            description: data.data.metadata?.description || '',
            content: data.data.markdown || data.data.html || '',
            provider: 'firecrawl'
          };
        }
      }
      console.warn(`[webScraper] Firecrawl failed (status: ${response.status}), falling back to native scrape...`);
    } catch (err) {
      console.warn(`[webScraper] Firecrawl fetch error: ${err.message}, falling back...`);
    }
  }

  // Native scraper fallback
  try {
    console.log(`[webScraper] Scraping natively: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load page. HTTP status: ${response.status}`);
    }

    const html = await response.text();

    // Clean html and parse text using regex helpers
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Scraped Page';

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || 
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Strip scripts, styles, and other layout elements
    let body = html;
    body = body.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
    body = body.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
    body = body.replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '');
    body = body.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '');
    body = body.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '');

    // Strip remaining tags
    let content = body.replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();

    if (content.length > 3000) {
      content = content.slice(0, 3000) + '... [truncated]';
    }

    return {
      title,
      description,
      content: content || 'No readable text content found.',
      provider: 'native'
    };
  } catch (e) {
    console.error(`[webScraper] Native scrape failed:`, e.message);
    throw new Error(`Scrape failed: ${e.message}`);
  }
}

async function captureScreenshot(url, apiKey) {
  if (!url) throw new Error("URL is required");

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  if (apiKey) {
    try {
      console.log(`[webScraper] Capturing with Browserless: ${url}`);
      const response = await fetch(`https://chrome.browserless.io/screenshot?token=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          options: {
            fullPage: false,
            type: 'jpeg',
            quality: 75
          }
        })
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:image/jpeg;base64,${base64}`;
      }
      console.warn(`[webScraper] Browserless failed (status: ${response.status}), falling back to screenshot api...`);
    } catch (err) {
      console.warn(`[webScraper] Browserless fetch error: ${err.message}, falling back...`);
    }
  }

  // Public fallback: thum.io
  try {
    return `https://image.thum.io/get/width/1280/crop/800/${url}`;
  } catch (err) {
    console.error(`[webScraper] Screenshot fallback failed:`, err.message);
    // Return empty inline SVG mock
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23222831"/><text x="400" y="300" font-size="20" fill="%2300adb5" text-anchor="middle">No Preview Available</text></svg>`;
  }
}

module.exports = {
  scrapeWebsite,
  captureScreenshot
};

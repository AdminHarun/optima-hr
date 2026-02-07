// Link Preview Route - Telegram/WhatsApp style
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

/**
 * POST /api/link-preview
 * Fetch Open Graph metadata for a given URL
 */
router.post('/', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log('📎 Fetching link preview for:', url);

    // Fetch the URL with proper headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000, // 10 seconds timeout
      maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract Open Graph metadata
    const preview = {
      url: url,
      title: $('meta[property="og:title"]').attr('content')
           || $('meta[name="twitter:title"]').attr('content')
           || $('title').text()
           || url,
      description: $('meta[property="og:description"]').attr('content')
                || $('meta[name="twitter:description"]').attr('content')
                || $('meta[name="description"]').attr('content')
                || '',
      image: $('meta[property="og:image"]').attr('content')
          || $('meta[name="twitter:image"]').attr('content')
          || null,
      site_name: $('meta[property="og:site_name"]').attr('content')
              || new URL(url).hostname,
      favicon: $('link[rel="icon"]').attr('href')
            || $('link[rel="shortcut icon"]').attr('href')
            || null,
      type: $('meta[property="og:type"]').attr('content') || 'website'
    };

    // Resolve relative image URLs to absolute
    if (preview.image && !preview.image.startsWith('http')) {
      const baseUrl = new URL(url).origin;
      preview.image = new URL(preview.image, baseUrl).href;
    }

    // Resolve relative favicon URLs
    if (preview.favicon && !preview.favicon.startsWith('http')) {
      const baseUrl = new URL(url).origin;
      preview.favicon = new URL(preview.favicon, baseUrl).href;
    }

    console.log('✅ Link preview fetched successfully:', preview.title);
    res.json(preview);

  } catch (error) {
    console.error('❌ Error fetching link preview:', error.message);

    // Return minimal preview on error
    res.status(200).json({
      url: url,
      title: new URL(url).hostname,
      description: 'Link preview unavailable',
      image: null,
      site_name: new URL(url).hostname,
      favicon: null,
      type: 'website'
    });
  }
});

module.exports = router;

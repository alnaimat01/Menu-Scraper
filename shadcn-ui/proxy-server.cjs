const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Choices / modifiers proxy endpoint
app.get('/choices', async (req, res) => {
  try {
    const { branchId, itemId } = req.query;

    if (!branchId || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'branchId and itemId are required'
      });
    }

    const url = `https://www.talabat.com/nextMenuBff/branch-menus/${branchId}/items/${itemId}/choices`;

    console.log('🌐 Fetching choices:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://www.talabat.com/',
        'Origin': 'https://www.talabat.com'
      },
      timeout: 30000
    });

    if (!response.ok) {
      console.error('❌ Choices HTTP Error:', response.status, response.statusText);
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));

    const choices = data?.choices || data?.data?.choices || [];

    console.log(`✅ Choices fetched for item ${itemId}: ${choices.length} groups`);

    res.json({
      success: true,
      choices
    });

  } catch (error) {
    console.error('❌ Choices proxy error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      type: error.name
    });
  }
});

// Noon Food menu proxy endpoint
// Noon Food menu proxy endpoint - whoami session based
app.post('/noon-food', async (req, res) => {
  try {
    const { outletCode } = req.body;

    if (!outletCode) {
      return res.status(400).json({
        success: false,
        error: 'outletCode is required'
      });
    }

    const visitorId = '259ae51c-63ff-4f5e-942c-7e8b3c1c7e42';

    const locationCookie =
      'x-location-food-ae=eyJsYXQiOiAyNDM4NDkzNzYsICJsbmciOiA1NDYxOTkwMTIsICJhcmVhIjogIjkgLSBBbCBXYWhkYWggU3QgLSBaYXllZCBDaXR5IC0gXHUwNjIzXHUwNjI4XHUwNjQ4XHUwNjM4XHUwNjI4XHUwNjRhIn0';

    const baseCookie = [
      `visitor_id=${visitorId}`,
      locationCookie,
      'dcae=2',
      'x-available-ae=ecom-food'
    ].join('; ');

    const outletPageUrl = `https://food.noon.com/uae-en/outlet/${outletCode}/`;
    const whoamiUrl = 'https://food.noon.com/_svc/whoami-v1/whoami';
    const menuApiUrl = 'https://food.noon.com/_svc/mp-food-api-mpnoon/consumer/restaurant/outlet/details/guest';

    console.log('👤 Noon whoami session request...');

    const whoamiResponse = await fetch(whoamiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,ar-JO;q=0.8,ar-AE;q=0.7,ar;q=0.6,bg;q=0.5',
        'cache-control': 'no-cache, max-age=0, must-revalidate, no-store',
        'cookie': baseCookie,
        'pragma': 'no-cache',
        'referer': outletPageUrl,
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'x-content': 'desktop',
        'x-experience': 'food',
        'x-locale': 'en-ae',
        'x-mp': 'noon',
        'x-platform': 'web',
        'x-visitor-id': visitorId
      }
    });

    console.log('👤 whoami status:', whoamiResponse.status);

    const rawSetCookie = whoamiResponse.headers.get('set-cookie') || '';

const guestMatch = rawSetCookie.match(/nguestv2=([^;]+)/);
const availableMatch = rawSetCookie.match(/x-available-ae=([^;]+)/);

const whoamiCookies = [];

if (availableMatch) {
  whoamiCookies.push(`x-available-ae=${availableMatch[1]}`);
}

if (guestMatch) {
  whoamiCookies.push(`nguestv2=${guestMatch[1]}`);
}


    const finalCookie = [
      baseCookie,
      ...whoamiCookies
    ].join('; ');

    const hasGuestToken = finalCookie.includes('nguestv2=');

    if (!hasGuestToken) {
      return res.status(500).json({
        success: false,
        error: 'whoami did not return nguestv2 cookie'
      });
    }

    console.log('📦 Fetching Noon menu API:', outletCode);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const menuResponse = await fetch(menuApiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,ar-JO;q=0.8,ar-AE;q=0.7,ar;q=0.6,bg;q=0.5',
        'cache-control': 'no-cache, max-age=0, must-revalidate, no-store',
        'content-type': 'application/json',
        'cookie': finalCookie,
        'origin': 'https://food.noon.com',
        'pragma': 'no-cache',
        'referer': outletPageUrl,
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'x-content': 'desktop',
        'x-experience': 'food',
        'x-locale': 'en-ae',
        'x-mp': 'noon',
        'x-platform': 'web',
        'x-visitor-id': visitorId
      },
      body: JSON.stringify({
        addressLat: 243849376,
        addressLng: 546199012,
        deliveryType: 'default',
        outletCode
      })
    });

    clearTimeout(timeoutId);

    console.log('📥 menu status:', menuResponse.status);

    const data = await menuResponse.json();

    if (!menuResponse.ok || data.status !== 'success') {
      console.error('❌ Noon menu API error:', data);

      return res.status(menuResponse.status || 500).json({
        success: false,
        error: data.message || data.error || `HTTP ${menuResponse.status}`
      });
    }

    const mainItemsCount =
      data?.data?.menu?.items?.filter((item) => item.itemType === 'main')?.length || 0;

    console.log(`✅ Noon Food menu fetched: ${outletCode} - ${mainItemsCount} main items`);

    res.json({
      success: true,
      data: data.data
    });

  } catch (error) {
    console.error('❌ Noon Food proxy error:', error.message);

    const isTimeout = error.name === 'AbortError';

    res.status(500).json({
      success: false,
      error: isTimeout
        ? 'Noon Food request timed out after whoami.'
        : error.message,
      type: error.name
    });
  }
});
// Main proxy endpoint
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }

    console.log('🌐 Fetching URL:', url);
    console.log('⏰ Time:', new Date().toISOString());
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000 // Source code fetch timeout (10 seconds)
    });
    
    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      return res.status(response.status).json({ 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      });
    }
    
    const html = await response.text();
    const sizeKB = (html.length / 1024).toFixed(2);
    
    console.log('✅ Success! Fetched:', sizeKB, 'KB');
    console.log('📄 HTML length:', html.length, 'characters');
    
    // Check if HTML contains menu data indicators
    const hasMenuData = html.includes('menu') || html.includes('item') || html.includes('price');
    console.log('🔍 Contains menu data:', hasMenuData);
    
    res.json({ 
      success: true, 
      html,
      metadata: {
        size: html.length,
        sizeKB,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      type: error.name
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅ PROXY SERVER RUNNING');
  console.log('═══════════════════════════════════════════');
  console.log(`  📡 URL: http://localhost:${PORT}`);
  console.log(`  🔧 Endpoint: POST /fetch`);
  console.log(`  💚 Health: GET /health`);
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('Ready to proxy Talabat requests...');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down proxy server...');
  process.exit(0);
});
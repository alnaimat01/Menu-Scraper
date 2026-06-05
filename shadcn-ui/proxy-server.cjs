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
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
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
      timeout: 30000 // 30 second timeout
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
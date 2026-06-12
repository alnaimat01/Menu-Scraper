const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
// MongoDB connection library
const mongoose = require('mongoose');

// Password hashing and verification
const bcrypt = require('bcryptjs');

// Authentication token generation
const jwt = require('jsonwebtoken');

// Load environment variables from .env
require('dotenv').config();
const app = express();
const PORT = 3001;

// ==========================================
// MongoDB Connection
// Connects the proxy server to MongoDB Atlas
// Uses MONGODB_URI from the .env file
// ==========================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
  })
  .catch((error) => {
    console.error('❌ MongoDB Error:', error.message);
  });


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  lastLogin: { type: Date, default: null },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) }
});

// Main users collection in MongoDB
const User = mongoose.model('User', userSchema);

// Enable CORS for all origins
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// ==========================================
// LOGIN API
// Validates username/password
// Checks active status
// Checks subscription dates
// Returns JWT token on success
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'User is inactive'
      });
    }

    // ==========================================
    // Subscription validation
    // Only normal users are restricted by dates
    // Admins and Super Admins bypass subscription checks
    // ==========================================

    if (user.role === 'user') {
      const today = new Date().toISOString().slice(0, 10);

      if (today < user.startDate || today > user.endDate) {
        return res.status(403).json({
          success: false,
          error: 'User subscription is expired or not started'
        });
      }
    }

    // Save last successful login time
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ==========================================
// CREATE USER API
// Creates a new user in MongoDB
// Password is hashed before saving
// ==========================================
app.post('/api/users/create', async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (
      !username ||
      !password ||
      !role ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      isActive: true,
      startDate,
      endDate
    });

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('❌ Create user error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ==========================================
// GET USERS API
// Returns all users for Admin Dashboard
// Password field is excluded for security
// ==========================================
app.get('/api/users', async (req, res) => {
  try {
    const users = await User
      .find({})
      .select('-password')
      .sort({ username: 1 });

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('❌ Get users error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ==========================================
// TOGGLE USER STATUS API
// Enables or disables a user account
// If isActive = false, user cannot login
// ==========================================
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Make sure isActive is sent as boolean
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be true or false'
      });
    }

    // Prevent disabling Super Admin
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (
      userToUpdate.role === 'superadmin' &&
      isActive === false
    ) {
      return res.status(403).json({
        success: false,
        error: 'Super Admin cannot be disabled'
      });
    }

    // Update user active status in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: isActive ? 'User enabled successfully' : 'User disabled successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Toggle user status error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ==========================================
// DELETE USER API
// Deletes a user from MongoDB
// Used by Admin Dashboard
// ==========================================
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting the main admin account
    const userToDelete = await User.findById(id);

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deleting Super Admin
    if (userToDelete.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Super Admin cannot be deleted'
      });
    }

    // Delete user by MongoDB document ID
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUserId: id
    });

  } catch (error) {
    console.error('❌ Delete user error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ==========================================
// EXTEND USER SUBSCRIPTION API
// Adds days to user's end date
// ==========================================
app.patch('/api/users/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentEndDate = new Date(user.endDate);

    currentEndDate.setDate(
      currentEndDate.getDate() + Number(days)
    );

    user.endDate = currentEndDate
      .toISOString()
      .split('T')[0];

    await user.save();

    res.json({
      success: true,
      message: `Subscription extended by ${days} days`,
      user
    });

  } catch (error) {
    console.error('❌ Extend subscription error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// ==========================================
// UPDATE USER API
// Updates subscription dates
// Optionally resets user password
// ==========================================
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, password } = req.body;

    // Get user before updating to protect Super Admin password
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent changing Super Admin password
    if (
      userToUpdate.role === 'superadmin' &&
      password &&
      password.trim()
    ) {
      return res.status(403).json({
        success: false,
        error: 'Super Admin password cannot be changed'
      });
    }

    // Dates are required because this API is mainly for subscription editing
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const updateData = {
      startDate,
      endDate
    };

    // If admin enters a new password, hash it before saving
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Update user error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

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
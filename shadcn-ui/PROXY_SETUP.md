# Local Proxy Server Setup Guide

## What is This?

This proxy server bypasses CORS restrictions by fetching Talabat pages from your local machine, allowing the tool to automatically extract menu data without manual HTML copying.

## Prerequisites

- Node.js installed (v14 or higher)
- npm or pnpm package manager

## Installation Steps

### Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
pnpm install express cors node-fetch@2
```

Or with npm:

```bash
npm install express cors node-fetch@2
```

### Step 2: Start the Proxy Server

In a **separate terminal window**, run:

```bash
node proxy-server.js
```

You should see:

```
═══════════════════════════════════════════
  ✅ PROXY SERVER RUNNING
═══════════════════════════════════════════
  📡 URL: http://localhost:3001
  🔧 Endpoint: POST /fetch
  💚 Health: GET /health
═══════════════════════════════════════════

Ready to proxy Talabat requests...
```

### Step 3: Start the Main Application

In **another terminal window**, run:

```bash
pnpm run dev
```

### Step 4: Use the Tool

1. Open the application in your browser (usually http://localhost:5173)
2. Paste a Talabat restaurant URL
3. Click "Fetch & Generate Excel"
4. The proxy will fetch the page and extract menu items automatically

## How It Works

```
Browser (App) → Local Proxy Server → Talabat Website
     ↓                    ↓                  ↓
  No CORS          Fetches HTML        Returns Data
  Issues           with headers         to Proxy
     ↓                    ↓
  Receives HTML ← Proxy Returns HTML
     ↓
  Parses Menu
     ↓
  Generates Excel
```

## Troubleshooting

### Proxy Not Running

**Error:** "Failed to connect to proxy server"

**Solution:** Make sure you started the proxy server with `node proxy-server.js`

### Port Already in Use

**Error:** "EADDRINUSE: address already in use :::3001"

**Solution:** 
1. Kill the process using port 3001:
   ```bash
   # On Mac/Linux
   lsof -ti:3001 | xargs kill -9
   
   # On Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```
2. Restart the proxy server

### Fetch Timeout

**Error:** "Request timeout"

**Solution:**
- Check your internet connection
- The Talabat website might be slow or down
- Try again in a few moments

### HTML Fetched but 0 Items Extracted

**Solution:**
1. Check the console logs in the proxy terminal
2. Verify the HTML contains menu data
3. The page structure might have changed - report this issue

## Testing the Proxy

Test if the proxy is working:

```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","message":"Proxy server is running"}
```

## Security Notes

⚠️ **This proxy runs locally on your machine only**
- It does NOT expose your data to external servers
- It only fetches public Talabat pages
- No authentication or personal data is transmitted
- The proxy only runs while you keep it active

## Stopping the Proxy

Press `Ctrl+C` in the terminal running the proxy server.

## Alternative: Manual HTML Paste

If you prefer not to use the proxy, you can still:
1. Open Talabat page in browser
2. Press F12 → Elements
3. Right-click `<html>` → Copy → Copy outerHTML
4. Paste into the tool
5. Generate Excel

Both methods work equally well!
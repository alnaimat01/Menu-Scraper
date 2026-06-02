# Talabat Menu Scraper - Development Plan

## Design Guidelines

### Design References
- **Scrapy.org**: Clean, technical interface for web scraping tools
- **ParseHub.com**: User-friendly scraper UI with clear input fields
- **Style**: Modern Professional + Clean Interface + Technical Tool

### Color Palette
- Primary: #0F172A (Slate 900 - background)
- Secondary: #1E293B (Slate 800 - cards)
- Accent: #3B82F6 (Blue 500 - CTAs and highlights)
- Success: #10B981 (Green 500 - success states)
- Text: #F1F5F9 (Slate 100), #94A3B8 (Slate 400 - secondary)

### Typography
- Heading1: Inter font-weight 700 (36px)
- Heading2: Inter font-weight 600 (28px)
- Heading3: Inter font-weight 600 (20px)
- Body/Normal: Inter font-weight 400 (14px)
- Body/Emphasize: Inter font-weight 600 (14px)
- Code/Monospace: Fira Code font-weight 400 (13px)

### Key Component Styles
- **Buttons**: Blue background (#3B82F6), white text, 6px rounded, hover: brighten 10%
- **Cards**: Slate 800 (#1E293B), 1px border (#334155), 8px rounded
- **Input Fields**: Dark background with border, focus: blue accent ring
- **Status Indicators**: Color-coded badges (processing: blue, success: green, error: red)

### Images to Generate
1. **hero-scraper-dashboard.jpg** - Modern web scraping dashboard interface with data visualization (Style: photorealistic, tech aesthetic)
2. **icon-scraper-robot.png** - Friendly robot icon representing web scraping automation (Style: minimalist, vector-style)
3. **background-data-flow.jpg** - Abstract data flow visualization with network nodes (Style: photorealistic, dark tech)

---

## Development Tasks

### 1. Setup & Structure
- Initialize shadcn-ui template
- Install dependencies: axios, cheerio, xlsx, openai
- Generate required images

### 2. Core Components
- **URLInput.tsx**: Input field for Talabat restaurant URL with validation
- **ProxyConfig.tsx**: Proxy server settings (host, port, auth)
- **AIConfig.tsx**: AI API key input for text processing
- **ScraperControls.tsx**: Start/stop buttons and progress indicator
- **ResultsDisplay.tsx**: Display scraped data preview
- **ExportButton.tsx**: Download Excel file button

### 3. Scraping Logic
- **scraper.ts**: Main scraping service
  - Fetch restaurant page source via proxy
  - Parse HTML to extract menu structure
  - Extract categories, items, sizes, prices, descriptions
  - Extract choice groups with options and constraints

### 4. AI Integration
- **aiProcessor.ts**: AI text processing service
  - Capitalize item names using AI
  - Handle duplicate detection and resolution

### 5. Data Processing
- **dataProcessor.ts**: Menu data organization
  - Deduplicate items (add period for duplicates)
  - Deduplicate choice groups (compare options)
  - Add distinguishing symbols for duplicate group names
  - Format data for Excel export

### 6. Excel Export
- **excelExporter.ts**: Generate Excel file
  - Sheet 1: Menu Items (6 columns)
  - Sheet 2: Choice Groups (7 columns)

### 7. Main Page
- **page.tsx**: Main application interface
  - Integrate all components
  - Handle scraping workflow
  - Display results and export options

### 8. Styling & Testing
- Apply design system consistently
- Add loading states and error handling
- Test with sample Talabat URLs
- Responsive design for all screen sizes

### 9. Final Check
- Run lint and build
- Validate UI rendering
- End development
import { ProcessedMenuItem, ProcessedChoiceGroup } from './dataProcessor';

interface ItemData {
  category: string;
  name: string;
  description: string;
  price: number;
  size: string;
  choiceGroups: string;
}

interface NextDataStructure {
  props?: {
    pageProps?: {
      menu?: {
        categories?: Array<{
          name: string;
          items: Array<{
            name: string;
            description?: string;
            price?: string | number;
            size?: string;
            modifiers?: unknown[];
            options?: unknown[];
            customizations?: unknown[];
            modifierGroups?: unknown[];
          }>;
        }>;
      };
      restaurant?: {
        menu?: {
          categories?: Array<{
            name: string;
            items: unknown[];
          }>;
        };
      };
      initialData?: {
        menu?: {
          categories?: Array<{
            name: string;
            items: unknown[];
          }>;
        };
      };
      data?: {
        menu?: {
          categories?: Array<{
            name: string;
            items: unknown[];
          }>;
        };
      };
    };
  };
}

export class HTMLParser {
  parseMenuFromHTML(html: string): { menuItems: ProcessedMenuItem[]; choiceGroups: ProcessedChoiceGroup[] } {
    console.time('Total Parsing Time');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const menuItems: ProcessedMenuItem[] = [];
    const choiceGroups: ProcessedChoiceGroup[] = [];
    const seenItems = new Set<string>();

    try {
      console.log('🔍 Analyzing HTML structure...');
      
      const isReactSPA = html.includes('__NEXT_DATA__') || html.includes('react') || html.includes('_app');
      
      if (isReactSPA) {
        console.log('⚠️ Detected React SPA - menu data is loaded dynamically via JavaScript');
        console.log('💡 Attempting to extract embedded JSON data...');
        
        const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
        let foundData = false;
        
        for (const script of scripts) {
          try {
            const jsonData = JSON.parse(script.textContent || '');
            console.log('📦 Found JSON-LD data:', Object.keys(jsonData));
            
            if (jsonData.hasMenuSection || jsonData.menu) {
              this.parseJSONMenuDataFast(jsonData, menuItems, choiceGroups, seenItems);
              foundData = true;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (!foundData) {
          const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
          if (nextDataScript) {
            try {
              const nextData = JSON.parse(nextDataScript.textContent || '') as NextDataStructure;
              console.log('📦 Found __NEXT_DATA__');
              this.extractFromNextData(nextData, menuItems, choiceGroups, seenItems);
              foundData = true;
            } catch (e) {
              console.log('❌ Could not parse __NEXT_DATA__');
            }
          }
        }
        
        if (!foundData) {
          console.log('❌ Could not extract menu data from React SPA');
          console.log('💡 Recommendation: Use Talabat API directly instead of HTML parsing');
        }
      } else {
        console.log('📄 Traditional HTML detected, attempting standard parsing...');
        
        if (this.parseTalabatStructure(doc, menuItems, choiceGroups, seenItems)) {
          console.log(`✓ Strategy 1 succeeded: ${menuItems.length} items`);
        } else if (this.parseStructuredData(doc, menuItems, choiceGroups, seenItems)) {
          console.log(`✓ Strategy 2 succeeded: ${menuItems.length} items`);
        } else if (this.fallbackParsing(doc, menuItems, choiceGroups, seenItems)) {
          console.log(`✓ Strategy 3 succeeded: ${menuItems.length} items`);
        }
      }

      console.log(`Final result: ${menuItems.length} menu items and ${choiceGroups.length} choice groups`);
      
    } catch (error) {
      console.error('HTML parsing error:', error);
    }

    console.timeEnd('Total Parsing Time');
    return { menuItems, choiceGroups };
  }

  private extractFromNextData(
    nextData: NextDataStructure,
    menuItems: ProcessedMenuItem[],
    choiceGroups: ProcessedChoiceGroup[],
    seenItems: Set<string>
  ): void {
    try {
      const props = nextData?.props?.pageProps;
      if (!props) return;
      
      const possiblePaths = [
        props.menu,
        props.restaurant?.menu,
        props.initialData?.menu,
        props.data?.menu
      ];
      
      for (const menuData of possiblePaths) {
        if (menuData?.categories) {
          console.log('✅ Found menu in Next.js data');
          menuData.categories.forEach((category) => {
            const categoryName = category.name || 'General';
            (category.items || []).forEach((item) => {
              const itemData: ItemData = {
                category: categoryName,
                name: item.name || '',
                description: item.description || '',
                price: parseFloat(String(item.price || '0')),
                size: item.size || 'NaN',
                choiceGroups: this.extractChoiceGroupsFromJSON(item)
              };
              if (itemData.name) {
                this.addMenuItemFast(itemData, menuItems, choiceGroups, seenItems);
              }
            });
          });
          break;
        }
      }
    } catch (error) {
      console.log('❌ Error extracting from Next.js data:', error);
    }
  }

  private parseTalabatStructure(
    doc: Document,
    menuItems: ProcessedMenuItem[],
    choiceGroups: ProcessedChoiceGroup[],
    seenItems: Set<string>
  ): boolean {
    console.time('Strategy 1: Talabat Structure');
    
    const categorySelectors = [
      '[data-testid*="menu-category"]',
      '[class*="MenuCategory"]',
      'section[class*="category"]',
      '[data-test-id*="category"]'
    ];

    for (const selector of categorySelectors) {
      const categories = doc.querySelectorAll(selector);
      if (categories.length === 0) continue;
      
      console.log(`Found ${categories.length} categories with: ${selector}`);
      
      categories.forEach((categoryEl) => {
        const categoryName = this.extractCategoryNameFast(categoryEl);
        
        const itemSelectors = [
          '[data-testid*="menu-item"]',
          '[class*="MenuItem"]',
          'article',
          '[data-test-id*="item"]'
        ];

        for (const itemSelector of itemSelectors) {
          const items = categoryEl.querySelectorAll(itemSelector);
          if (items.length === 0) continue;
          
          items.forEach((itemEl) => {
            const itemData = this.extractItemDataFast(itemEl, categoryName);
            if (itemData?.name) {
              this.addMenuItemFast(itemData, menuItems, choiceGroups, seenItems);
            }
          });
          break;
        }
      });
      
      if (menuItems.length > 0) {
        console.timeEnd('Strategy 1: Talabat Structure');
        return true;
      }
    }
    
    console.timeEnd('Strategy 1: Talabat Structure');
    return false;
  }

  private parseStructuredData(
    doc: Document,
    menuItems: ProcessedMenuItem[],
    choiceGroups: ProcessedChoiceGroup[],
    seenItems: Set<string>
  ): boolean {
    console.time('Strategy 2: JSON Data');
    
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        
        if (data.hasMenuSection || data.menu || data.menuItems) {
          this.parseJSONMenuDataFast(data, menuItems, choiceGroups, seenItems);
          if (menuItems.length > 0) {
            console.timeEnd('Strategy 2: JSON Data');
            return true;
          }
        }
      } catch {
        continue;
      }
    }
    
    console.timeEnd('Strategy 2: JSON Data');
    return false;
  }

  private parseJSONMenuDataFast(
    data: Record<string, unknown>,
    menuItems: ProcessedMenuItem[],
    choiceGroups: ProcessedChoiceGroup[],
    seenItems: Set<string>
  ): void {
    const sections = (data.hasMenuSection || data.menu || data.menuItems || []) as Record<string, unknown>[];
    
    if (!Array.isArray(sections)) return;
    
    sections.forEach((section: Record<string, unknown>) => {
      const category = this.capitalize((section.name || section.category || 'General') as string);
      const items = (section.hasMenuItem || section.items || []) as Record<string, unknown>[];
      
      if (!Array.isArray(items)) return;
      
      items.forEach((item: Record<string, unknown>) => {
        const offers = item.offers as Record<string, unknown> | undefined;
        const itemData: ItemData = {
          category,
          name: this.capitalize((item.name || '') as string),
          description: (item.description || '') as string,
          price: this.parsePriceFast((item.price || offers?.price || '0') as string),
          size: (item.size || 'NaN') as string,
          choiceGroups: this.extractChoiceGroupsFromJSON(item)
        };
        
        if (itemData.name) {
          this.addMenuItemFast(itemData, menuItems, choiceGroups, seenItems);
        }
      });
    });
  }

  private fallbackParsing(
    doc: Document,
    menuItems: ProcessedMenuItem[],
    choiceGroups: ProcessedChoiceGroup[],
    seenItems: Set<string>
  ): boolean {
    console.time('Strategy 3: Fallback');
    console.log('Using fallback text parsing...');
    
    const textContent = doc.body.textContent || '';
    const lines = textContent.split('\n');
    
    let currentCategory = 'General';
    const priceRegex = /(\d+\.?\d*)\s*(?:KWD|KD|AED|SAR|BHD|QAR|OMR|USD|EUR|GBP)?/i;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;
      
      if (trimmed.length < 50 && !priceRegex.test(trimmed) && /^[A-Z]/.test(trimmed)) {
        const words = trimmed.split(' ');
        if (words.length <= 5 && (trimmed === trimmed.toUpperCase() || this.isTitle(trimmed))) {
          currentCategory = this.capitalize(trimmed);
          continue;
        }
      }
      
      const priceMatch = trimmed.match(priceRegex);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        const itemName = trimmed.substring(0, trimmed.indexOf(priceMatch[0])).trim();
        
        if (itemName.length > 3 && itemName.length < 100) {
          this.addMenuItemFast(
            {
              category: currentCategory,
              name: this.capitalize(itemName),
              description: '',
              price,
              size: 'NaN',
              choiceGroups: ''
            },
            menuItems,
            choiceGroups,
            seenItems
          );
        }
      }
    }
    
    console.timeEnd('Strategy 3: Fallback');
    return menuItems.length > 0;
  }

  private extractCategoryNameFast(element: Element): string {
    const h2 = element.querySelector('h2');
    if (h2?.textContent) return this.capitalize(h2.textContent.trim());
    
    const h3 = element.querySelector('h3');
    if (h3?.textContent) return this.capitalize(h3.textContent.trim());
    
    const title = element.querySelector('[class*="title"]');
    if (title?.textContent) return this.capitalize(title.textContent.trim());
    
    const text = element.textContent?.trim() || '';
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length < 50 ? this.capitalize(firstLine) : 'General';
  }

  private extractItemDataFast(element: Element, category: string): ItemData | null {
    const h3 = element.querySelector('h3');
    const h4 = element.querySelector('h4');
    const nameEl = h3 || h4 || element.querySelector('[class*="name"]');
    const itemName = nameEl?.textContent?.trim();
    
    if (!itemName) return null;

    const descEl = element.querySelector('p') || element.querySelector('[class*="desc"]');
    const description = descEl?.textContent?.trim() || '';

    const priceEl = element.querySelector('[class*="price"]') || element.querySelector('span[class*="amount"]');
    const priceText = priceEl?.textContent?.trim() || '';
    const price = this.parsePriceFast(priceText);

    const sizeEl = element.querySelector('[class*="size"]') || element.querySelector('[class*="variant"]');
    const size = sizeEl?.textContent?.trim() || 'NaN';

    const choiceEls = element.querySelectorAll('[class*="option"], [class*="addon"]');
    const groups: string[] = [];
    choiceEls.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 100) groups.push(text);
    });

    return {
      category,
      name: this.capitalize(itemName),
      description,
      price,
      size,
      choiceGroups: groups.join('#')
    };
  }

  private parsePriceFast(priceText: string): number {
    if (!priceText) return 0;
    const match = priceText.match(/\d+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  private extractChoiceGroupsFromJSON(item: Record<string, unknown>): string {
    const modifiers = (item.modifiers || item.options || item.customizations || item.modifierGroups) as Record<string, unknown>[] | undefined;
    
    if (!modifiers || !Array.isArray(modifiers)) return '';
    
    return modifiers
      .map((mod: Record<string, unknown>) => mod.name as string)
      .filter(Boolean)
      .join('#');
  }

  private addMenuItemFast(
    itemData: ItemData,
    menuItems: ProcessedMenuItem[],
    choiceGroups: ProcessedChoiceGroup[],
    seenItems: Set<string>
  ): void {
    if (!itemData.name) return;

    let finalItemName = itemData.name;
    let counter = 0;
    while (seenItems.has(finalItemName)) {
      counter++;
      finalItemName = itemData.name + '.'.repeat(counter);
    }
    seenItems.add(finalItemName);

    menuItems.push({
      category: itemData.category,
      name: finalItemName,
      size: itemData.size || 'NaN',
      price: itemData.price,
      description: itemData.description || '',
      choiceGroups: itemData.choiceGroups || ''
    });
  }

  private isTitle(text: string): boolean {
    const words = text.split(' ');
    return words.every(word => !word.length || word[0] === word[0].toUpperCase());
  }

  private capitalize(text: string): string {
    if (!text) return '';
    
    if (text === text.toUpperCase()) {
      return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return text;
  }
}
export interface ParsedMenuItem {
  category: string;
  itemName: string;
  description: string;
  price: string;
  size: string;
  choiceGroups: string;
  itemId?: string | number;
  modifiers?: any[];
}

interface MenuItem {
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  price?: number;
  basePrice?: number;
  size?: string | string[];
  variant?: string;
  option?: string;
  choiceGroups?: ChoiceGroup[];
  modifiers?: ChoiceGroup[];
  options?: ChoiceGroup[];
  addons?: ChoiceGroup[];
}

interface ChoiceGroup {
  name?: string;
  title?: string;
  items?: ChoiceItem[];
  options?: ChoiceItem[];
}

interface ChoiceItem {
  name?: string;
  title?: string;
}

interface Category {
  name?: string;
  title?: string;
  items?: MenuItem[];
  menuItems?: MenuItem[];
}

interface MenuData {
  categories?: Category[];
  menuCategories?: Category[];
}

export class SourceCodeParser {
  parseSourceCode(html: string, restaurantName: string, restaurantPhone: string): ParsedMenuItem[] {
    console.log('🔍 Starting source code parsing...');
    console.log(`📄 HTML length: ${html.length} characters`);
    console.log(`🏪 Restaurant: ${restaurantName}`);
    console.log(`📞 Phone: ${restaurantPhone}`);

    const menuItems: ParsedMenuItem[] = [];

    try {
      // Strategy 1: Extract from __NEXT_DATA__ script tag
      const nextDataItems = this.extractFromNextData(html);
      if (nextDataItems.length > 0) {
        console.log(`✅ Found ${nextDataItems.length} items from __NEXT_DATA__`);
        menuItems.push(...nextDataItems);
        return menuItems;
      }

      // Strategy 2: Extract from window.__INITIAL_STATE__
      const initialStateItems = this.extractFromInitialState(html);
      if (initialStateItems.length > 0) {
        console.log(`✅ Found ${initialStateItems.length} items from __INITIAL_STATE__`);
        menuItems.push(...initialStateItems);
        return menuItems;
      }

      // Strategy 3: Extract from any JSON-LD or embedded JSON
      const jsonLdItems = this.extractFromJsonLd(html);
      if (jsonLdItems.length > 0) {
        console.log(`✅ Found ${jsonLdItems.length} items from JSON-LD`);
        menuItems.push(...jsonLdItems);
        return menuItems;
      }

      // Strategy 4: Search for any JSON objects containing menu data
      const genericJsonItems = this.extractFromGenericJson(html);
      if (genericJsonItems.length > 0) {
        console.log(`✅ Found ${genericJsonItems.length} items from generic JSON`);
        menuItems.push(...genericJsonItems);
        return menuItems;
      }

      console.log('⚠️ No menu items found in source code');
      return menuItems;

    } catch (error) {
      console.error('❌ Parsing error:', error);
      throw new Error(`Failed to parse source code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractFromNextData(html: string): ParsedMenuItem[] {
    const items: ParsedMenuItem[] = [];

    try {
      // Find __NEXT_DATA__ script tag
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!nextDataMatch) {
        console.log('⚠️ No __NEXT_DATA__ found');
        return items;
      }

      const jsonStr = nextDataMatch[1];
      const data = JSON.parse(jsonStr) as Record<string, unknown>;

      console.log('🔍 Parsing __NEXT_DATA__ structure...');

      // Navigate through Next.js data structure to find menu
      const props = data?.props as Record<string, unknown> | undefined;
      const pageProps = (props?.pageProps || props?.initialState || {}) as Record<string, unknown>;
      
      // For Talabat: Look for initialMenuState.menuData
      const initialMenuState = pageProps?.initialMenuState as Record<string, unknown> | undefined;
      const menuData = initialMenuState?.menuData as Record<string, unknown> | undefined;
      
      if (!menuData) {
        console.log('⚠️ No menuData found in __NEXT_DATA__');
        return items;
      }

      // Extract from menuData.items array (Talabat structure)
      const menuItems = menuData.items as Array<Record<string, unknown>> | undefined;
      
      if (!menuItems || !Array.isArray(menuItems)) {
        console.log('⚠️ No items array found in menuData');
        return items;
      }

      console.log(`📋 Found ${menuItems.length} items in menuData`);

      // Process each item
      for (const item of menuItems) {
        const menuItem: ParsedMenuItem = {
          category: (item.sectionName as string) || (item.originalSection as string) || 'Uncategorized',
          itemName: (item.name as string) || 'Unknown Item',
          description: (item.description as string) || '',
          price: this.formatPrice(this.getValidPrice(
  item.basePrice,
  item.originalPrice,
  item.oldPrice,
  item.price
)),          size: '',
choiceGroups: (item.hasChoices as boolean) ? 'Has choices (details not available in menu list)' : '',
itemId: item.id as string | number,
modifiers: []
        };

        items.push(menuItem);
      }

      return items;

    } catch (error) {
      console.error('Error parsing __NEXT_DATA__:', error);
      return items;
    }
  }

  private extractFromInitialState(html: string): ParsedMenuItem[] {
    const items: ParsedMenuItem[] = [];

    try {
      // Find window.__INITIAL_STATE__ or similar patterns
      const patterns = [
        /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
        /window\.__STATE__\s*=\s*({.*?});/s,
        /window\.initialState\s*=\s*({.*?});/s
      ];

      let data: Record<string, unknown> | null = null;

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          data = JSON.parse(match[1]) as Record<string, unknown>;
          break;
        }
      }

      if (!data) {
        console.log('⚠️ No __INITIAL_STATE__ found');
        return items;
      }

      console.log('🔍 Parsing __INITIAL_STATE__ structure...');

      // Look for menu in various locations
      const menu = (
        data?.menu || 
        (data?.restaurant as Record<string, unknown> | undefined)?.menu ||
        data?.menuData ||
        (data?.data as Record<string, unknown> | undefined)?.menu
      ) as MenuData | undefined;

      if (!menu) {
        console.log('⚠️ No menu found in __INITIAL_STATE__');
        return items;
      }

      // Extract items (similar to __NEXT_DATA__)
      const categories = menu.categories || menu.menuCategories || [];
      
      for (const category of categories) {
        const categoryName = category.name || category.title || 'Uncategorized';
        const categoryItems = category.items || category.menuItems || [];

        for (const item of categoryItems) {
          const menuItem: ParsedMenuItem = {
            category: categoryName,
            itemName: item.name || item.title || 'Unknown Item',
            description: item.description || item.desc || '',
price: this.formatPrice(this.getValidPrice(
  item.basePrice,
  (item as any).originalPrice,
  (item as any).oldPrice,
  item.price
)), 
           size: this.extractSize(item),
        choiceGroups: this.extractChoiceGroups(item),
itemId: (item as any).id,
modifiers: []
          };

          items.push(menuItem);
        }
      }

      return items;

    } catch (error) {
      console.error('Error parsing __INITIAL_STATE__:', error);
      return items;
    }
  }

  private extractFromJsonLd(html: string): ParsedMenuItem[] {
    const items: ParsedMenuItem[] = [];

    try {
      // Find JSON-LD script tags
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);

      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]) as Record<string, unknown>;

          // Look for menu in JSON-LD
          if (data['@type'] === 'Restaurant' && data.hasMenu) {
            const menu = data.hasMenu as Record<string, unknown>;
            const menuSections = (menu.hasMenuSection || []) as Record<string, unknown>[];

            for (const section of menuSections) {
              const categoryName = (section.name as string) || 'Uncategorized';
              const sectionItems = (section.hasMenuItem || []) as Record<string, unknown>[];

              for (const item of sectionItems) {
                const offers = item.offers as Record<string, unknown> | undefined;
                const menuItem: ParsedMenuItem = {
                  category: categoryName,
                  itemName: (item.name as string) || 'Unknown Item',
                  description: (item.description as string) || '',
                  price: this.formatPrice((offers?.price as number) || 0),
                  size: '',
                  choiceGroups: '',
                  itemId: (item as any).id,
                  modifiers: []
                };

                items.push(menuItem);
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON-LD
          continue;
        }
      }

      return items;

    } catch (error) {
      console.error('Error parsing JSON-LD:', error);
      return items;
    }
  }

  private extractFromGenericJson(html: string): ParsedMenuItem[] {
    const items: ParsedMenuItem[] = [];

    try {
      console.log('🔍 Searching for generic JSON objects...');

      // Find all script tags with JSON content
      const scriptMatches = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);

      for (const match of scriptMatches) {
        const scriptContent = match[1];

        // Skip if too small or doesn't look like JSON
        if (scriptContent.length < 100 || !scriptContent.includes('{')) {
          continue;
        }

        try {
          // Try to find JSON objects
          const jsonMatches = scriptContent.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

          for (const jsonMatch of jsonMatches) {
            try {
              const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

              // Look for menu-like structures
              if (this.looksLikeMenuData(data)) {
                const extractedItems = this.extractItemsFromObject(data);
                items.push(...extractedItems);
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        } catch (e) {
          continue;
        }
      }

      return items;

    } catch (error) {
      console.error('Error parsing generic JSON:', error);
      return items;
    }
  }

  private looksLikeMenuData(obj: Record<string, unknown>): boolean {
    if (!obj || typeof obj !== 'object') return false;

    // Check for menu-related keywords
    const keywords = ['menu', 'item', 'category', 'price', 'food', 'dish', 'product'];
    const objStr = JSON.stringify(obj).toLowerCase();

    return keywords.some(keyword => objStr.includes(keyword));
  }

  private extractItemsFromObject(obj: unknown, categoryName: string = 'Uncategorized'): ParsedMenuItem[] {
    const items: ParsedMenuItem[] = [];

    try {
      // Recursive search for menu items
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (typeof item === 'object' && item !== null) {
            const itemObj = item as Record<string, unknown>;
            // Check if this looks like a menu item
            if (itemObj.name || itemObj.title) {
              const menuItem: ParsedMenuItem = {
                category: categoryName,
                itemName: (itemObj.name as string) || (itemObj.title as string) || 'Unknown Item',
                description: (itemObj.description as string) || (itemObj.desc as string) || '',
                price: this.formatPrice(this.getValidPrice(
  itemObj.basePrice,
  itemObj.originalPrice,
  itemObj.oldPrice,
  itemObj.price
)),
                size: this.extractSize(itemObj as MenuItem),
                choiceGroups: this.extractChoiceGroups(itemObj as MenuItem),
               itemId: (itemObj as any).id,
                modifiers: []
              };
              items.push(menuItem);
            } else {
              // Recurse deeper
              items.push(...this.extractItemsFromObject(item, categoryName));
            }
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        const objRecord = obj as Record<string, unknown>;
        // Check if this object has categories
        if (objRecord.categories || objRecord.menuCategories) {
          const categories = (objRecord.categories || objRecord.menuCategories) as Category[];
          for (const category of categories) {
            const catName = category.name || category.title || 'Uncategorized';
            const catItems = category.items || category.menuItems || [];
            items.push(...this.extractItemsFromObject(catItems, catName));
          }
        } else {
          // Recurse through all properties
          for (const key in objRecord) {
            if (Array.isArray(objRecord[key])) {
              items.push(...this.extractItemsFromObject(objRecord[key], categoryName));
            }
          }
        }
      }

      return items;

    } catch (error) {
      return items;
    }
  }

  private formatPrice(price: number | string | undefined): string {
    if (!price) return '0.000';
    
    const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
    
    if (isNaN(numPrice)) return '0.000';
    
    return String(numPrice);
  }
  private getValidPrice(...prices: unknown[]): number {
  for (const price of prices) {
    const value =
      typeof price === 'string'
        ? parseFloat(price)
        : typeof price === 'number'
          ? price
          : NaN;

    if (!Number.isNaN(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

 private extractSize(item: MenuItem): string {
  return '';
}

  private extractChoiceGroups(item: MenuItem): string {
    if (!item) return '';

    // Look for choice groups, modifiers, options
    const choices = 
      item.choiceGroups || 
      item.modifiers || 
      item.options || 
      item.addons || 
      [];

    if (!Array.isArray(choices) || choices.length === 0) {
      return '';
    }

    return choices
      .map((choice: ChoiceGroup) => {
        const name = choice.name || choice.title || '';
        const items = choice.items || choice.options || [];
        const itemNames = items.map((i: ChoiceItem) => i.name || i.title || '').join(', ');
        return `${name}: ${itemNames}`;
      })
      .filter(Boolean)
      .join(' | ');
  }
}
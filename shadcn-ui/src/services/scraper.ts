export interface MenuItem {
  category: string;
  name: string;
  sizes: string[];
  prices: number[];
  description: string;
  choiceGroupNames: string[];
}

export interface ChoiceOption {
  name: string;
  price: number;
  oldPrice?: number;
}

export interface ChoiceGroup {
  name: string;
  options: ChoiceOption[];
  min: number;
  max: number;
}

export interface ScrapedData {
  items: MenuItem[];
  choiceGroups: ChoiceGroup[];
}

export class TalabatScraper {
  private proxyUrl: string;
  private proxyAuth?: { username: string; password: string };

  constructor(proxyUrl?: string, proxyAuth?: { username: string; password: string }) {
    this.proxyUrl = proxyUrl || '';
    this.proxyAuth = proxyAuth;
  }

  async scrapeRestaurant(url: string): Promise<ScrapedData> {
    try {
      // Fetch the page source
      const html = await this.fetchPage(url);
      
      // Parse the HTML and extract menu data
      const data = this.parseMenuData(html);
      
      return data;
    } catch (error) {
      throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        proxy: this.proxyUrl,
        proxyAuth: this.proxyAuth,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch page');
    }

    const data = await response.json();
    return data.html;
  }

  private parseMenuData(html: string): ScrapedData {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const items: MenuItem[] = [];
    const choiceGroups: ChoiceGroup[] = [];

    // Find all menu categories
    const categories = doc.querySelectorAll('[data-testid="menu-category"]');

    categories.forEach((categoryElement) => {
      const categoryName = categoryElement.querySelector('h2, h3')?.textContent?.trim() || 'Uncategorized';

      // Find all items in this category
      const itemElements = categoryElement.querySelectorAll('[data-testid="menu-item"]');

      itemElements.forEach((itemElement) => {
        const item = this.parseMenuItem(itemElement, categoryName);
        if (item) {
          items.push(item);
        }
      });
    });

    // Extract choice groups from items
    const groupsMap = new Map<string, ChoiceGroup>();
    
    // Parse choice groups from the page
    const choiceGroupElements = doc.querySelectorAll('[data-testid="choice-group"]');
    choiceGroupElements.forEach((groupElement) => {
      const group = this.parseChoiceGroup(groupElement);
      if (group) {
        const key = this.getGroupKey(group);
        if (!groupsMap.has(key)) {
          groupsMap.set(key, group);
        }
      }
    });

    return {
      items,
      choiceGroups: Array.from(groupsMap.values()),
    };
  }

  private parseMenuItem(element: Element, category: string): MenuItem | null {
    try {
      const nameElement = element.querySelector('[data-testid="item-name"]');
      const name = nameElement?.textContent?.trim() || '';

      const descElement = element.querySelector('[data-testid="item-description"]');
      const description = descElement?.textContent?.trim() || '';

      // Extract sizes and prices
      const sizeElements = element.querySelectorAll('[data-testid="item-size"]');
      const sizes: string[] = [];
      const prices: number[] = [];

      if (sizeElements.length > 0) {
        sizeElements.forEach((sizeElement) => {
          const sizeName = sizeElement.querySelector('[data-testid="size-name"]')?.textContent?.trim() || '';
          const priceElement = sizeElement.querySelector('[data-testid="size-price"]');
          const originalPriceElement = sizeElement.querySelector('[data-testid="original-price"]');
          
          // Always use original price if available (when there's an offer)
          const priceText = originalPriceElement?.textContent || priceElement?.textContent || '0';
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

          sizes.push(sizeName);
          prices.push(price);
        });
      } else {
        // Single price item
        const priceElement = element.querySelector('[data-testid="item-price"]');
        const originalPriceElement = element.querySelector('[data-testid="original-price"]');
        const priceText = originalPriceElement?.textContent || priceElement?.textContent || '0';
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        sizes.push('Regular');
        prices.push(price);
      }

      // Extract choice group names
      const choiceGroupElements = element.querySelectorAll('[data-testid="choice-group-name"]');
      const choiceGroupNames = Array.from(choiceGroupElements).map(el => el.textContent?.trim() || '');

      return {
        category,
        name,
        sizes,
        prices,
        description,
        choiceGroupNames,
      };
    } catch (error) {
      console.error('Error parsing menu item:', error);
      return null;
    }
  }

  private parseChoiceGroup(element: Element): ChoiceGroup | null {
    try {
      const nameElement = element.querySelector('[data-testid="group-name"]');
      const name = nameElement?.textContent?.trim() || '';

      const options: ChoiceOption[] = [];
      const optionElements = element.querySelectorAll('[data-testid="choice-option"]');

      optionElements.forEach((optionElement) => {
        const optionName = optionElement.querySelector('[data-testid="option-name"]')?.textContent?.trim() || '';
        const priceElement = optionElement.querySelector('[data-testid="option-price"]');
        const oldPriceElement = optionElement.querySelector('[data-testid="option-old-price"]');

        const priceText = priceElement?.textContent || '0';
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        let oldPrice: number | undefined;
        if (oldPriceElement) {
          const oldPriceText = oldPriceElement.textContent || '0';
          oldPrice = parseFloat(oldPriceText.replace(/[^0-9.]/g, ''));
        }

        options.push({ name: optionName, price, oldPrice });
      });

      // Extract min/max constraints
      const minElement = element.querySelector('[data-testid="min-selections"]');
      const maxElement = element.querySelector('[data-testid="max-selections"]');

      const min = minElement ? parseInt(minElement.textContent || '0') : 0;
      const max = maxElement ? parseInt(maxElement.textContent || '1') : 1;

      return { name, options, min, max };
    } catch (error) {
      console.error('Error parsing choice group:', error);
      return null;
    }
  }

  private getGroupKey(group: ChoiceGroup): string {
    // Create a unique key based on options to identify duplicate groups
    const optionsKey = group.options
      .map(opt => `${opt.name}:${opt.price}`)
      .sort()
      .join('|');
    return optionsKey;
  }
}
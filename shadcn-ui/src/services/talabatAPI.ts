interface TalabatMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  modifierGroups?: Array<{
    id: string;
    name: string;
    modifiers: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
}

interface TalabatAPIResponse {
  data: {
    menu: {
      categories: Array<{
        id: string;
        name: string;
        items: TalabatMenuItem[];
      }>;
    };
  };
}

export class TalabatAPI {
  private extractRestaurantId(url: string): string | null {
    try {
      const match = url.match(/restaurant\/(\d+)\//);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  private extractAreaId(url: string): string | null {
    try {
      const match = url.match(/aid=(\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async fetchMenuData(url: string): Promise<{ items: TalabatMenuItem[]; categories: string[] }> {
    const restaurantId = this.extractRestaurantId(url);
    const areaId = this.extractAreaId(url);

    if (!restaurantId) {
      throw new Error('Invalid Talabat URL: Could not extract restaurant ID');
    }

    console.log(`🔍 Extracted Restaurant ID: ${restaurantId}`);
    console.log(`🔍 Extracted Area ID: ${areaId || 'none'}`);

    // Try multiple API endpoints
    const apiEndpoints = [
      `https://api.talabat.com/api/v1/restaurants/${restaurantId}/menu${areaId ? `?aid=${areaId}` : ''}`,
      `https://www.talabat.com/api/v1/restaurants/${restaurantId}/menu${areaId ? `?aid=${areaId}` : ''}`,
      `https://consumer-api.talabat.com/api/v1/restaurants/${restaurantId}/menu${areaId ? `?aid=${areaId}` : ''}`
    ];

    // Try with CORS proxies
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      ''
    ];

    for (const proxy of proxies) {
      for (const endpoint of apiEndpoints) {
        const apiUrl = proxy + encodeURIComponent(endpoint);
        console.log(`🌐 Trying API: ${endpoint.substring(0, 80)}...`);

        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) {
            console.log(`❌ API failed: ${response.status}`);
            continue;
          }

          const data = await response.json() as TalabatAPIResponse;

          if (data?.data?.menu?.categories) {
            console.log(`✅ API succeeded! Found ${data.data.menu.categories.length} categories`);
            return this.parseAPIResponse(data);
          }
        } catch (error) {
          console.log(`❌ API error: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }
    }

    throw new Error('Could not fetch menu data from Talabat API. The restaurant might not be available or the API structure has changed.');
  }

  private parseAPIResponse(data: TalabatAPIResponse): { items: TalabatMenuItem[]; categories: string[] } {
    const items: TalabatMenuItem[] = [];
    const categories: string[] = [];

    data.data.menu.categories.forEach(category => {
      categories.push(category.name);

      category.items.forEach(item => {
        items.push({
          ...item,
          category: category.name
        });
      });
    });

    console.log(`📊 Parsed ${items.length} items from ${categories.length} categories`);
    return { items, categories };
  }


  async fetchItemChoices(branchId: string | number, itemId: string | number): Promise<any[]> {
    const endpoint = `https://menu-scraper-platform1.onrender.com/choices?branchId=${branchId}&itemId=${itemId}`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log(`❌ Choices API failed for item ${itemId}: ${response.status}`);
        return [];
      }

      const data = await response.json();

      return data.choices || data.modifiers || data.data || [];
    } catch (error) {
      console.log(`❌ Failed to fetch choices for item ${itemId}`, error);
      return [];
    }
  }
}
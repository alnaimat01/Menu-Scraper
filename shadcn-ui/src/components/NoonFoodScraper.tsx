import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Utensils } from 'lucide-react';
import { NoonFoodParser } from '@/services/NoonFoodParser';
import { NoonFoodExcelExporter } from '@/services/noonFoodExcelExporter';

export function NoonFoodScraper() {
  const [noonUrl, setNoonUrl] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [isFetchingMenu, setIsFetchingMenu] = useState(false);
  const [noonMenuData, setNoonMenuData] = useState<any>(null);

  const extractOutletCode = (url: string): string | null => {
    const cleanUrl = url.trim();

    const outletMatch = cleanUrl.match(/\/outlet\/([^/?#]+)/i);
    if (outletMatch?.[1]) {
      const outletCode = outletMatch[1].match(/^[A-Z0-9]+/i);
      return outletCode?.[0] || null;
    }

    const directCodeMatch = cleanUrl.match(/\b[A-Z0-9]{8,15}\b/);
    if (directCodeMatch?.[0]) return directCodeMatch[0];

    return null;
  };

  const handleFetchNoonMenu = async () => {
    if (!noonUrl.trim()) {
      toast.error('Please enter Noon Food URL');
      return;
    }

    const outletCode = extractOutletCode(noonUrl);

    if (!outletCode) {
      toast.error('Could not extract outlet code from Noon Food URL');
      return;
    }

    setIsFetchingMenu(true);

    try {
      const response = await fetch('https://menu-scraper1.onrender.com/noon-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outletCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch Noon Food menu');
      }

      setNoonMenuData(data.data);

      const apiRestaurantName = data.data?.name || data.data?.restaurantName;

      if (apiRestaurantName) {
        setRestaurantName(apiRestaurantName);
      }

      const mainItemsCount =
        data.data?.menu?.items?.filter((item: any) => item.itemType === 'main')?.length || 0;

      toast.success(`Noon Food menu loaded successfully: ${mainItemsCount} items`);
    } catch (error) {
      console.error('Noon Food fetch error:', error);

      const message = error instanceof Error ? error.message : 'Unknown error';

      toast.error('Failed to fetch Noon Food menu', {
        description: message,
      });
    } finally {
      setIsFetchingMenu(false);
    }
  };

  const handleNoonExtract = () => {
    if (!noonMenuData) {
      toast.error('Please fetch Noon Food menu first');
      return;
    }

    try {
      const parser = new NoonFoodParser();
      const items = parser.parse(noonMenuData);
      const sizeKeywordGroups = items.flatMap(item =>
        (item.modifiers || [])
          .filter(group =>
            (group.choices || []).some(option =>
              /small|medium|large|300|ml|litre|liter/i.test(option.name || '')
            )
          )
          .map(group => ({
            itemName: item.itemName,
            groupName: group.name,
            choices: group.choices
          }))
      );

      console.log('Possible size groups:', JSON.stringify(sizeKeywordGroups, null, 2));

      if (items.length === 0) {
        toast.error('No Noon Food items found');
        return;
      }

      const exporter = new NoonFoodExcelExporter();

      exporter.exportToExcel(
        items,
        restaurantName.trim() || noonMenuData.name || 'Noon Food Menu',
        noonMenuData.outletCode || 'noon-food'
      );

      toast.success(`تم استخراج ${items.length} عنصر من Noon Food بنجاح`);
      console.log('Noon Food parsed sample:', items.slice(0, 5));
    } catch (error) {
      console.error('Noon Food extraction error:', error);

      const message = error instanceof Error ? error.message : 'Unknown error';

      toast.error('فشل استخراج Noon Food', {
        description: message,
      });
    }
  };
  const clearAll = () => {
    setNoonUrl('');
    setRestaurantName('');
    setNoonMenuData(null);
    toast.info('تم مسح جميع حقول Noon Food');
  };

  const mainItemsCount =
    noonMenuData?.menu?.items?.filter((item: any) => item.itemType === 'main')?.length || 0;

  const modifierItemsCount =
    noonMenuData?.menu?.items?.filter((item: any) => item.itemType === 'modifier')?.length || 0;

  const modifierGroupsCount = noonMenuData?.menu?.modifiers?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-blue-600" />
          Noon Food Menu Extractor
        </CardTitle>

        <CardDescription>
          الصق رابط مطعم Noon Food لاستخراج المنيو مباشرة.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="noon-food-url" className="text-sm font-semibold">
            رابط Noon Food
          </Label>

          <div className="flex gap-3">
            <Input
              id="noon-food-url"
              placeholder="https://food.noon.com/uae-en/outlet/BRWCHZ5CA1/"
              value={noonUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoonUrl(e.target.value)}
              className="h-11 flex-1"
              dir="ltr"
            />

            <Button
              onClick={handleFetchNoonMenu}
              disabled={isFetchingMenu || !noonUrl.trim()}
              className="h-11 bg-green-600 hover:bg-green-700"
            >
              {isFetchingMenu ? 'Loading...' : 'Get Menu'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="noon-food-restaurant-name" className="text-sm font-semibold">
            اسم المطعم
          </Label>

          <Input
            id="noon-food-restaurant-name"
            placeholder="مثال: BREWCHA"
            value={restaurantName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRestaurantName(e.target.value)}
            className="h-11"
            dir="auto"
          />
        </div>

        {noonMenuData && (
          <div className="rounded-md border bg-gray-50 p-4 text-sm space-y-1">
            <div>
              <strong>Restaurant:</strong> {noonMenuData.name || restaurantName || 'Unknown'}
            </div>
            <div>
              <strong>Outlet Code:</strong> {noonMenuData.outletCode}
            </div>
            <div>
              <strong>Main Items:</strong> {mainItemsCount}
            </div>
            <div>
              <strong>Modifier Items:</strong> {modifierItemsCount}
            </div>
            <div>
              <strong>Modifier Groups:</strong> {modifierGroupsCount}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
            disabled={!noonMenuData}
            onClick={handleNoonExtract}
          >
            <Download className="mr-2 h-5 w-5" />
            Extract Noon Food Menu
          </Button>

          <Button
            variant="outline"
            className="h-12 px-6"
            onClick={clearAll}
          >
            مسح الكل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
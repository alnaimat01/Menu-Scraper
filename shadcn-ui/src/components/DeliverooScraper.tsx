import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Code } from 'lucide-react';
import { DeliverooParser } from '@/services/deliverooParser';
import { DeliverooExcelExporter } from '@/services/deliverooExcelExporter';

export function DeliverooScraper() {
  const [deliverooUrl, setDeliverooUrl] = useState('');
  const [deliverooSourceCode, setDeliverooSourceCode] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [isFetchingSource, setIsFetchingSource] = useState(false);

const handleGetDeliverooSource = async () => {
  if (!deliverooUrl.trim()) {
    toast.error('Please enter Deliveroo URL');
    return;
  }

  setIsFetchingSource(true);

  try {
    const response = await fetch('https://menu-scraper-platform1.onrender.com/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: deliverooUrl.trim() }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch source code');
    }

    setDeliverooSourceCode(data.html || '');

    const nameFromUrl = deliverooUrl
  .split('?')[0]
  .split('/')
  .filter(Boolean)
  .pop()
  ?.replace(/-/g, ' ')
  ?.trim();

if (nameFromUrl) {
  setRestaurantName(nameFromUrl);
}

    toast.success('Deliveroo source code loaded successfully');
  } catch (error) {
    console.error('Error fetching Deliveroo source:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    toast.error('Failed to fetch Deliveroo source code', {
      description: message
    });
  } finally {
    setIsFetchingSource(false);
  }
};

  const handleDeliverooExtract = () => {

    

    try {
      const parser = new DeliverooParser();
      const items = parser.parseSourceCode(deliverooSourceCode);

      if (items.length === 0) {
        toast.error('لم يتم استخراج أي عناصر من Deliveroo');
        return;
      }

      const exporter = new DeliverooExcelExporter();
      exporter.exportToExcel(
  items,
  restaurantName.trim() || 'Deliveroo Menu',
  'deliveroo'
);


      toast.success(`تم استخراج ${items.length} عنصر من Deliveroo بنجاح`);
      console.log('Deliveroo sample items:', items.slice(0, 5));
    } catch (error) {
      console.error('Deliveroo extraction error:', error);

      const message = error instanceof Error ? error.message : 'Unknown error';

      toast.error('فشل استخراج Deliveroo', {
        description: message
      });
    }
  };

  const clearAll = () => {
  setDeliverooUrl('');
  setDeliverooSourceCode('');
  setRestaurantName('');

  toast.info('تم مسح جميع الحقول');
};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-600" />
          Deliveroo Menu Extractor
        </CardTitle>

        <CardDescription>
          الصق رابط Deliveroo أو الكود المصدري للصفحة
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deliveroo-url" className="text-sm font-semibold">
            رابط Deliveroo
          </Label>

          <div className="flex gap-3">
  <Input
    id="deliveroo-url"
    placeholder="https://deliveroo.co.uk/menu/Kuwait/rai/mcdonalds-al-rai-lulu/..."
    value={deliverooUrl}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliverooUrl(e.target.value)}
    className="h-11 flex-1"
    dir="ltr"
  />

  <Button
    onClick={handleGetDeliverooSource}
    disabled={isFetchingSource || !deliverooUrl.trim()}
    className="h-11 bg-green-600 hover:bg-green-700"
  >
    {isFetchingSource ? 'Loading...' : 'Get Source'}
  </Button>
</div>
</div>

<div className="space-y-2">
  <Label htmlFor="deliveroo-restaurant-name" className="text-sm font-semibold">
    اسم المطعم
  </Label>

  <Input
    id="deliveroo-restaurant-name"
    placeholder="مثال: McDonald's Al Rai Lulu"
    value={restaurantName}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRestaurantName(e.target.value)}
    className="h-11"
    dir="auto"
  />
</div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="deliveroo-source-code" className="text-sm font-semibold">
              Deliveroo Source Code
            </Label>

            {deliverooSourceCode.length > 0 && (
              <span className="text-xs text-gray-500">
                {(deliverooSourceCode.length / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          <Textarea
            id="deliveroo-source-code"
            placeholder="الصق Source Code الخاص بصفحة Deliveroo هنا..."
            value={deliverooSourceCode}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeliverooSourceCode(e.target.value)}
            className="min-h-[300px] font-mono text-xs"
            dir="ltr"
          />

          
        </div>

        <div className="flex gap-3">
  <Button
    className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
    disabled={!deliverooSourceCode.trim()}
    onClick={handleDeliverooExtract}
  >
    <Download className="mr-2 h-5 w-5" />
    Extract Deliveroo Menu
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
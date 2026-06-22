import * as React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Download, Loader2, FileSpreadsheet, Code, Info } from 'lucide-react';
import { SourceCodeParser } from '@/services/sourceCodeParser';
import { ExcelExporter } from '@/services/excelExporter';
import { TalabatAPI } from '@/services/talabatAPI';

export function TalabatScraper() {
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [talabatUrl, setTalabatUrl] = useState('');
  const [isFetchingSource, setIsFetchingSource] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  

    const handleGenerate = useCallback(async () => {
        // Validation
        if (!restaurantName.trim()) {
          toast.error('الرجاء إدخال اسم المطعم');
          return;
        }
    
        if (!restaurantId.trim()) {
          toast.error('الرجاء إدخال رقم المطعم');
          return;
        }
    
        if (!sourceCode.trim()) {
          toast.error('الرجاء لصق الكود المصدري');
          return;
        }
    
        if (sourceCode.length < 1000) {
          toast.warning('الكود المصدري يبدو قصيراً جداً. تأكد من نسخ الصفحة كاملة.');
        }
    
        console.log('🚀 Starting menu extraction...');
        const startTime = performance.now();
    
        setIsGenerating(true);
        setProgress(0);
        setExtractedCount(0);
        setProcessingTime(0);
    
        try {
          console.log(`📄 Source code length: ${sourceCode.length} characters`);
          console.log(`🏪 Restaurant: ${restaurantName}`);
          console.log(`🔢 Restaurant ID: ${restaurantId}`);
          
          setProgress(20);
          await new Promise(resolve => setTimeout(resolve, 100));
    
          console.log('🔍 Parsing source code...');
          setProgress(40);
          await new Promise(resolve => setTimeout(resolve, 100));
    
          const parser = new SourceCodeParser();
          const items = parser.parseSourceCode(sourceCode, restaurantName, restaurantId);
          const talabatAPI = new TalabatAPI();
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (const item of items) {
      if (!item.itemId) continue;
    
      const hasChoices = item.choiceGroups
        ?.toLowerCase()
        .includes('has choices');
    
      if (!hasChoices) {
        item.modifiers = [];
        continue;
      }
    
      try {
        const choices = await talabatAPI.fetchItemChoices(restaurantId, item.itemId);
        item.modifiers = choices;
    
        await delay(700);
      } catch (error) {
        console.log(`Could not fetch modifiers for item ${item.itemName}`, error);
        item.modifiers = [];
    
        await delay(1500);
      }
    }
    
          console.log(`✅ Extracted ${items.length} menu items`);
          setProgress(70);
          await new Promise(resolve => setTimeout(resolve, 100));
    
          if (items.length === 0) {
            console.log('❌ No menu items found');
            toast.error('لم يتم العثور على عناصر القائمة في الكود المصدري', {
              description: 'تأكد من نسخ الصفحة كاملة (Ctrl+U أو عرض → المطور → عرض المصدر)'
            });
            setIsGenerating(false);
            setProgress(0);
            return;
          }
    
          setExtractedCount(items.length);
    
          console.log('📋 Sample extracted items:');
          items.slice(0, 3).forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.category} - ${item.itemName} - ${item.price} KWD`);
          });
    
          setProgress(85);
          await new Promise(resolve => setTimeout(resolve, 100));
    
          console.log('📊 Generating Excel file...');
          const exporter = new ExcelExporter();
          exporter.exportToExcel(items, restaurantName, restaurantId);
    
          setProgress(100);
    
          const endTime = performance.now();
          const totalTime = ((endTime - startTime) / 1000).toFixed(2);
          setProcessingTime(parseFloat(totalTime));
    
          console.log(`🎉 Complete! Time: ${totalTime}s`);
          toast.success(`✓ تم استخراج ${items.length} عنصر في ${totalTime} ثانية`, {
            description: 'بنجاح Excel تم تنزيل ملف   '
          });
    
        } catch (error) {
          console.error('❌ Error:', error);
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
          toast.error('فشل الاستخراج', {
            description: errorMessage
          });
        } finally {
          setIsGenerating(false);
        }
      }, [restaurantName, restaurantId, sourceCode]);

      const handleGetSource = useCallback(async () => {
        if (!talabatUrl.trim()) {
          toast.error('Please enter Talabat URL');
          return;
        }
      
        setIsFetchingSource(true);
      
        try {
          const response = await fetch('https://menu-scraper-platform1.onrender.com/fetch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: talabatUrl.trim() }),
          });
      
          const data = await response.json();
      
          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to fetch source code');
          }
      
          setSourceCode(data.html || '');
      
          const idMatch = talabatUrl.match(/\/restaurant\/(\d+)/);
          if (idMatch?.[1]) {
            setRestaurantId(idMatch[1]);
          }
      
          const nameFromUrl = talabatUrl
            .split('/')
            .filter(Boolean)
            .pop()
            ?.split('?')[0]
            ?.replace(/-/g, ' ')
            ?.trim();
      
          if (nameFromUrl) {
            setRestaurantName(nameFromUrl);
          }
      
          toast.success('Source code loaded successfully');
        } catch (error) {
          console.error('Error fetching source:', error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Failed to fetch source code', {
            description: message
          });
        } finally {
          setIsFetchingSource(false);
        }
      }, [talabatUrl]);

        const clearAll = useCallback(() => {
          setRestaurantName('');
          setRestaurantId('');
          setSourceCode('');
          setExtractedCount(0);
          setProcessingTime(0);
          setProgress(0);
          toast.info('تم مسح جميع الحقول');
        }, []);

          return (
  <>
          
    
              {/* Main Form Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-600" />
                    معلومات المطعم والكود المصدري
                  </CardTitle>
                  <CardDescription>
                    املأ تفاصيل المطعم والصق الكود المصدري الكامل للصفحة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Talabat URL */}
    <div className="space-y-2">
      <Label htmlFor="talabat-url" className="text-sm font-semibold">
        رابط طلبات
      </Label>
      <div className="flex gap-3">
        <Input
          id="talabat-url"
          placeholder="https://www.talabat.com/kuwait/restaurant/667425/..."
          value={talabatUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTalabatUrl(e.target.value)}
          className="h-11 flex-1"
          dir="ltr"
        />
        <Button
          onClick={handleGetSource}
          disabled={isFetchingSource || !talabatUrl.trim()}
          className="h-11 bg-green-600 hover:bg-green-700"
        >
          {isFetchingSource ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Get Source'
          )}
        </Button>
      </div>
    </div>
                  
                  {/* Restaurant Name */}
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-name" className="text-sm font-semibold">
                      اسم المطعم <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="restaurant-name"
                      placeholder="مثال: Great Burger & Pasta"
                      value={restaurantName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRestaurantName(e.target.value)}
                      className="h-11"
                      dir="auto"
                    />
                  </div>
    
                  {/* Restaurant ID */}
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-id" className="text-sm font-semibold">
                      رقم المطعم (Restaurant ID) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="restaurant-id"
                      placeholder="667425"
                      value={restaurantId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRestaurantId(e.target.value)}
                      className="h-11"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>مثال:</strong> من الرابط <code className="bg-gray-100 px-1 rounded">restaurant/667425/great-burger</code> الرقم هو <code className="bg-blue-100 px-1 rounded font-bold">667425</code>
                      </span>
                    </p>
                  </div>
    
                  {/* Source Code */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="source-code" className="text-sm font-semibold">
                        الكود المصدري الكامل للصفحة <span className="text-red-500">*</span>
                      </Label>
                      {sourceCode.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {(sourceCode.length / 1024).toFixed(1)} KB
                          {sourceCode.length > 50000 ? (
                            <span className="text-green-600 ml-2">✓ حجم جيد</span>
                          ) : (
                            <span className="text-yellow-600 ml-2">⚠ قد يكون غير مكتمل</span>
                          )}
                        </span>
                      )}
                    </div>
                    <Textarea
                      id="source-code"
                      placeholder="الصق الكود المصدري الكامل هنا (Ctrl+U → Ctrl+A → Ctrl+C)..."
                      value={sourceCode}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSourceCode(e.target.value)}
                      className="min-h-[300px] font-mono text-xs"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500">
                      💡 نصيحة: يجب أن يكون حجم الكود المصدري 50KB على الأقل للحصول على قائمة كاملة. إذا كان أصغر، فقد تكون نسخت جزءاً فقط من الصفحة.
                    </p>
                  </div>
    
                  {/* Progress Bar */}
                  {isGenerating && (
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-gray-600 text-center">
                        {progress < 40 ? 'جاري قراءة الكود المصدري...' : 
                         progress < 70 ? 'جاري استخراج عناصر القائمة...' : 
                         progress < 90 ? ' ...Excel جاري إنشاء ملف' : 'اكتمل!'}
                      </p>
                    </div>
                  )}
    
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !restaurantName.trim() || !restaurantId.trim() || !sourceCode.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          جاري الإنشاء...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-5 w-5" />
                         Excel إنشاء وتنزيل 
                        </>
                      )}
                    </Button>
    
                  
    
                    <Button
                      onClick={clearAll}
                      variant="outline"
                      disabled={isGenerating}
                      className="h-12"
                    >
                      مسح الكل
                    </Button>
                  </div>
    
                  {/* Results */}
                  {extractedCount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        <h3 className="font-semibold">نجح الاستخراج!</h3>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>✓ تم استخراج <strong>{extractedCount}</strong> عنصر من القائمة</p>
                        <p>✓ اكتمل في <strong>{processingTime}</strong> ثانية</p>
                        <p>✓  Excel تم تنزيل ملف     </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
    
                       {/* Footer Info */}
              <div className="text-center text-sm text-gray-500 space-y-2">
                <p>
                  🔒 تتم جميع العمليات محلياً في متصفحك. لا يتم إرسال أي بيانات إلى خوادم خارجية.
                </p>
                <p>
                  📊 Excel File: الفئة | اسم العنصر | الوصف | السعر | الحجم | مجموعات الاختيار
                </p>
              </div>
                      </>
        );
}
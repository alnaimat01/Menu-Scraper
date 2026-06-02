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

export default function Index() {
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [sourceCode, setSourceCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);

  const loadSampleData = useCallback(() => {
    setRestaurantName('Great Burger & Pasta');
    setRestaurantId('667425');
    toast.info('تم تحميل البيانات التجريبية. الآن الصق الكود المصدري من صفحة طلبات.');
  }, []);

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
        description: 'تم تنزيل ملف Excel بنجاح'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileSpreadsheet className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Talabat Menu Extractor
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            استخراج قوائم المطاعم من طلبات وإنشاء ملفات Excel بصيغة Chikex
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Instructions Card */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Info className="w-5 h-5" />
                طريقة الاستخدام (4 خطوات بسيطة)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <strong>افتح صفحة المطعم في طلبات</strong>
                    <p className="text-gray-600 mt-1">انتقل إلى أي صفحة قائمة مطعم على طلبات (مثال: https://www.talabat.com/kuwait/restaurant/667425/...)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <strong>اعرض الكود المصدري للصفحة</strong>
                    <p className="text-gray-600 mt-1">اضغط <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+U</kbd> (Windows/Linux) أو <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Cmd+Option+U</kbd> (Mac)</p>
                    <p className="text-gray-600 mt-1">أو انقر بزر الماوس الأيمن ← "عرض مصدر الصفحة"</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <strong>انسخ الكود المصدري كاملاً</strong>
                    <p className="text-gray-600 mt-1">اضغط <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+A</kbd> لتحديد الكل، ثم <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+C</kbd> للنسخ</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <strong>املأ النموذج وأنشئ الملف</strong>
                    <p className="text-gray-600 mt-1">أدخل اسم المطعم، رقم المطعم من الرابط، الصق الكود المصدري، واضغط "إنشاء Excel"</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

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
              
              {/* Restaurant Name */}
              <div className="space-y-2">
                <Label htmlFor="restaurant-name" className="text-sm font-semibold">
                  اسم المطعم <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="restaurant-name"
                  placeholder="مثال: Great Burger & Pasta"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
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
                  onChange={(e) => setRestaurantId(e.target.value)}
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
                  onChange={(e) => setSourceCode(e.target.value)}
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
                     progress < 90 ? 'جاري إنشاء ملف Excel...' : 'اكتمل!'}
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
                      إنشاء وتنزيل Excel
                    </>
                  )}
                </Button>

                <Button
                  onClick={loadSampleData}
                  variant="outline"
                  disabled={isGenerating}
                  className="h-12"
                >
                  تحميل مثال
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
                    <p>✓ تم تنزيل ملف Excel بصيغة Chikex</p>
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
              📊 صيغة Excel: الفئة | اسم العنصر | الوصف | السعر | الحجم | مجموعات الاختيار
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
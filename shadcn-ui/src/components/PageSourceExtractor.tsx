import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Code, Copy, Download, Loader2 } from 'lucide-react';

interface PageSourceExtractorProps {
  url: string;
  proxyUrl?: string;
  proxyAuth?: { username: string; password: string };
}

export function PageSourceExtractor({ url, proxyUrl, proxyAuth }: PageSourceExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [pageSource, setPageSource] = useState('');

  const extractPageSource = async () => {
    if (!url) {
      toast.error('Please enter a URL first');
      return;
    }

    setIsExtracting(true);
    try {
      // Use a CORS proxy to fetch the page
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const targetUrl = encodeURIComponent(url);
      
      const response = await fetch(corsProxy + targetUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch page');
      }

      const html = await response.text();
      setPageSource(html);
      toast.success('Page source extracted successfully!');
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Failed to extract page source. The website might be blocking requests.');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pageSource);
    toast.success('Page source copied to clipboard!');
  };

  const downloadAsFile = () => {
    const blob = new Blob([pageSource], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `page_source_${Date.now()}.html`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Page source downloaded!');
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Code className="w-5 h-5 text-blue-400" />
          Page Source Extractor
        </CardTitle>
        <CardDescription className="text-slate-400">
          Extract and view the HTML source code from any URL
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={extractPageSource}
          disabled={!url || isExtracting}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold"
        >
          {isExtracting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Code className="mr-2 h-5 w-5" />
              Extract Page Source
            </>
          )}
        </Button>

        {pageSource && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1 bg-slate-900 border-slate-600 text-slate-100 hover:bg-slate-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                onClick={downloadAsFile}
                variant="outline"
                className="flex-1 bg-slate-900 border-slate-600 text-slate-100 hover:bg-slate-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-slate-100">HTML Source Code</p>
                <p className="text-xs text-slate-400">{pageSource.length.toLocaleString()} characters</p>
              </div>
              <Textarea
                value={pageSource}
                readOnly
                className="font-mono text-xs bg-slate-900 border-slate-600 text-slate-300 h-96 resize-none"
                placeholder="Page source will appear here..."
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
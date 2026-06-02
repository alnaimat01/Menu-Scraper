import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ScraperControlsProps {
  isScraping: boolean;
  progress: number;
  onStart: () => void;
  disabled: boolean;
}

export function ScraperControls({ isScraping, progress, onStart, disabled }: ScraperControlsProps) {
  return (
    <div className="space-y-4">
      <Button
        onClick={onStart}
        disabled={disabled || isScraping}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
        size="lg"
      >
        {isScraping ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Scraping in Progress...
          </>
        ) : (
          'Start Scraping'
        )}
      </Button>

      {isScraping && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-slate-400 text-center">{progress}% Complete</p>
        </div>
      )}
    </div>
  );
}
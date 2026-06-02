import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onExport: () => void;
  disabled: boolean;
}

export function ExportButton({ onExport, disabled }: ExportButtonProps) {
  return (
    <Button
      onClick={onExport}
      disabled={disabled}
      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
      size="lg"
    >
      <Download className="mr-2 h-5 w-5" />
      Export to Excel
    </Button>
  );
}
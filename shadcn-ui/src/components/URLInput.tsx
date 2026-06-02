import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface URLInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function URLInput({ value, onChange }: URLInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="url" className="text-slate-100 font-semibold">
        Talabat Restaurant URL
      </Label>
      <Input
        id="url"
        type="url"
        placeholder="https://www.talabat.com/..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
      />
      <p className="text-xs text-slate-400">
        Enter the full URL of the restaurant's menu page on Talabat
      </p>
    </div>
  );
}
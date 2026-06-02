import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AIConfigProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

export function AIConfig({ apiKey, onApiKeyChange }: AIConfigProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">AI Configuration</CardTitle>
        <CardDescription className="text-slate-400">
          Enter your OpenAI API key for text processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="api-key" className="text-slate-100">
          OpenAI API Key
        </Label>
        <Input
          id="api-key"
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
        />
        <p className="text-xs text-slate-400">
          Your API key is used to capitalize item names and will not be stored
        </p>
      </CardContent>
    </Card>
  );
}
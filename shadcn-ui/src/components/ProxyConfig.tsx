import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProxyConfigProps {
  proxyUrl: string;
  proxyUsername: string;
  proxyPassword: string;
  onProxyUrlChange: (value: string) => void;
  onProxyUsernameChange: (value: string) => void;
  onProxyPasswordChange: (value: string) => void;
}

export function ProxyConfig({
  proxyUrl,
  proxyUsername,
  proxyPassword,
  onProxyUrlChange,
  onProxyUsernameChange,
  onProxyPasswordChange,
}: ProxyConfigProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">Proxy Configuration</CardTitle>
        <CardDescription className="text-slate-400">
          Optional: Configure proxy settings for scraping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="proxy-url" className="text-slate-100">
            Proxy URL
          </Label>
          <Input
            id="proxy-url"
            type="text"
            placeholder="http://proxy.example.com:8080"
            value={proxyUrl}
            onChange={(e) => onProxyUrlChange(e.target.value)}
            className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proxy-username" className="text-slate-100">
              Username
            </Label>
            <Input
              id="proxy-username"
              type="text"
              placeholder="username"
              value={proxyUsername}
              onChange={(e) => onProxyUsernameChange(e.target.value)}
              className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxy-password" className="text-slate-100">
              Password
            </Label>
            <Input
              id="proxy-password"
              type="password"
              placeholder="password"
              value={proxyPassword}
              onChange={(e) => onProxyPasswordChange(e.target.value)}
              className="bg-slate-900 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
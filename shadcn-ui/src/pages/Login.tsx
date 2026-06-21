import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Prevents double clicking the login button while the API request is running
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic frontend validation before sending request to backend
        if (!username.trim() || !password.trim()) {
            toast.error('Username و Password مطلوبين');
            return;
        }

        try {
            setIsLoading(true);

            // Send login request to the Express backend
            // Backend checks MongoDB, bcrypt password, active status, and subscription dates
            const response = await fetch('https://menu-scraper1.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                }),
            });

            const data = await response.json();

            // If backend rejects login, show the error message
            if (!response.ok || !data.success) {
                toast.error(data.error || 'Username أو Password غير صحيح');
                return;
            }

            // Store login token for future protected API requests
            localStorage.setItem('menuExtractorToken', data.token);

            // Store user info for frontend display and role-based pages
            localStorage.setItem(
                'menuExtractorUser',
                JSON.stringify({
                    username: data.user.username,
                    role: data.user.role,
                })
            );

            toast.success('تم تسجيل الدخول بنجاح');
            navigate('/');
        } catch (error) {
            console.error('Login request failed:', error);
            toast.error('فشل الاتصال بالسيرفر');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Menu Extractor</CardTitle>
                    <CardDescription>Login to continue</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                disabled={isLoading}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
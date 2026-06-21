import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type User = {
    _id: string;
    username: string;
    role: 'superadmin' | 'admin' | 'user';
    isActive: boolean;
    startDate: string;
    endDate: string;
    createdAt: string;
    lastLogin: string | null;
};

export default function Admin() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const today = new Date().toISOString().slice(0, 10);
    const navigate = useNavigate();

    const totalUsers = users.length;
    const activeUsers = users.filter(
        (user) => user.isActive && today >= user.startDate && today <= user.endDate
    ).length;
    const expiredUsers = users.filter((user) => today > user.endDate).length;
    const adminUsers = users.filter((user) => user.role === 'admin').length;

    // Load users from backend when Admin page opens
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('https://menu-scraper1.onrender.com/api/users');
                const data = await response.json();

                if (data.success) {
                    setUsers(data.users);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUsername || !newPassword || !newRole || !newStartDate || !newEndDate) {
            toast.error('All fields are required');
            return;
        }

        try {
            setIsCreating(true);

            // Send new user data to backend
            const response = await fetch('https://menu-scraper1.onrender.com//api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    role: newRole,
                    startDate: newStartDate,
                    endDate: newEndDate,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                toast.error(data.error || 'Failed to create user');
                return;
            }

            toast.success('User created successfully');

            // Add created user to the current table without refreshing the page
            setUsers((currentUsers) => [
                ...currentUsers,
                {
                    _id: data.user.id,
                    username: data.user.username,
                    role: data.user.role,
                    isActive: true,
                    startDate: newStartDate,
                    endDate: newEndDate,
                    createdAt: new Date().toISOString().slice(0, 10),
                },
            ]);

            // Reset form
            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
            setNewStartDate('');
            setNewEndDate('');
            setShowCreateForm(false);
        } catch (error) {
            console.error('Create user failed:', error);
            toast.error('Failed to connect to server');
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`https://menu-scraper1.onrender.com/api/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isActive: !currentStatus,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                toast.error(data.error || 'Failed to update user status');
                return;
            }

            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user._id === userId
                        ? { ...user, isActive: data.user.isActive }
                        : user
                )
            );

            toast.success(data.message);
        } catch (error) {
            console.error('Toggle user status failed:', error);
            toast.error('Failed to connect to server');
        }
    };

    // ==========================================
    // Admin Access Protection
    // Only admin users can access this page
    // ==========================================

    const currentUser = JSON.parse(
        localStorage.getItem('menuExtractorUser') || '{}'
    );

    if (
        currentUser.role !== 'admin' &&
        currentUser.role !== 'superadmin'
    ) {
        return (
            <div className="container mx-auto p-8">
                <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    // ==========================================
    // Delete user from MongoDB
    // ==========================================
    const handleDeleteUser = async (userId: string, username: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${username}" ?`
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `https://menu-scraper1.onrender.com/api/users/${userId}`,
                {
                    method: 'DELETE',
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                toast.error(data.error || 'Failed to delete user');
                return;
            }

            // Remove deleted user from current table
            setUsers((currentUsers) =>
                currentUsers.filter((user) => user._id !== userId)
            );

            toast.success('User deleted successfully');
        } catch (error) {
            console.error('Delete user failed:', error);
            toast.error('Failed to connect to server');
        }
    };

    const startEditingUser = (user: User) => {
        setEditingUserId(user._id);
        setEditStartDate(user.startDate);
        setEditEndDate(user.endDate);
        setEditPassword('');
    };

    const cancelEditingUser = () => {
        setEditingUserId(null);
        setEditStartDate('');
        setEditEndDate('');
        setEditPassword('');
    };

    const handleUpdateUser = async (userId: string) => {
        if (!editStartDate || !editEndDate) {
            toast.error('Start date and end date are required');
            return;
        }

        try {
            setIsUpdating(true);

            const response = await fetch(`https://menu-scraper1.onrender.com/api/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate: editStartDate,
                    endDate: editEndDate,
                    password: editPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                toast.error(data.error || 'Failed to update user');
                return;
            }

            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user._id === userId
                        ? {
                            ...user,
                            startDate: data.user.startDate,
                            endDate: data.user.endDate,
                        }
                        : user
                )
            );

            toast.success('User updated successfully');
            cancelEditingUser();
        } catch (error) {
            console.error('Update user failed:', error);
            toast.error('Failed to connect to server');
        } finally {
            setIsUpdating(false);
        }
    };

    const calculateRemainingDays = (endDate: string) => {
        const todayDate = new Date();
        const expiryDate = new Date(endDate);

        const difference = expiryDate.getTime() - todayDate.getTime();

        const days = Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        );

        return days;
    };
    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.username
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        if (!matchesSearch) {
            return false;
        }

        if (statusFilter === 'active') {
            return user.isActive && today <= user.endDate;
        }

        if (statusFilter === 'expired') {
            return today > user.endDate;
        }

        if (statusFilter === 'disabled') {
            return !user.isActive;
        }

        return true;
    });

    const handleExtendSubscription = async (
        userId: string,
        days: number
    ) => {
        try {
            const response = await fetch(
                `https://menu-scraper1.onrender.com/api/users/${userId}/extend`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ days }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                toast.error(data.error || 'Failed to extend subscription');
                return;
            }

            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user._id === userId
                        ? {
                            ...user,
                            endDate: data.user.endDate,
                        }
                        : user
                )
            );

            toast.success(`Extended by ${days} days`);
        } catch (error) {
            console.error('Extend subscription failed:', error);
            toast.error('Failed to connect to server');
        }
    };

    return (
        <div className="container mx-auto p-8">
            {/* Back button to return to Menu Extractor */}
            <div className="mb-6">
                <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                >
                    ← Back
                </Button>
            </div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground mb-8">User management panel</p>
            <div className="flex justify-end mb-6">
                <Button onClick={() => setShowCreateForm(true)}>
                    + Create User
                </Button>
            </div>
            {showCreateForm && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Create New User</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder="Enter username"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Role</Label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={newStartDate}
                                    onChange={(e) => setNewStartDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={newEndDate}
                                    onChange={(e) => setNewEndDate(e.target.value)}
                                />
                            </div>

                            <div className="flex items-end gap-3">
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating ? 'Creating...' : 'Create User'}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalUsers}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{activeUsers}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Expired Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{expiredUsers}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Admins</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{adminUsers}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="mb-4">
                <Input
                    placeholder="Search username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 mb-4">
                <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                >
                    All
                </Button>

                <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('active')}
                >
                    Active
                </Button>

                <Button
                    variant={statusFilter === 'expired' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('expired')}
                >
                    Expired
                </Button>

                <Button
                    variant={statusFilter === 'disabled' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('disabled')}
                >
                    Disabled
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Users ({users.length})</CardTitle>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <p>Loading users...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-3 px-4 font-semibold">Username</th>
                                        <th className="py-3 px-4 font-semibold">Role</th>
                                        <th className="py-3 px-4 font-semibold">Status</th>
                                        <th className="py-3 px-4 font-semibold">Start Date</th>
                                        <th className="py-3 px-4 font-semibold">End Date</th>
                                        <th className="py-3 px-4 font-semibold">Remaining</th>
                                        <th className="py-3 px-4 font-semibold">Last Login</th>
                                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <>
                                            <tr key={user._id} className="border-b">
                                                <td className="py-3 px-4 font-medium">
                                                    {user.username}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {user.role}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {today > user.endDate ? (
                                                        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                                                            Expired
                                                        </span>
                                                    ) : !user.isActive ? (
                                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                                            Disabled
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>


                                                <td className="py-3 px-4">
                                                    {user.startDate}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {user.endDate}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {today > user.endDate ? (
                                                        <span className="text-red-600 font-medium">
                                                            Expired
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium">
                                                            {calculateRemainingDays(user.endDate)} Days
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {user.lastLogin
                                                        ? new Date(user.lastLogin).toLocaleString()
                                                        : 'Never'}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {user.role !== 'superadmin' && (
                                                            <Button
                                                                variant={user.isActive ? 'outline' : 'default'}
                                                                onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                                                            >
                                                                {user.isActive ? 'Disable' : 'Enable'}
                                                            </Button>
                                                        )}
                                                        {user.role !== 'superadmin' && (
                                                            <Button
                                                                variant="destructive"
                                                                onClick={() => handleDeleteUser(user._id, user.username)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        )}
                                                        {user.role !== 'superadmin' && (
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => startEditingUser(user)}
                                                            >
                                                                Edit
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleExtendSubscription(user._id, 30)}
                                                        >
                                                            +30 Days
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {editingUserId === user._id && (
                                                <tr className="border-b bg-muted/40">
                                                    <td colSpan={6} className="p-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Start Date</Label>
                                                                <Input
                                                                    type="date"
                                                                    value={editStartDate}
                                                                    onChange={(e) => setEditStartDate(e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label>End Date</Label>
                                                                <Input
                                                                    type="date"
                                                                    value={editEndDate}
                                                                    onChange={(e) => setEditEndDate(e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <Label>New Password</Label>
                                                                <Input
                                                                    type="password"
                                                                    placeholder="Leave empty to keep current"
                                                                    value={editPassword}
                                                                    onChange={(e) => setEditPassword(e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="flex items-end gap-2">
                                                                <Button
                                                                    onClick={() => handleUpdateUser(user._id)}
                                                                    disabled={isUpdating}
                                                                >
                                                                    {isUpdating ? 'Saving...' : 'Save'}
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    onClick={cancelEditingUser}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
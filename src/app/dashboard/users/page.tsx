'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, UserPlus, Shield, UserCog, Check, X, Ban,
    Unlock, Lock, Loader2, RefreshCw, Key, ArrowLeft, Monitor
} from 'lucide-react';

interface User {
    id: string;
    username: string;
    employeeId: string | null;
    role: 'admin' | 'supervisor' | 'user' | 'kiosk';
    status: 'pending' | 'approved' | 'disabled';
    createdAt: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [currentUsername, setCurrentUsername] = useState<string>('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);

    // Add User Form
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserEmployeeId, setNewUserEmployeeId] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('user');

    // Edit User (Employee ID and Role)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editEmployeeId, setEditEmployeeId] = useState('');
    const [editRole, setEditRole] = useState('user');

    // Password Reset Form
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [resetPassword, setResetPassword] = useState('');

    const [actionLoading, setActionLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const router = useRouter();

    useEffect(() => {
        checkAuthAndLoadUsers();
    }, []);

    const checkAuthAndLoadUsers = async () => {
        try {
            // Check auth
            const authRes = await fetch('/api/auth');
            const authData = await authRes.json();

            if (!authData.authenticated) {
                router.push('/login');
                return;
            }

            if (authData.role !== 'admin' && authData.role !== 'supervisor') {
                router.push('/dashboard'); // Unauthorized
                return;
            }

            setCurrentUserRole(authData.role);
            setCurrentUsername(authData.username);

            // Load users
            const usersRes = await fetch('/api/users');
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setMsg({ type: '', text: '' });

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUserUsername,
                    employeeId: newUserEmployeeId,
                    password: newUserPassword,
                    role: newUserRole
                })
            });

            const data = await res.json();
            if (res.ok) {
                setUsers([data.user, ...users]);
                setIsAddModalOpen(false);
                setNewUserUsername('');
                setNewUserEmployeeId('');
                setNewUserPassword('');
                setMsg({ type: 'success', text: `User ${data.user.username} created successfully` });
            } else {
                setMsg({ type: 'error', text: data.error || 'Failed to create user' });
            }
        } catch {
            setMsg({ type: 'error', text: 'Error creating user' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async (userId: string, status: string) => {
        if (!confirm(`Are you sure you want to set status to ${status}?`)) return;

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, status: status as any } : u));
            } else {
                alert('Failed to update status');
            }
        } catch {
            alert('Error updating status');
        }
    };

    const handleUpdateUserInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: editEmployeeId,
                    role: editRole
                })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === selectedUser.id ? { ...u, employeeId: editEmployeeId, role: editRole as any } : u));
                setIsEditModalOpen(false);
                setEditEmployeeId('');
                setMsg({ type: 'success', text: 'User info updated successfully' });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update user info');
            }
        } catch {
            alert('Error updating user info');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to delete user ${user.username}?`)) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== user.id));
            } else {
                alert('Failed to delete user');
            }
        } catch {
            alert('Error deleting user');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-100 min-h-screen text-black">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                        title="Go Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-8 h-8 text-purple-600" />
                            User Management
                        </h1>
                        <p className="text-slate-500">Manage access and permissions</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            {msg.text && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {msg.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {msg.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-black">User</th>
                                <th className="px-6 py-4 font-bold text-black">Employee ID</th>
                                <th className="px-6 py-4 font-bold text-black">Role</th>
                                <th className="px-6 py-4 font-bold text-black">Status</th>
                                <th className="px-6 py-4 font-bold text-black">Created</th>
                                <th className="px-6 py-4 font-bold text-black text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-black">{user.username}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-500 font-mono text-xs">{user.employeeId || 'Not Set'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${user.username === 'superadmin' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border border-amber-200' :
                                                user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'supervisor' ? 'bg-indigo-100 text-indigo-700' :
                                                        user.role === 'kiosk' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-700'}`}>
                                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                            {user.role === 'supervisor' && <UserCog className="w-3 h-3" />}
                                            {user.role === 'kiosk' && <Monitor className="w-3 h-3" />}
                                            {user.username === 'superadmin' ? 'Super Admin' : user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${user.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                user.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'}`}>
                                            {user.status === 'approved' ? 'Active' :
                                                user.status === 'pending' ? 'Pending Approval' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {user.status === 'pending' && (
                                            <button
                                                onClick={() => handleUpdateStatus(user.id, 'approved')}
                                                className="text-green-600 hover:text-green-800 font-medium text-xs bg-green-50 px-2 py-1 rounded"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {user.status !== 'disabled' ? (
                                            <button
                                                onClick={() => handleUpdateStatus(user.id, 'disabled')}
                                                className="text-slate-400 hover:text-red-600 p-1"
                                                title="Disable Account"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleUpdateStatus(user.id, 'approved')}
                                                className="text-slate-400 hover:text-green-600 p-1"
                                                title="Enable Account"
                                            >
                                                <Unlock className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setEditEmployeeId(user.employeeId || '');
                                                setEditRole(user.role);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="text-slate-400 hover:text-purple-600 p-1"
                                            title="Edit User Info"
                                        >
                                            <UserCog className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => { setSelectedUser(user); setIsPassModalOpen(true); }}
                                            className="text-slate-400 hover:text-blue-600 p-1"
                                            title="Reset Password"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>

                                        {(currentUserRole === 'admin' || (currentUserRole === 'supervisor' && user.role === 'user')) && (
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="text-slate-400 hover:text-red-700 p-1"
                                                title="Delete User"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add New User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newUserUsername}
                                    onChange={e => setNewUserUsername(e.target.value)}
                                    placeholder="Real name or login name"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID (for AI Privacy)</label>
                                <input
                                    type="text"
                                    value={newUserEmployeeId}
                                    onChange={e => setNewUserEmployeeId(e.target.value)}
                                    placeholder="e.g. EMP001"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input
                                    type="text"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                    required
                                    placeholder="Initial password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={e => setNewUserRole(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                >
                                    <option value="user">User</option>
                                    <option value="kiosk">Kiosk</option>
                                    {currentUserRole === 'admin' && <option value="supervisor">Supervisor</option>}
                                    {currentUsername === 'superadmin' && <option value="admin">Admin</option>}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Edit User Info</h2>
                        <p className="text-slate-500 mb-4">Updating <b>{selectedUser.username}</b></p>
                        <form onSubmit={handleUpdateUserInfo} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                                <input
                                    type="text"
                                    value={editEmployeeId}
                                    onChange={e => setEditEmployeeId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                    placeholder="e.g. EMP001"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">This ID will be used by AI to protect privacy.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                >
                                    <option value="user">User</option>
                                    <option value="kiosk">Kiosk</option>
                                    {currentUserRole === 'admin' && <option value="supervisor">Supervisor</option>}
                                    {currentUsername === 'superadmin' && <option value="admin">Admin</option>}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {isPassModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                        <p className="text-slate-500 mb-4">Set new password for <b>{selectedUser.username}</b></p>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setActionLoading(true);
                            try {
                                const res = await fetch(`/api/users/${selectedUser.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ password: resetPassword })
                                });
                                if (res.ok) {
                                    setIsPassModalOpen(false);
                                    setResetPassword('');
                                    setMsg({ type: 'success', text: 'Password updated successfully' });
                                } else {
                                    const data = await res.json();
                                    alert(data.error || 'Failed to reset password');
                                }
                            } catch { alert('Error resetting password'); }
                            finally { setActionLoading(false); }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                <input
                                    type="text"
                                    value={resetPassword}
                                    onChange={e => setResetPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-black font-medium"
                                    required
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsPassModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Set Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
    Users as UsersIcon,
    LayoutDashboard,
    LogOut,
    
    Trash2,
    Loader2,
    Shield,
    Mail,
    Calendar,
    UserCheck,
    UserX,
    Search,
    Filter
} from 'lucide-react';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/');
            setUsers(response.data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: number, approved: boolean) => {
        setActionLoading(userId);
        try {
            await api.patch(`/users/${userId}/approve?approved=${approved}`);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'İşlem başarısız');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm('Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?')) return;
        setActionLoading(userId);
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Silme işlemi başarısız');
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const filteredUsers = users.filter(u =>
        (u.first_name + ' ' + u.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
            {/* Background Map Simulation for Dashboard (Or just cool dark gradient) */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />

            {/* Glowing Orb Effects */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-900/20 blur-[120px] rounded-full z-0 pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-900/20 blur-[120px] rounded-full z-0 pointer-events-none" />

            {/* Sidebar */}
            <aside className="w-full md:w-64 glass-panel border-r border-white/5 flex flex-col z-10 relative">
                <div className="p-6 border-b border-white/5">
                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="h-10 w-10 bg-cyan-500/20 border border-cyan-500/50 rounded-xl flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                            <Shield className="h-5 w-5" />
                        </div>
                        Command Center
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto font-medium">
                    <button
                        onClick={() => navigate('/admin')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all"
                    >
                        <LayoutDashboard className="h-5 w-5" /> Dashboard
                    </button>
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-xl transition-all"
                    >
                        <UsersIcon className="h-5 w-5" /> Kullanıcı Yönetimi
                    </button>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all font-bold"
                    >
                        <LogOut className="h-5 w-5" /> Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10 z-10 relative">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">User Management</h2>
                        <p className="text-slate-400 mt-2 text-sm">Approve and manage stakeholder platform access.</p>
                    </div>
                </header>

                {/* Filters / Search Bar (Frosted Glass) */}
                <div className="mb-6 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-sm"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-slate-900/50 border border-white/10 px-5 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all backdrop-blur-sm">
                        <Filter className="h-5 w-5" /> Filter
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 glass-card rounded-3xl border border-white/5 shadow-sm">
                        <Loader2 className="h-10 w-10 text-cyan-500 animate-spin mb-4" />
                        <p className="font-bold text-slate-400">Loading users...</p>
                    </div>
                ) : (
                    <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/50 border-b border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-24">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">No users found.</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex justify-center flex-col items-center gap-1">
                                                    {user.is_approved ? (
                                                        <>
                                                            <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                                                            <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Active</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"></div>
                                                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Pending</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-white/10 shadow-inner">
                                                        {user.first_name?.[0]}{user.last_name?.[0]}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white leading-tight">
                                                            {user.first_name} {user.last_name}
                                                        </span>
                                                        <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                                                            <Mail className="h-3 w-3" /> {user.email || user.username}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border ${user.role === 'ADMIN'
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                                                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    {actionLoading === user.id ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                                    ) : (
                                                        <>
                                                            {!user.is_approved ? (
                                                                <button
                                                                    onClick={() => handleApprove(user.id, true)}
                                                                    className="p-2.5 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:text-green-300 rounded-xl transition-all shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                                                    title="Approve"
                                                                >
                                                                    <UserCheck className="h-4 w-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleApprove(user.id, false)}
                                                                    className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 rounded-xl transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                                                    title="Suspend"
                                                                >
                                                                    <UserX className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminUsers;

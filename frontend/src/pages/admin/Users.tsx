import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
    Users as UsersIcon,
    LayoutDashboard,
    LogOut,
    CheckCircle2,
    Trash2,
    Loader2,
    Shield,
    Mail,
    Calendar,
    UserCheck,
    UserX
} from 'lucide-react';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
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

    return (
        <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-primary-700 flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                            <Shield className="h-5 w-5" />
                        </div>
                        Paydaş Panel
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto font-medium">
                    <button
                        onClick={() => navigate('/admin')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all"
                    >
                        <LayoutDashboard className="h-5 w-5" /> Dashboard
                    </button>
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-xl transition-all"
                    >
                        <UsersIcon className="h-5 w-5" /> Kullanıcılar
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold"
                    >
                        <LogOut className="h-5 w-5" /> Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
                    <p className="text-gray-500 mt-1">Platformdaki kullanıcı kayıtlarını onaylayın veya yönetin.</p>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <Loader2 className="h-10 w-10 text-primary-600 animate-spin mb-4" />
                        <p className="font-bold text-gray-400">Kullanıcılar yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-16">Durum</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kayıt Tarihi</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium">Kullanıcı kaydı bulunamadı.</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                {user.is_approved ? (
                                                    <div className="flex justify-center" title="Onaylı">
                                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center" title="Onay Bekliyor">
                                                        <Clock className="h-5 w-5 text-amber-500" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 leading-tight">
                                                        {user.first_name} {user.last_name}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Mail className="h-3 w-3" /> {user.email || user.username}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${user.role === 'ADMIN'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-primary-100 text-primary-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {actionLoading === user.id ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                                                    ) : (
                                                        <>
                                                            {!user.is_approved ? (
                                                                <button
                                                                    onClick={() => handleApprove(user.id, true)}
                                                                    className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                                                                    title="Onayla"
                                                                >
                                                                    <UserCheck className="h-4 w-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleApprove(user.id, false)}
                                                                    className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-all"
                                                                    title="Askıya Al"
                                                                >
                                                                    <UserX className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                                                title="Sil"
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

// Internal icon proxy
const Clock = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export default AdminUsers;

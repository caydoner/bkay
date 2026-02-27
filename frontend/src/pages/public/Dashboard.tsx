import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Map as MapIcon, Loader2, ClipboardList } from 'lucide-react';
import api from '../../lib/api';

const PublicDashboard: React.FC = () => {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAssignments = async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                navigate('/login');
                return;
            }

            try {
                const response = await api.get(`/schema/user/assignments/${userId}`);
                setAssignments(response.data || []);
            } catch (err) {
                console.error('Error fetching assignments:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleOpenMap = (projectId: string) => {
        navigate(`/public/map/${projectId}`);
    };

    return (
        <div className="flex-1 bg-slate-900/50 text-slate-200 min-h-screen">
            <nav className="glass-panel border-white/5 border-b border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <h1 className="text-xl font-bold text-white">Paydaş Paneli</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-400 hidden sm:block">
                                Hoş geldin, {localStorage.getItem('username') || 'Kullanıcı'}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-900/50 text-slate-200 rounded-xl"
                                title="Çıkış Yap"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <header className="mb-10">
                    <h2 className="text-3xl font-bold text-white">Görevlerim</h2>
                    <p className="text-slate-400 mt-2">Size atanan veri toplama projeleri ve formlar.</p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="glass-panel border-white/5 rounded-3xl border-2 border-dashed border-white/10 py-20 text-center">
                        <div className="h-16 w-16 bg-slate-900/50 text-slate-200 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                            <ClipboardList className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Atanmış görev yok</h3>
                        <p className="text-slate-400">Henüz size bir proje atanmamış.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="group glass-panel border-white/5 p-8 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 hover:shadow-xl hover:border-primary-100 transition-all flex flex-col items-center text-center">
                                <div className="h-20 w-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                                    <MapIcon className="h-10 w-10" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                                    {assignment.project_name}
                                </h3>
                                <p className="text-sm text-slate-400 mb-8 line-clamp-2 min-h-[40px]">
                                    {assignment.project_description || 'Proje açıklaması bulunmuyor.'}
                                </p>
                                <button
                                    onClick={() => handleOpenMap(assignment.project_id)}
                                    className="w-full bg-cyan-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-100 hover:bg-cyan-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Veri Girişini Başlat
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PublicDashboard;

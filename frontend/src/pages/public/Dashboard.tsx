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
        <div className="flex-1 bg-gray-50 min-h-screen">
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">Paydaş Paneli</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500 hidden sm:block">
                                Hoş geldin, {localStorage.getItem('username') || 'Kullanıcı'}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 rounded-xl"
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
                    <h2 className="text-3xl font-bold text-gray-900">Görevlerim</h2>
                    <p className="text-gray-500 mt-2">Size atanan veri toplama projeleri ve formlar.</p>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 py-20 text-center">
                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                            <ClipboardList className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Atanmış görev yok</h3>
                        <p className="text-gray-500">Henüz size bir proje atanmamış.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {assignments.map((assignment) => (
                            <div key={assignment.id} className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-100 transition-all flex flex-col items-center text-center">
                                <div className="h-20 w-20 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
                                    <MapIcon className="h-10 w-10" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                                    {assignment.project_name}
                                </h3>
                                <p className="text-sm text-gray-500 mb-8 line-clamp-2 min-h-[40px]">
                                    {assignment.project_description || 'Proje açıklaması bulunmuyor.'}
                                </p>
                                <button
                                    onClick={() => handleOpenMap(assignment.project_id)}
                                    className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-100 hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2"
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

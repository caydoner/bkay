import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
    Plus,
    Map as MapIcon,
    ClipboardList,
    Users,
    LayoutDashboard,
    LogOut,
    ChevronRight,
    Clock,
    X,
    FolderPlus
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await api.get('/projects/');
            setProjects(response.data || []);
        } catch (err) {
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/projects/', newProject);
            setIsModalOpen(false);
            setNewProject({ name: '', description: '' });
            fetchProjects();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Proje oluşturulurken bir hata oluştu');
        } finally {
            setCreating(false);
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
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-xl transition-all">
                        <LayoutDashboard className="h-5 w-5" /> Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all"
                    >
                        <Users className="h-5 w-5" /> Kullanıcı Yönetimi
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
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Aktif Projeler</h2>
                        <p className="text-gray-500 mt-1">Veri toplama süreçlerini buradan yönetebilirsiniz.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <Plus className="h-5 w-5" /> Yeni Proje
                    </button>
                </header>

                {/* Project Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="h-3 bg-gray-100 rounded w-full mb-2"></div>
                                <div className="h-3 bg-gray-100 rounded w-full"></div>
                            </div>
                        ))
                    ) : projects.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">Henüz proje yok</h3>
                            <p className="text-gray-500">İlk projenizi oluşturarak başlayın.</p>
                        </div>
                    ) : (
                        projects.map(project => (
                            <div
                                key={project.id}
                                className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-100 transition-all cursor-pointer"
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                                        <MapIcon className="h-6 w-6" />
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">
                                        Aktif
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-6 font-medium">
                                    {project.description || 'Açıklama belirtilmemiş.'}
                                </p>
                                <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {new Date(project.created_at).toLocaleDateString('tr-TR')}
                                    </div>
                                    <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                                    <FolderPlus className="h-5 w-5" />
                                </div>
                                Yeni Proje Oluştur
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Proje Adı</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    placeholder="Örn: Bölgesel Tarım Analizi"
                                    className="w-full bg-gray-50 border border-gray-100 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Açıklama</label>
                                <textarea
                                    rows={4}
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    placeholder="Proje hedeflerini kısaca açıklayın..."
                                    className="w-full bg-gray-50 border border-gray-100 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900 font-medium resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all border border-gray-100"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-2 bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {creating ? 'Oluşturuluyor...' : 'Projeyi Başlat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal icon proxy because I forgot to import highlight from shield
const Shield = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);

export default AdminDashboard;

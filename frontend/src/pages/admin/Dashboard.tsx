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
    FolderPlus,
    Shield
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
        <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
            {/* Background Map Simulation for Dashboard (Or just cool dark gradient) */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80" />

            {/* Glowing Orb Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-900/20 blur-[120px] rounded-full z-0 pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/20 blur-[120px] rounded-full z-0 pointer-events-none" />

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
                    <button className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-xl transition-all">
                        <LayoutDashboard className="h-5 w-5" /> Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all"
                    >
                        <Users className="h-5 w-5" /> Kullanıcı Yönetimi
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
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Active Projects</h2>
                        <p className="text-slate-400 mt-2 text-sm">Manage data collection instances and stakeholder analytics.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="neon-btn"
                    >
                        <Plus className="h-5 w-5" /> New Project
                    </button>
                </header>

                {/* Project Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse border-transparent bg-slate-800/30">
                                <div className="h-4 bg-slate-700/50 rounded w-1/2 mb-4"></div>
                                <div className="h-3 bg-slate-800/50 rounded w-full mb-2"></div>
                                <div className="h-3 bg-slate-800/50 rounded w-full"></div>
                            </div>
                        ))
                    ) : projects.length === 0 ? (
                        <div className="col-span-full py-24 text-center glass-card rounded-3xl border border-dashed border-slate-700 flex flex-col items-center">
                            <div className="h-16 w-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                                <ClipboardList className="h-8 w-8 text-cyan-500/50" />
                            </div>
                            <h3 className="text-xl font-bold text-white">No projects found</h3>
                            <p className="text-slate-400 mt-2">Initialize your first data collection project.</p>
                        </div>
                    ) : (
                        projects.map(project => (
                            <div
                                key={project.id}
                                className="group glass-card rounded-2xl p-6 cursor-pointer relative overflow-hidden"
                                onClick={() => navigate(`/admin/project/${project.id}`)}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-5">
                                    <div className="h-12 w-12 bg-slate-800/80 border border-white/5 rounded-xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                                        <MapIcon className="h-6 w-6" />
                                    </div>
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                        Active
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-sm text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed">
                                    {project.description || 'No description provided.'}
                                </p>
                                <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs font-bold text-slate-500 group-hover:text-slate-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        {new Date(project.created_at).toLocaleDateString('tr-TR')}
                                    </div>
                                    <div className="bg-white/5 p-1.5 rounded-lg group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors">
                                        <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/40">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="h-10 w-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                                    <FolderPlus className="h-5 w-5" />
                                </div>
                                Initialize Project
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    placeholder="e.g. Urban Redevelopment Zone A"
                                    className="w-full bg-slate-950/50 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white font-medium placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                                <textarea
                                    rows={4}
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    placeholder="Brief overview of spatial analysis objectives..."
                                    className="w-full bg-slate-950/50 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white font-medium placeholder:text-slate-600 resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-6 mt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-4 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-[2] neon-btn disabled:opacity-50 disabled:shadow-none"
                                >
                                    {creating ? 'Initializing...' : 'Deploy Project Instance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

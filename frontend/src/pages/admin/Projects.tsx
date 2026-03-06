import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import {
    Plus,
    Map as MapIcon,
    ClipboardList,
    Users,
    LogOut,
    ChevronRight,
    Clock,
    X,
    FolderPlus,
    Shield,
    Settings
} from 'lucide-react';

const AdminProjects: React.FC = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any | null>(null);
    const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'IN_PROGRESS' });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingProject) {
                await api.patch(`/projects/${editingProject.id}`, projectForm);
                setEditingProject(null);
            } else {
                await api.post('/projects/', projectForm);
                setIsCreateModalOpen(false);
            }
            setProjectForm({ name: '', description: '', status: 'IN_PROGRESS' });
            fetchProjects();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Proje kaydedilirken bir hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!editingProject) return;
        setDeleting(true);
        try {
            await api.delete(`/projects/${editingProject.id}`);
            setEditingProject(null);
            setIsDeleteConfirmOpen(false);
            fetchProjects();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Proje silinirken bir hata oluştu');
        } finally {
            setDeleting(false);
        }
    };

    const openCreateModal = () => {
        setProjectForm({ name: '', description: '', status: 'IN_PROGRESS' });
        setIsCreateModalOpen(true);
        setIsDeleteConfirmOpen(false);
    };

    const openEditModal = (e: React.MouseEvent, project: any) => {
        e.stopPropagation(); // prevent card click
        setProjectForm({
            name: project.name,
            description: project.description || '',
            status: project.status || 'IN_PROGRESS'
        });
        setEditingProject(project);
        setIsDeleteConfirmOpen(false);
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
                        <ClipboardList className="h-5 w-5" /> Projects
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
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Projects</h2>
                        <p className="text-slate-400 mt-2 text-sm">Manage data collection instances and stakeholder analytics.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="neon-btn"
                    >
                        <Plus className="h-5 w-5" /> New Project
                    </button>
                </header>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-card rounded-2xl p-6 border-white/5 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> Total Projects
                        </p>
                        <h3 className="text-4xl font-black text-white">{projects.length}</h3>
                    </div>
                    <div className="glass-card rounded-2xl p-6 border-white/5 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all"></div>
                        <p className="text-[11px] font-bold text-cyan-500/80 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" /> In Progress
                        </p>
                        <h3 className="text-4xl font-black text-cyan-400">
                            {projects.filter(p => !p.status || p.status === 'IN_PROGRESS').length}
                        </h3>
                    </div>
                    <div className="glass-card rounded-2xl p-6 border-white/5 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                        <p className="text-[11px] font-bold text-emerald-500/80 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Completed
                        </p>
                        <h3 className="text-4xl font-black text-emerald-400">
                            {projects.filter(p => p.status === 'COMPLETED').length}
                        </h3>
                    </div>
                </div>

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
                                    <div className="flex gap-3">
                                        <div className="h-12 w-12 bg-slate-800/80 border border-white/5 rounded-xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                                            <MapIcon className="h-6 w-6" />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            {(!project.status || project.status === 'IN_PROGRESS') ? (
                                                <span className="flex w-max items-center gap-1.5 text-[10px] font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                                    IN PROGRESS
                                                </span>
                                            ) : (
                                                <span className="flex w-max items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                    COMPLETED
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => openEditModal(e, project)}
                                        className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-all"
                                        title="Proje Ayarları"
                                    >
                                        <Settings className="h-5 w-5" />
                                    </button>
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

            {/* Create/Edit Project Modal */}
            {(isCreateModalOpen || editingProject) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/40">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="h-10 w-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                                    <FolderPlus className="h-5 w-5" />
                                </div>
                                {editingProject ? 'Proje Ayarları' : 'Initialize Project'}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingProject(null);
                                    setIsDeleteConfirmOpen(false);
                                }}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {isDeleteConfirmOpen ? (
                            <div className="p-8 space-y-6">
                                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                                    <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
                                    <h4 className="text-xl font-bold text-white mb-2">Dikkat! Proje Siliniyor</h4>
                                    <p className="text-red-300 font-medium leading-relaxed">
                                        Bu projeyi silmek istediğinize emin misiniz? Projeyle beraber projede toplanmış olan <strong>tüm veriler (gridler, formlar, cevaplar)</strong> de kalıcı olarak silinecektir.
                                        <br /><br />Bu işlem geri alınamaz!
                                    </p>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteConfirmOpen(false)}
                                        className="flex-1 px-4 py-4 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteProject}
                                        disabled={deleting}
                                        className="flex-[2] bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                    >
                                        {deleting ? 'Siliniyor...' : 'Evet, Kalıcı Olarak Sil'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveProject} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={projectForm.name}
                                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                        placeholder="e.g. Urban Redevelopment Zone A"
                                        className="w-full bg-slate-950/50 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white font-medium placeholder:text-slate-600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
                                    <textarea
                                        rows={4}
                                        value={projectForm.description}
                                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                        placeholder="Brief overview of spatial analysis objectives..."
                                        className="w-full bg-slate-950/50 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white font-medium placeholder:text-slate-600 resize-none"
                                    />
                                </div>

                                {editingProject && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Status</label>
                                        <select
                                            value={projectForm.status}
                                            onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-white font-medium"
                                        >
                                            <option value="IN_PROGRESS">IN PROGRESS</option>
                                            <option value="COMPLETED">COMPLETED</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-6 mt-4 border-t border-white/10 items-center justify-between pointer-events-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setEditingProject(null);
                                        }}
                                        className="px-4 py-4 rounded-2xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                                    >
                                        Cancel
                                    </button>

                                    <div className="flex gap-3">
                                        {editingProject && (
                                            <button
                                                type="button"
                                                onClick={() => setIsDeleteConfirmOpen(true)}
                                                className="px-6 py-4 rounded-2xl font-bold text-red-400 hover:text-white hover:bg-red-500/10 transition-all border border-red-500/20 hover:border-red-500/50"
                                            >
                                                Sil
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="neon-btn px-8 disabled:opacity-50 disabled:shadow-none bg-cyan-500 text-white font-bold py-4 rounded-2xl hover:bg-cyan-600 transition-colors"
                                        >
                                            {saving ? 'Saving...' : (editingProject ? 'Save Changes' : 'Deploy Project Instance')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProjects;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MapContainer from '../../components/map/MapContainer';
import {
    ChevronLeft,
    Layers,
    Map as MapIcon,
    
    Filter,
    Calendar,
    Users,
    Activity,
    PieChart,
    ChevronUp,
    Download
} from 'lucide-react';

const AdminMap: React.FC = () => {
    const [_projects, _setProjects] = useState<any[]>([]);
    const [_loading, _setLoading] = useState(true);
    const [isTableOpen, setIsTableOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .not('boundary_geom', 'is', null);

            if (error) throw error;
            _setProjects(data || []);
        } catch (err) {
            console.error('Error fetching projects with boundaries:', err);
        } finally {
            _setLoading(false);
        }
    };

    const handleMapLoad = (_map: any) => {
        console.log('Admin Map Loaded');
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 relative font-sans text-slate-200">
            {/* Full Bleed Map Background */}
            <div className="absolute inset-0 z-0">
                <MapContainer onLoad={handleMapLoad} />
            </div>

            {/* Glowing Map Effects (Simulated Hotspots) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 blur-[150px] rounded-full z-0 pointer-events-none" />

            {/* Floating Header */}
            <header className="absolute top-6 left-6 right-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="glass-panel p-3 rounded-2xl flex items-center gap-4 pointer-events-auto border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <button onClick={() => navigate('/admin')} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <ChevronLeft className="h-5 w-5 text-slate-300" />
                    </button>
                    <div className="h-10 w-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                        <MapIcon className="h-5 w-5" />
                    </div>
                    <div className="pr-4">
                        <h1 className="font-bold text-white text-lg leading-tight">Spatial Insight Center</h1>
                        <p className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest">Global Overview</p>
                    </div>
                </div>

                {/* Map Layer Controls */}
                <div className="glass-panel p-2 rounded-2xl flex gap-2 pointer-events-auto border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-inner">Dark Map</button>
                    <button className="px-4 py-2 hover:bg-white/5 text-slate-400 rounded-xl text-xs font-bold transition-all">Satellite</button>
                    <div className="w-px h-8 bg-white/10 mx-1 self-center"></div>
                    <button className="px-3 py-2 hover:bg-white/5 text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                        <Layers className="h-4 w-4" /> H3: 8
                    </button>
                </div>
            </header>

            {/* Left Panel: Filters */}
            <aside className="absolute top-28 left-6 w-80 max-h-[calc(100vh-200px)] glass-panel rounded-3xl border border-white/10 shadow-[0_0_25px_rgba(0,0,0,0.6)] flex flex-col z-10 overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-slate-900/40">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <Filter className="h-4 w-4 text-cyan-400" /> Control Filters
                    </h2>
                </div>
                <div className="p-5 overflow-y-auto space-y-6">
                    {/* Date Range Simulation */}
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Time Range
                        </label>
                        <div className="h-2 w-full bg-slate-800 rounded-full relative">
                            <div className="absolute left-1/4 right-1/4 h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"></div>
                            <div className="absolute left-1/4 top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 bg-white border-2 border-cyan-500 rounded-full"></div>
                            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 -mr-2 w-4 h-4 bg-white border-2 border-cyan-500 rounded-full"></div>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mt-2">
                            <span>Jan 2026</span>
                            <span>Today</span>
                        </div>
                    </div>

                    {/* Stakeholder Role */}
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
                            <Users className="h-3 w-3" /> Stakeholder Role
                        </label>
                        <select className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                            <option>All Roles</option>
                            <option>Local Resident</option>
                            <option>Business Owner</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Response Category
                        </label>
                        <div className="space-y-2">
                            {['Infrastructure', 'Environment', 'Economy'].map(cat => (
                                <label key={cat} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                    <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 focus:ring-cyan-500/50" defaultChecked />
                                    <span className="text-sm font-medium text-slate-300">{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Right Panel: Analytics */}
            <aside className="absolute top-28 right-6 w-80 max-h-[calc(100vh-200px)] glass-panel rounded-3xl border border-white/10 shadow-[0_0_25px_rgba(0,0,0,0.6)] flex flex-col z-10 overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-slate-900/40">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-purple-400" /> Analytics Suite
                    </h2>
                </div>
                <div className="p-5 overflow-y-auto space-y-6">
                    {/* KPI Card */}
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1 relative">Total Responses</p>
                        <p className="text-4xl font-black text-white relative drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            12,489
                        </p>
                        <div className="mt-2 text-xs font-bold text-cyan-400 flex items-center gap-1">
                            <ChevronUp className="h-3 w-3" /> 14% this week
                        </div>
                    </div>

                    {/* Simulated Pie Chart */}
                    <div className="space-y-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Demographics</p>
                        <div className="relative w-48 h-48 mx-auto">
                            {/* CSS Conic Gradient to simulate a pie chart */}
                            <div className="w-full h-full rounded-full border-4 border-slate-900/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                style={{ background: 'conic-gradient(#0ea5e9 0% 45%, #a855f7 45% 75%, #f43f5e 75% 100%)' }}>
                            </div>
                            {/* Inner hole for Donut chart effect */}
                            <div className="absolute inset-0 m-auto w-32 h-32 bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-inner">
                                <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Top Group</span>
                                <span className="text-white font-black text-xl">45%</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 text-xs font-medium text-slate-300">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_5px_#0ea5e9]"></div> Resident</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_#a855f7]"></div> Business</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_#f43f5e]"></div> NGO</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Bottom Panel: Retractable Data Table */}
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl transition-transform duration-500 ease-in-out z-20 ${isTableOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
                <div className="glass-panel border-white/10 border-b-0 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col backdrop-blur-2xl bg-slate-900/80">

                    {/* Tab Handle */}
                    <button
                        onClick={() => setIsTableOpen(!isTableOpen)}
                        className="w-full h-12 flex justify-center items-center gap-2 hover:bg-white/5 transition-colors border-b border-white/5 group"
                    >
                        <div className="w-12 h-1.5 rounded-full bg-slate-600 group-hover:bg-cyan-500 transition-colors shadow-[0_0_5px_transparent] group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-cyan-400 uppercase tracking-widest absolute right-6 flex items-center gap-2">
                            {isTableOpen ? 'Collapse Data' : 'Expand Raw Data'}
                            <ChevronUp className={`h-4 w-4 transform transition-transform ${isTableOpen ? 'rotate-180' : ''}`} />
                        </span>
                    </button>

                    {/* Table Content */}
                    <div className="h-80 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white text-lg">Detailed Raw Responses</h3>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5 hover:border-white/20">
                                <Download className="h-4 w-4" /> Export CSV
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-950/50 rounded-2xl border border-white/5">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-900 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Date</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">H3 Cell</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Role</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Impact</th>
                                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-slate-300 font-medium">2026-02-{20 + i}</td>
                                            <td className="px-6 py-4 text-cyan-400 font-mono text-xs">8a283082a4d7fff</td>
                                            <td className="px-6 py-4 text-slate-300">Resident</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star key={star} className={`h-3 w-3 ${star <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 truncate max-w-xs">Needs more green spaces in this exact hex block...</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

// Internal icon proxy
const Star = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);

export default AdminMap;

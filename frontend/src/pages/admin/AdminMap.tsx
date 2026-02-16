import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MapContainer from '../../components/map/MapContainer';
import {
    ChevronLeft,
    Layers,
    Map as MapIcon,
    Shield
} from 'lucide-react';

const AdminMap: React.FC = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
            setProjects(data || []);
        } catch (err) {
            console.error('Error fetching projects with boundaries:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMapLoad = (map: maplibregl.Map) => {
        // Here we could add logic to render all project boundaries as layers
        // For now, it's a full-screen map
        console.log('Admin Map Loaded');
    };

    return (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronLeft className="h-6 w-6 text-gray-600" />
                    </button>
                    <div className="h-10 w-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                        <MapIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">Genel Harita Görünümü</h1>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tüm Projeler</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold">
                    <Layers className="h-4 w-4" />
                    {projects.length} Proje Listeleniyor
                </div>
            </header>

            <div className="flex-1 relative">
                <MapContainer onLoad={handleMapLoad} />

                {/* Overlay Project List */}
                <div className="absolute top-6 right-6 w-64 bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 overflow-hidden hidden md:block">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary-600" />
                            Aktif Alanlar
                        </h3>
                    </div>
                    <div className="p-2 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-xs text-gray-400">Yükleniyor...</div>
                        ) : projects.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">Sınırı çizilmiş proje yok.</div>
                        ) : (
                            projects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => navigate(`/admin/project/${p.id}`)}
                                    className="w-full text-left p-3 hover:bg-white rounded-2xl transition-all group"
                                >
                                    <h4 className="text-xs font-bold text-gray-700 group-hover:text-primary-700">{p.name}</h4>
                                    <p className="text-[10px] text-gray-400 line-clamp-1">{p.description || 'Açıklama yok'}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMap;

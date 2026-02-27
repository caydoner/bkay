import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import MapContainer from '../../components/map/MapContainer';
import {
    ChevronLeft,
    Save,
    Map as MapIcon,
    Settings,
    Table as TableIcon,
    ClipboardList,
    Plus,
    Trash2,
    Table2,
    Database,
    Users as UsersIcon,
    UserCheck,
    CheckCircle2,
    FileUp,
    Grid as GridIcon,
    Loader2,
    Calendar,
    Type,
    Hash,
    Star,
    ListFilter,
    MapPin,
    FileCode,
    AlertTriangle,
    Download,
    Search,
    X,
    Pencil as Edit
} from 'lucide-react';
import { kml } from '@tmcw/togeojson';

const ProjectDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'general' | 'map' | 'table' | 'forms' | 'stakeholders' | 'data'>('general');
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Grid regeneration warning
    const [showAreaDataWarning, setShowAreaDataWarning] = useState(false);
    const [areaDataCount, setAreaDataCount] = useState(0);

    // Project Areas (for area-based grid generation)
    const [projectAreas, setProjectAreas] = useState<any[]>([]);
    const [selectedAreaId, setSelectedAreaId] = useState<string>('');
    const [newAreaName, setNewAreaName] = useState('');
    const [savingArea, setSavingArea] = useState(false);

    // Map related states - km² units (approximate values due to H3 hexagon grid)
    const [minCellAreaKm2, setMinCellAreaKm2] = useState(0.0003); // ~300 m²
    const [maxCellAreaKm2, setMaxCellAreaKm2] = useState(5.0);    // ~5 km²
    const [numResolutions, setNumResolutions] = useState(8);
    const [boundary] = useState<any>(null); // setBoundary removed as it was unused
    const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
    const [generatingGrids, setGeneratingGrids] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationMessage, setGenerationMessage] = useState('');

    // Table schema (Columns)
    const [columns, setColumns] = useState<any[]>([]);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<any>(null);

    // Stakeholder Forms
    const [stakeholderForms, setStakeholderForms] = useState<any[]>([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState<any>(null);

    const [publicUsers, setPublicUsers] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [responses, setResponses] = useState<any[]>([]);
    const [selectedResponse, setSelectedResponse] = useState<any>(null);

    // Zoom-based grid display
    const [currentZoom, setCurrentZoom] = useState(10);
    const [currentResolution] = useState<number | null>(null);

    // Data tab - checkbox selection for map visualization
    const [selectedResponseIds, setSelectedResponseIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
    const [editingResponse, setEditingResponse] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [fitTrigger, setFitTrigger] = useState(0);

    // Local UI states
    const [optionsText, setOptionsText] = useState('');

    useEffect(() => {
        fetchProjectDetails();
        fetchColumns();
        fetchForms();
        fetchUsersAndAssignments();
        fetchProjectAreas();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'data') {
            fetchResponses();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'data') {
            const firstSelectedId = selectedResponseIds.size > 0 ? Array.from(selectedResponseIds)[0] : null;
            const targetResp = selectedResponse || (firstSelectedId ? responses.find(r => r.id === firstSelectedId) : null);

            if (targetResp?.area_id) {
                // MVT handles visualization based on area_id
            }
        }
    }, [selectedResponse, selectedResponseIds, activeTab, responses]);

    const fetchResponses = async () => {
        try {
            const res = await api.get(`/responses/project/${id}`);
            setResponses(res.data);
        } catch (err) {
            console.error('Fetch responses error:', err);
        } finally {
        }
    };

    const handleDeleteResponse = async (responseId: string) => {
        if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

        try {
            await api.delete(`/responses/${responseId}`);
            setResponses(prev => prev.filter(r => r.id !== responseId));
            const newSelectedRows = new Set(selectedResponseIds);
            newSelectedRows.delete(responseId);
            setSelectedResponseIds(newSelectedRows);
            if (selectedResponse?.id === responseId) setSelectedResponse(null);
            toast.success('Kayıt başarıyla silindi.');
        } catch (err) {
            console.error('Delete response error:', err);
            toast.error('Kayıt silinirken bir hata oluştu.');
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedResponseIds.size;
        if (!window.confirm(`${count} adet kaydı silmek istediğinize emin misiniz?`)) return;

        setIsDeleting(true);
        try {
            // Sequential deletion for simplicity, or we could add a bulk endpoint
            for (const respId of Array.from(selectedResponseIds)) {
                await api.delete(`/responses/${respId}`);
            }
            setResponses(prev => prev.filter(r => !selectedResponseIds.has(r.id)));
            setSelectedResponseIds(new Set());
            setSelectedResponse(null);
            toast.success(`${count} kayıt başarıyla silindi.`);
        } catch (err) {
            console.error('Bulk delete error:', err);
            toast.error('Bazı kayıtlar silinirken hata oluştu.');
            fetchResponses(); // Refresh to sync state
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateResponse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResponse) return;

        try {
            const res = await api.put(`/responses/${editingResponse.id}`, {
                project_id: editingResponse.project_id,
                h3_index: editingResponse.h3_index,
                response_data: editingResponse.response_data
            });

            setResponses(prev => prev.map(r => r.id === res.data.id ? res.data : r));
            setIsEditingModalOpen(false);
            setEditingResponse(null);
            toast.success('Kayıt başarıyla güncellendi.');
        } catch (err) {
            console.error('Update response error:', err);
            toast.error('Kayıt güncellenirken hata oluştu.');
        }
    };

    const handleExportGPKG = () => {
        if (responses.length === 0) {
            toast.error('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        const baseUrl = `${import.meta.env.VITE_API_URL}/responses/export/gpkg`;
        const params = new URLSearchParams();
        params.append('project_id', id || '');

        if (selectedResponseIds.size > 0) {
            params.append('ids', Array.from(selectedResponseIds).join(','));
        }

        const downloadUrl = `${baseUrl}?${params.toString()}`;

        // Trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', ''); // Filename will be set by Content-Disposition header
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(selectedResponseIds.size > 0
            ? `${selectedResponseIds.size} seçili kayıt GPKG olarak indiriliyor...`
            : 'Tüm proje verileri GPKG olarak indiriliyor...'
        );
    };

    const exportToCSV = () => {
        if (responses.length === 0) return;

        // Flatten data for CSV
        // Header: User, Cell, Date, then all unique column names from response_data
        const allKeys = new Set<string>();
        responses.forEach((r: any) => {
            Object.keys(r.response_data || {}).forEach(k => allKeys.add(k));
        });
        const dynamicKeys = Array.from(allKeys);

        const headers = ['Kullanıcı', 'Hücre ID', 'Tarih', ...dynamicKeys];
        const rows = responses.map((r: any) => [
            `User_${r.user_id}`,
            r.h3_index || '',
            new Date(r.created_at).toLocaleString(),
            ...dynamicKeys.map(k => {
                const val = r.response_data[k];
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                return val || '';
            })
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `proje_verileri_${id}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredResponses = responses.filter((r: any) => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        // Search in cell ID, user ID, or any value in response_data
        const inResponseData = Object.values(r.response_data || {}).some(v =>
            String(v).toLowerCase().includes(searchLower)
        );
        return (
            String(r.h3_index).toLowerCase().includes(searchLower) ||
            String(r.user_id).toLowerCase().includes(searchLower) ||
            inResponseData
        );
    });

    // Fetch project areas
    const fetchProjectAreas = async () => {
        try {
            const response = await api.get(`/areas/${id}`);
            const areas = response.data || [];
            setProjectAreas(areas);

            // Auto-select first area if none selected
            if (!selectedAreaId && areas.length > 0) {
                const firstArea = areas[0];
                setSelectedAreaId(firstArea.id);
                if (firstArea.min_cell_area_km2) setMinCellAreaKm2(firstArea.min_cell_area_km2);
                if (firstArea.max_cell_area_km2) setMaxCellAreaKm2(firstArea.max_cell_area_km2);
                if (firstArea.num_resolutions) setNumResolutions(firstArea.num_resolutions);
            }
        } catch (err) {
            console.error('Error fetching project areas:', err);
        }
    };

    // Save current boundary as a new area
    const handleSaveAsArea = async () => {
        if (!drawnGeometry || !newAreaName.trim()) {
            alert('Lütfen bir alan çizin ve alan adı girin.');
            return;
        }

        setSavingArea(true);
        try {
            await api.post('/areas/', {
                project_id: id,
                name: newAreaName.trim(),
                boundary_geom: drawnGeometry,
                min_cell_area_km2: minCellAreaKm2,
                max_cell_area_km2: maxCellAreaKm2,
                num_resolutions: numResolutions
            });
            alert('Alan başarıyla kaydedildi.');
            setNewAreaName('');
            await fetchProjectAreas();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Alan kaydedilirken hata oluştu');
        } finally {
            setSavingArea(false);
        }
    };

    // Delete an area
    const handleDeleteArea = async (areaId: string) => {
        if (!confirm('Bu alanı silmek istediğinize emin misiniz? Tüm gridler de silinecektir.')) return;

        try {
            await api.delete(`/areas/${id}/${areaId}`);
            await fetchProjectAreas();
            if (selectedAreaId === areaId) {
                setSelectedAreaId('');
            }
            alert('Alan silindi.');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Alan silinirken hata oluştu');
        }
    };

    const fetchProjectDetails = async () => {
        try {
            const response = await api.get(`/projects/${id}`);
            const data = response.data;
            if (data) {
                setProject(data);
                // boundary_geom is now NULL (migrated to areas), 
                // so we don't need to set boundary/drawnGeometry here.
                // fetchProjectAreas (called in useEffect) will handle selection.
            }
        } catch (err) {
            console.error('Error fetching project:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchColumns = async () => {
        try {
            const response = await api.get(`/schema/columns/${id}`);
            setColumns(response.data || []);
        } catch (err) {
            console.error('Error fetching columns:', err);
        }
    };

    const fetchForms = async () => {
        try {
            const response = await api.get(`/schema/forms/${id}`);
            setStakeholderForms(response.data || []);
        } catch (err) {
            console.error('Error fetching forms:', err);
        }
    };

    const fetchUsersAndAssignments = async () => {
        try {
            const userResponse = await api.get('/projects/users/public');
            setPublicUsers(userResponse.data || []);

            const assignResponse = await api.get(`/schema/assignments/${id}`);
            setAssignments(assignResponse.data || []);
        } catch (err) {
            console.error('Error fetching users or assignments:', err);
        }
    };

    const handleSaveGeneral = async () => {
        try {
            await api.patch(`/projects/${id}`, { name: project.name, description: project.description });
            alert('Kaydedildi');
        } catch (err: any) {
            alert('Hata: ' + (err.response?.data?.detail || err.message));
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;

            try {
                let geojson: any = null;

                const findPolygon = (obj: any): any => {
                    if (!obj) return null;
                    const type = obj.type || (obj.geometry ? obj.geometry.type : 'unknown');

                    if (type === 'Polygon' || type === 'MultiPolygon') {
                        return obj.geometry || obj;
                    }

                    if (obj.features && Array.isArray(obj.features)) {
                        for (const f of obj.features) {
                            const res = findPolygon(f);
                            if (res) return res;
                        }
                    }

                    const geom = obj.geometry || obj;
                    if (geom.type === 'GeometryCollection' && geom.geometries) {
                        for (const g of geom.geometries) {
                            const res = findPolygon(g);
                            if (res) return res;
                        }
                    }

                    if (obj.geometry) {
                        return findPolygon(obj.geometry);
                    }

                    return null;
                };

                if (file.name.endsWith('.kml')) {
                    const parser = new DOMParser();
                    const kmlDoc = parser.parseFromString(text, 'text/xml');
                    const fc = kml(kmlDoc);
                    geojson = findPolygon(fc);
                    if (!geojson) throw new Error('KML içinde Polygon bulunamadı.');
                } else {
                    const data = JSON.parse(text);
                    geojson = findPolygon(data);
                    if (!geojson) throw new Error('GeoJSON içinde Polygon bulunamadı.');
                }

                setDrawnGeometry(geojson);
                toast.success('Dosya yüklendi. Kaydet (Sınır) butonuna basmayı unutmayın.');
            } catch (err: any) {
                console.error('Parse error:', err);
                toast.error('Hata: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleGenerateGrid = async () => {
        if (!selectedAreaId) {
            alert('Lütfen önce bir alan seçin veya yeni bir alan oluşturun.');
            return;
        }

        try {
            // Check if there's existing data for this area
            const checkResponse = await api.get(`/areas/${id}/${selectedAreaId}/check-data`);
            const checkData = checkResponse.data;

            if (checkData.has_data) {
                setAreaDataCount(checkData.response_count);
                setShowAreaDataWarning(true);
                return;
            }

            await executeAreaGridGeneration();
        } catch (err: any) {
            console.error('Error checking area data:', err);
            const proceed = window.confirm('Mevcut veri kontrolü yapılamadı. Yine de devam etmek istiyor musunuz?');
            if (proceed) {
                await executeAreaGridGeneration();
            }
        }
    };

    const confirmGridGeneration = async () => {
        setShowAreaDataWarning(false);
        if (selectedAreaId) {
            await executeAreaGridGeneration();
        } else {
            await executeGridGeneration();
        }
    };

    // Generate grids for a specific area
    const executeAreaGridGeneration = async () => {
        setGeneratingGrids(true);
        setGenerationProgress(0);
        setGenerationMessage('Seçilen alan için grid üretimi başlatılıyor...');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/grids/area/${selectedAreaId}/generate`, {
                method: 'POST',
                headers: {
                    'X-User-Id': localStorage.getItem('user_id') || ''
                }
            });

            if (!response.body) throw new Error('Yayın okunamadı');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.progress) setGenerationProgress(data.progress);
                            if (data.message) setGenerationMessage(data.message);
                            if (data.status === 'success') {
                                alert(`Alan için toplam ${data.count} adet grid hücresi oluşturuldu.`);
                                fetchProjectAreas(); // Refresh areas to update grids_generated flag
                            } else if (data.status === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (e) {
                            console.error('Line parse error:', e);
                        }
                    }
                }
            }
        } catch (err: any) {
            alert(err.message || 'Grid üretimi sırasında hata oluştu');
        } finally {
            setGeneratingGrids(false);
        }
    };

    // Legacy project-level grid generation
    const executeGridGeneration = async () => {
        setGeneratingGrids(true);
        setGenerationProgress(0);
        setGenerationMessage('Tüm çözünürlükler için grid üretimi başlatılıyor...');
        try {
            const params = new URLSearchParams({
                min_cell_area_km2: minCellAreaKm2.toString(),
                max_cell_area_km2: maxCellAreaKm2.toString(),
                num_resolutions: numResolutions.toString()
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/grids/${id}/generate-all?${params}`, {
                method: 'POST',
                headers: {
                    'X-User-Id': localStorage.getItem('user_id') || ''
                }
            });

            if (!response.body) throw new Error('Yayın okunamadı');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.progress) setGenerationProgress(data.progress);
                            if (data.message) setGenerationMessage(data.message);
                            if (data.status === 'success') {
                                alert(`Toplam ${data.count} adet grid hücresi oluşturuldu.`);
                            } else if (data.status === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (e) {
                            console.error('Line parse error:', e);
                        }
                    }
                }
            }
        } catch (err: any) {
            alert(err.message || 'Grid üretimi sırasında hata oluştu');
        } finally {
            setGeneratingGrids(false);
        }
    };


    const handleSaveColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        const colData = {
            project_id: id,
            name: editingColumn.name || editingColumn.label.toLowerCase().replace(/\s+/g, '_'),
            label: editingColumn.label,
            type: editingColumn.type,
            is_required: editingColumn.is_required,
            options: editingColumn.options || [],
            config: editingColumn.config || {}
        };

        try {
            if (editingColumn.id) {
                await api.patch(`/schema/columns/${editingColumn.id}`, colData);
            } else {
                await api.post('/schema/columns/', colData);
            }
            setIsColumnModalOpen(false);
            fetchColumns();
        } catch (err: any) {
            console.error('Save column error:', err.response?.data || err.message);
            const detail = err.response?.data?.detail;
            let errorMessage = 'Kolon kaydedilemedi';

            if (typeof detail === 'string') {
                errorMessage = detail;
            } else if (Array.isArray(detail)) {
                errorMessage = detail.map((d: any) => d.msg).join(', ');
            } else if (detail?.message) {
                errorMessage = detail.message;
            } else if (err.message === 'Network Error') {
                errorMessage = 'Sunucuya bağlanılamadı. Lütfen API portunun (5173) açık olduğunu kontrol edin.';
            }
            alert(errorMessage);
        }
    };

    const handleDeleteColumn = async (colId: string) => {
        if (!confirm('Bu kolonu silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/schema/columns/${colId}`);
            fetchColumns();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Kolon silinemedi');
        }
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = {
            project_id: id,
            name: editingForm.name,
            selected_columns: editingForm.selected_columns
        };

        try {
            if (editingForm.id) {
                await api.patch(`/schema/forms/${editingForm.id}`, formData);
            } else {
                await api.post('/schema/forms/', formData);
            }
            setIsFormModalOpen(false);
            fetchForms();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Form kaydedilemedi');
        }
    };

    const handleAssignForm = async (userId: number, formId: string) => {
        try {
            await api.post('/schema/assignments/', {
                project_id: id,
                user_id: userId,
                form_id: formId
            });
            fetchUsersAndAssignments();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Atama hatası');
        }
    };

    if (loading) return <div className="p-10 text-center text-cyan-400 font-bold flex items-center justify-center gap-2"><Loader2 className="h-6 w-6 animate-spin" /> Yükleniyor...</div>;

    return (
        <>
            <div className="flex-1 flex flex-col bg-slate-900/50 text-slate-200 overflow-hidden">
                {/* Header */}
                <header className="glass-panel border-white/5 border-b border-white/10 p-4 flex justify-between items-center shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                            <ChevronLeft className="h-6 w-6 text-slate-300" />
                        </button>
                        <div className="h-10 w-10 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                            <Database className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-white">{project?.name}</h1>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Proje Yönetimi</p>
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="glass-panel border-white/5 border-b border-white/10 px-6 sm:px-10 flex gap-8 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'general', label: 'Genel', icon: Settings },
                        { id: 'map', label: 'Harita', icon: MapIcon },
                        { id: 'table', label: 'Tablo', icon: TableIcon },
                        { id: 'forms', label: 'Formlar', icon: ClipboardList },
                        { id: 'stakeholders', label: 'Atamalar', icon: UsersIcon },
                        { id: 'data', label: 'Veri', icon: Database }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 border-b-2 font-bold transition-all whitespace-nowrap text-sm ${activeTab === tab.id
                                ? 'border-primary-600 text-cyan-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className={`flex-1 flex flex-col min-h-0 bg-slate-950/50 text-slate-200 ${activeTab === 'map' ? 'p-0 overflow-hidden' : 'p-4 sm:p-8 overflow-y-auto pb-32'}`}>
                    {activeTab === 'general' && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="glass-panel border-white/5 rounded-3xl p-8 shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Proje Adı</label>
                                    <input
                                        type="text"
                                        value={project?.name || ''}
                                        onChange={(e) => setProject({ ...project, name: e.target.value })}
                                        className="w-full bg-slate-900/50 text-slate-200 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-white/5 transition-all text-white font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Açıklama</label>
                                    <textarea
                                        rows={4}
                                        value={project?.description || ''}
                                        onChange={(e) => setProject({ ...project, description: e.target.value })}
                                        className="w-full bg-slate-900/50 text-slate-200 border border-white/10 py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-white/5 transition-all text-white font-medium resize-none"
                                    />
                                </div>
                                <button onClick={handleSaveGeneral} className="w-full bg-cyan-600 text-white py-4 rounded-2xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 transition-all flex items-center justify-center gap-2">
                                    <Save className="h-5 w-5" /> Değişiklikleri Kaydet
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'map' && (
                        <div className="flex-grow flex flex-col h-full min-h-0 relative animate-in fade-in duration-300">
                            <MapContainer
                                projectId={id}
                                areaId={selectedAreaId || undefined}
                                initialGeometry={selectedAreaId ? projectAreas.find(a => a.id === selectedAreaId)?.boundary_geom : boundary}
                                onZoomChange={setCurrentZoom}
                                onLoad={(map: any, draw: any) => {
                                    if (draw) {
                                        const updateGeom = () => {
                                            const data = draw.getAll();
                                            if (data.features.length > 0) {
                                                setDrawnGeometry(data.features[0].geometry);
                                            }
                                        };
                                        map.on('draw.create', updateGeom);
                                        map.on('draw.update', updateGeom);
                                        map.on('draw.delete', () => setDrawnGeometry(null));
                                    }
                                }}
                            />
                            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-white/5 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/10 flex flex-col gap-4 z-10 w-72">
                                {/* Area Selection */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">Alan Seçimi</span>

                                    {/* Area Dropdown */}
                                    <select
                                        value={selectedAreaId}
                                        onChange={(e) => {
                                            const areaId = e.target.value;
                                            setSelectedAreaId(areaId);
                                            if (areaId) {
                                                // Load area's grid settings
                                                const area = projectAreas.find(a => a.id === areaId);
                                                if (area) {
                                                    if (area.min_cell_area_km2) setMinCellAreaKm2(area.min_cell_area_km2);
                                                    if (area.max_cell_area_km2) setMaxCellAreaKm2(area.max_cell_area_km2);
                                                    if (area.num_resolutions) setNumResolutions(area.num_resolutions);
                                                }
                                            }
                                        }}
                                        className="w-full bg-slate-900/50 text-slate-200 border border-white/10 py-2 px-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                    >
                                        <option value="" disabled>Alan Seçin...</option>
                                        {projectAreas.map((area) => (
                                            <option key={area.id} value={area.id}>
                                                {area.name} {area.grids_generated ? '✓' : ''}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Selected Area Actions */}
                                    {selectedAreaId && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDeleteArea(selectedAreaId)}
                                                className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                                            >
                                                <Trash2 className="h-3 w-3" /> Alanı Sil
                                            </button>
                                        </div>
                                    )}

                                    {/* New Area Input */}
                                    <div className="flex gap-2 pt-2 border-t border-white/10">
                                        <input
                                            type="text"
                                            placeholder="Yeni alan adı..."
                                            value={newAreaName}
                                            onChange={(e) => setNewAreaName(e.target.value)}
                                            className="flex-1 bg-slate-900/50 text-slate-200 border border-white/10 py-2 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                        />
                                        <button
                                            onClick={handleSaveAsArea}
                                            disabled={!drawnGeometry || !newAreaName.trim() || savingArea}
                                            className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {savingArea ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                            Kaydet
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-white/10" />

                                {/* Grid Settings */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">Grid Ayarları</span>
                                        <span className="text-[9px] text-slate-500 italic">~yaklaşık değerler</span>
                                    </div>

                                    {/* Current Resolution Indicator */}
                                    {currentResolution !== null && (
                                        <div className="bg-cyan-500/10 rounded-lg p-2 text-center">
                                            <span className="text-[10px] text-cyan-400 font-bold">
                                                Gösterilen: Çözünürlük {currentResolution} (Zoom: {currentZoom})
                                            </span>
                                        </div>
                                    )}

                                    {/* Min Cell Area (km²) */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 flex justify-between">
                                            <span>En Küçük Grid:</span>
                                            <span className="font-bold text-slate-300">
                                                ~{minCellAreaKm2 < 0.001 ? `${(minCellAreaKm2 * 1000000).toFixed(0)} m²` : `${minCellAreaKm2.toFixed(3)} km²`}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0.00005"
                                            max="0.01"
                                            step="0.00005"
                                            value={minCellAreaKm2}
                                            onChange={(e) => setMinCellAreaKm2(parseFloat(e.target.value))}
                                            className="accent-primary-600 w-full h-1.5"
                                        />
                                    </div>

                                    {/* Max Cell Area (km²) */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 flex justify-between">
                                            <span>En Büyük Grid:</span>
                                            <span className="font-bold text-slate-300">~{maxCellAreaKm2.toFixed(1)} km²</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="50"
                                            step="0.1"
                                            value={maxCellAreaKm2}
                                            onChange={(e) => setMaxCellAreaKm2(parseFloat(e.target.value))}
                                            className="accent-primary-600 w-full h-1.5"
                                        />
                                    </div>

                                    {/* Number of Resolution Levels */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 flex justify-between">
                                            <span>Çözünürlük Sayısı:</span>
                                            <span className="font-bold text-slate-300">{numResolutions}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="10"
                                            value={numResolutions}
                                            onChange={(e) => setNumResolutions(parseInt(e.target.value))}
                                            className="accent-primary-600 w-full h-1.5"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                                    <label className="flex items-center justify-center gap-2 w-full bg-slate-900/50 text-slate-200 border border-white/10 text-slate-300 py-2 rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition-all text-xs">
                                        <FileUp className="h-4 w-4" /> KML/GeoJSON Yükle
                                        <input type="file" accept=".kml,.geojson" className="hidden" onChange={handleFileUpload} />
                                    </label>

                                    {/* Removed handleSaveBoundary button as it's legacy */}

                                    <button
                                        onClick={handleGenerateGrid}
                                        disabled={generatingGrids || (!selectedAreaId && !drawnGeometry)}
                                        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {generatingGrids ? <Loader2 className="h-4 w-4 animate-spin" /> : <GridIcon className="h-4 w-4" />}
                                        {generatingGrids ? 'Üretiliyor...' : (selectedAreaId ? 'Alan Gridlerini Üret' : 'Gridleri Üret')}
                                    </button>

                                    {generatingGrids && (
                                        <div className="space-y-2 pt-1 border-t border-white/10 mt-1">
                                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="bg-indigo-600 h-full transition-all duration-300"
                                                    style={{ width: `${generationProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium animate-pulse text-center">{generationMessage}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'table' && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center glass-panel border-white/5 p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Proje Tablosu</h3>
                                    <p className="text-sm text-slate-400">Master veri yapısını tanımlayın.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingColumn({ label: '', type: 'text', is_required: false, options: [], config: {} });
                                        setOptionsText('');
                                        setIsColumnModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-500 transition-all shadow-lg"
                                >
                                    <Plus className="h-5 w-5" /> Kolon Ekle
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {columns.map(col => (
                                    <div key={col.id} className="glass-panel border-white/5 p-5 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-between group hover:border-primary-100 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-slate-900/50 text-slate-200 rounded-xl flex items-center justify-center text-slate-500">
                                                <Table2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{col.label}</h4>
                                                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                                                    <span className="text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-full">{col.type}</span>
                                                    {col.is_required && <span className="text-red-600 px-2 py-0.5 bg-red-50 rounded-full">Zorunlu</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 transition-opacity">
                                            <button onClick={() => {
                                                setEditingColumn(col);
                                                setOptionsText(col.options?.map((o: any) => o.value === o.label ? o.value : `${o.value},${o.label}`).join('\n') || '');
                                                setIsColumnModalOpen(true);
                                            }} className="p-2 text-slate-500 hover:text-cyan-400 rounded-lg"><Settings className="h-4 w-4" /></button>
                                            <button onClick={() => handleDeleteColumn(col.id)} className="p-2 text-slate-500 hover:text-red-500 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'forms' && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Stakeholder Formları</h3>
                                <button
                                    onClick={() => { setEditingForm({ name: '', selected_columns: [] }); setIsFormModalOpen(true); }}
                                    className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-500 transition-all shadow-lg"
                                >
                                    <Plus className="h-5 w-5" /> Yeni Form
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {stakeholderForms.map(form => (
                                    <div key={form.id} className="glass-panel border-white/5 p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 hover:border-primary-200 transition-all group relative">
                                        <div className="mb-4">
                                            <div className="h-10 w-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 mb-4">
                                                <ClipboardList className="h-5 w-5" />
                                            </div>
                                            <h4 className="text-lg font-bold text-white">{form.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{form.selected_columns.length} Alan Seçili</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50">
                                            <button onClick={() => { setEditingForm(form); setIsFormModalOpen(true); }} className="text-xs font-bold text-cyan-400">Düzenle</button>
                                            <Trash2 onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm('Silmek istediğinize emin misiniz?')) {
                                                    try {
                                                        await api.delete(`/schema/forms/${form.id}`);
                                                        fetchForms();
                                                    } catch (err: any) {
                                                        alert('Hata: ' + (err.response?.data?.detail || err.message));
                                                    }
                                                }
                                            }} className="h-4 w-4 text-gray-300 hover:text-red-500 cursor-pointer" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'stakeholders' && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="glass-panel border-white/5 p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Paydaş Atamaları</h3>
                                    <p className="text-sm text-slate-400">Kullanıcılara hangi formu dolduracaklarını atayın.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {publicUsers.map(user => {
                                    const assignment = assignments.find(a => a.user_id === user.id);
                                    const assignedFormId = assignment?.form_id;

                                    return (
                                        <div key={user.id} className="glass-panel border-white/5 p-6 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-between group hover:border-primary-100 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-slate-900/50 text-slate-200 rounded-full flex items-center justify-center text-slate-500 border border-white/10">
                                                    <UserCheck className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">{user.first_name || user.username} {user.last_name || ''}</h4>
                                                    <p className="text-xs text-slate-500">{user.email || user.username}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {assignment && (
                                                    <div className="text-green-600" title="Atandı"><CheckCircle2 className="h-5 w-5" /></div>
                                                )}
                                                <select
                                                    className="bg-slate-900/50 text-slate-200 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                                    value={assignedFormId || ''}
                                                    onChange={(e) => handleAssignForm(user.id, e.target.value)}
                                                >
                                                    <option value="">Form Seçin...</option>
                                                    {stakeholderForms.map(f => (
                                                        <option key={f.id} value={f.id}>{f.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="flex-1 flex flex-col min-h-0 glass-panel border-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-in fade-in duration-300">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-slate-950/50 text-slate-200">
                                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Verilerde ara (Hücre, Kullanıcı, İçerik)..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 glass-panel border-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={exportToCSV}
                                        className="flex items-center gap-2 px-4 py-2 glass-panel border-white/5 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-900/50 hover:text-slate-200 text-slate-300 hover:border-white/20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                    >
                                        <Download className="h-4 w-4" />
                                        CSV İndir
                                    </button>
                                    <button
                                        onClick={handleExportGPKG}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                        title="QGIS uyumlu GeoPackage formatında dışa aktar"
                                    >
                                        <MapPin className="h-4 w-4" />
                                        GPKG Dışa Aktar
                                    </button>
                                </div>

                                {selectedResponseIds.size > 0 && (
                                    <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-primary-100">
                                            {selectedResponseIds.size} Kayıt Seçildi
                                        </span>
                                        <button
                                            onClick={handleBulkDelete}
                                            disabled={isDeleting}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            Seçilenleri Sil
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Top: Records Table */}
                            <div className="flex-1 overflow-auto border-b border-white/10 min-h-[300px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 glass-panel border-white/5 z-10 border-b border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                        <tr>
                                            <th className="px-4 py-4 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredResponses.length > 0 && selectedResponseIds.size === filteredResponses.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedResponseIds(new Set(filteredResponses.map((r: any) => r.id)));
                                                        } else {
                                                            setSelectedResponseIds(new Set());
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-white/20 text-cyan-400 focus:ring-cyan-500/50"
                                                />
                                            </th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Kullanıcı</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Hücre ID</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Tarih</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500">İçerik Özeti</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredResponses.map((resp: any) => (
                                            <tr
                                                key={resp.id}
                                                className={`group transition-colors ${selectedResponseIds.has(resp.id) ? 'bg-cyan-500/10' : 'hover:bg-slate-900/50 hover:text-slate-200 text-slate-300'}`}
                                            >
                                                <td className="px-4 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedResponseIds.has(resp.id)}
                                                        onChange={(e) => {
                                                            const newIds = new Set(selectedResponseIds);
                                                            if (e.target.checked) {
                                                                newIds.add(resp.id);
                                                                setSelectedResponse(resp);
                                                            } else {
                                                                newIds.delete(resp.id);
                                                            }
                                                            setSelectedResponseIds(newIds);
                                                        }}
                                                        className="w-4 h-4 rounded border-white/20 text-cyan-400 focus:ring-cyan-500/50"
                                                    />
                                                </td>
                                                <td className="px-4 py-4" onClick={() => setSelectedResponse(resp)}>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white">User_{resp.user_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4" onClick={() => setSelectedResponse(resp)}>
                                                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                                                        {resp.h3_index || 'Genel'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-slate-400" onClick={() => setSelectedResponse(resp)}>
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                                        {new Date(resp.created_at).toLocaleDateString()}
                                                        <span className="text-gray-300 mx-1">|</span>
                                                        {new Date(resp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4" onClick={() => setSelectedResponse(resp)}>
                                                    <p className="text-xs text-slate-400 truncate max-w-xs font-medium">
                                                        {Object.entries(resp.response_data || {})
                                                            .filter(([_, v]) => typeof v !== 'object')
                                                            .map(([k, v]) => `${k}: ${v}`)
                                                            .join(', ') || 'Dosya/Geometri verisi'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingResponse({ ...resp });
                                                                setIsEditingModalOpen(true);
                                                            }}
                                                            className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all"
                                                            title="Düzenle"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteResponse(resp.id);
                                                            }}
                                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Sil"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredResponses.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-20 text-center">
                                                    <div className="h-16 w-16 bg-slate-900/50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200">
                                                        <Search className="h-8 w-8" />
                                                    </div>
                                                    <h4 className="font-bold text-white">Sonuç Bulunamadı</h4>
                                                    <p className="text-sm text-slate-400">Arama kriterlerinize uygun kayıt bulunmuyor.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom: Split View (Map + Details) */}
                            <div className="h-1/2 flex border-t-4 border-gray-50">
                                {/* Bottom Left: Map (3/4) */}
                                <div className="flex-[3] relative bg-slate-800">
                                    <MapContainer
                                        projectId={id}
                                        areaId={selectedAreaId || undefined}
                                        fitTrigger={fitTrigger}
                                        autoZoom={true}
                                        {...(() => {
                                            // Debug log to see what's being passed (visible in dev console)
                                            const activeResponse = selectedResponse || (selectedResponseIds.size > 0
                                                ? responses.find((r: any) => r.id === Array.from(selectedResponseIds)[0])
                                                : null);

                                            if (activeResponse?.response_data) {
                                                // Find any field that looks like geometry or contains h3_indices
                                                const geomEntry = Object.entries(activeResponse.response_data).find(([_, v]: [string, any]) =>
                                                    v && (v.type === 'GridSelection' || v.type || v.coordinates || v.features)
                                                );

                                                if (geomEntry) {
                                                    const [_, geomData] = geomEntry as [string, any];

                                                    if (geomData.type === 'GridSelection') {
                                                        return { selectedCells: geomData.h3_indices || [] };
                                                    }
                                                    // Handle FeatureCollection or Feature by extracting geometry
                                                    if (geomData.type === 'FeatureCollection' && geomData.features?.length > 0) {
                                                        return { initialGeometry: geomData.features[0].geometry };
                                                    }
                                                    if (geomData.type === 'Feature') {
                                                        return { initialGeometry: geomData.geometry };
                                                    }
                                                    return { initialGeometry: geomData };
                                                }
                                            }
                                            return {};
                                        })()}
                                    />
                                    {selectedResponseIds.size === 0 && (
                                        <div className="absolute inset-0 bg-slate-800/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Görselleştirmek için checkbox ile kayıt seçin</p>
                                        </div>
                                    )}
                                    {selectedResponseIds.size > 0 && (
                                        <div className="absolute top-3 left-3 bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold z-10">
                                            {selectedResponseIds.size} kayıt seçili
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setFitTrigger(prev => prev + 1)}
                                        className="absolute top-3 right-3 glass-panel border-white/5/90 backdrop-blur-md px-3 py-2 rounded-xl text-cyan-400 font-bold text-xs shadow-lg border border-primary-50 hover:bg-white/5 transition-all flex items-center gap-2 z-10"
                                        title="Seçili verilere odakla"
                                    >
                                        <MapPin className="h-4 w-4" />
                                        Odakla
                                    </button>
                                </div>

                                {/* Bottom Right: Details (1/4) */}
                                <div className="flex-1 glass-panel border-white/5 border-l border-white/10 flex flex-col min-h-0 overflow-y-auto p-6 scrollbar-hide">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">Kayıt Detayları</h4>
                                    {selectedResponse ? (
                                        <div className="space-y-4">
                                            {Object.entries(selectedResponse.response_data || {}).map(([key, value]: [string, any]) => (
                                                <div key={key} className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{key}</label>
                                                    <div className="text-sm font-semibold text-slate-200 bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10">
                                                        {typeof value === 'object' ? (value.type ? `Geometri: ${value.type}` : JSON.stringify(value)) : String(value)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-center px-4">
                                            <p className="text-xs text-slate-500 italic">Yukarıdaki tablodan bir satıra tıklayarak detayları görüntüleyebilirsiniz.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals */}
                {
                    isColumnModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                            <div className="glass-panel border-white/5 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                                <div className="p-6 border-b flex justify-between items-center bg-slate-900/50 text-slate-200">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Database className="h-4 w-4 text-cyan-400" />
                                        Kolon Tanımla
                                    </h3>
                                    <button onClick={() => setIsColumnModalOpen(false)} className="text-slate-500 hover:text-slate-300 text-2xl font-bold">&times;</button>
                                </div>
                                <form onSubmit={handleSaveColumn} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Görünür Başlık</label>
                                        <input required type="text" placeholder="Örn: Yaş, Şehir, Notlar" value={editingColumn.label} onChange={(e) => setEditingColumn({ ...editingColumn, label: e.target.value })} className="w-full bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none font-medium placeholder:text-gray-300 transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Veri Tipi</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'text', label: 'Metin', icon: Type },
                                                { id: 'number', label: 'Sayı', icon: Hash },
                                                { id: 'date', label: 'Tarih', icon: Calendar },
                                                { id: 'rating', label: 'Puan (1-5)', icon: Star },
                                                { id: 'select', label: 'Liste', icon: ListFilter },
                                                { id: 'geometry', label: 'Geometri', icon: MapPin },
                                                { id: 'file', label: 'Dosya (PDF/JPG)', icon: FileCode },
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setEditingColumn({ ...editingColumn, type: t.id, config: t.id === 'geometry' ? { geom_type: 'Point' } : (t.id === 'file' ? { allowed_types: ['pdf', 'jpg'] } : {}) })}
                                                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-xs font-bold ${editingColumn.type === t.id ? 'bg-cyan-500/10 border-primary-200 text-cyan-400 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'glass-panel border-white/5 border-white/10 text-slate-400 hover:border-white/10'}`}
                                                >
                                                    <t.icon className="h-4 w-4" />
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {editingColumn.type === 'geometry' && (
                                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Geometri Tipi</label>
                                            <select
                                                value={editingColumn.config?.geom_type || 'Point'}
                                                onChange={(e) => setEditingColumn({ ...editingColumn, config: { ...editingColumn.config, geom_type: e.target.value } })}
                                                className="w-full bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none text-xs font-bold"
                                            >
                                                <option value="Point">Nokta (Point)</option>
                                                <option value="LineString">Çizgi (LineString)</option>
                                                <option value="Polygon">Poligon (Polygon)</option>
                                                <option value="MultiPoint">Çoklu Nokta (MultiPoint)</option>
                                                <option value="MultiLineString">Çoklu Çizgi (MultiLineString)</option>
                                                <option value="MultiPolygon">Çoklu Poligon (MultiPolygon)</option>
                                            </select>
                                        </div>
                                    )}

                                    {editingColumn.type === 'select' && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200 p-4 bg-cyan-500/10/30 rounded-2xl border border-primary-100">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-cyan-400 uppercase">Seçenek Listesi</label>
                                                <label className="flex items-center gap-1.5 px-3 py-1 glass-panel border-white/5 border border-primary-100 text-cyan-400 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-cyan-500/10 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                                    <FileUp className="h-3 w-3" /> CSV Yükle
                                                    <input
                                                        type="file"
                                                        accept=".csv"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (event) => {
                                                                const text = event.target?.result as string;
                                                                // Simple CSV parse (comma or semicolon)
                                                                const lines = text.split(/\r?\n/).filter(line => line.trim());
                                                                const newOptions = lines.map(line => {
                                                                    const parts = line.includes(';') ? line.split(';') : line.split(',');
                                                                    const val = parts[0].trim();
                                                                    const lbl = parts[1] ? parts[1].trim() : val;
                                                                    return { value: val, label: lbl };
                                                                }).filter(o => o.value);
                                                                setEditingColumn({
                                                                    ...editingColumn,
                                                                    options: [...(editingColumn.options || []), ...newOptions]
                                                                });
                                                            };
                                                            reader.readAsText(file);
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <textarea
                                                rows={3}
                                                placeholder="Her satıra bir seçenek veya 'değer,etiket' yazın..."
                                                className="w-full glass-panel border-white/5 p-3 rounded-xl border border-primary-100 focus:ring-2 focus:ring-cyan-500/50 outline-none text-xs"
                                                onChange={(e) => {
                                                    const text = e.target.value;
                                                    setOptionsText(text);
                                                    const lines = text.split('\n').filter(l => l.trim());
                                                    const opts = lines.map(l => {
                                                        const p = l.includes(',') ? l.split(',') : [l, l];
                                                        return { value: p[0].trim(), label: p[1].trim() };
                                                    });
                                                    setEditingColumn({ ...editingColumn, options: opts });
                                                }}
                                                value={optionsText}
                                            />
                                            <div className="flex items-center gap-2 px-1">
                                                <input
                                                    type="checkbox"
                                                    id="allow_other"
                                                    checked={editingColumn.config?.allow_other || false}
                                                    onChange={(e) => setEditingColumn({
                                                        ...editingColumn,
                                                        config: { ...editingColumn.config, allow_other: e.target.checked }
                                                    })}
                                                    className="w-4 h-4 text-cyan-400 focus:ring-cyan-500/50 border-white/20 rounded"
                                                />
                                                <label htmlFor="allow_other" className="text-xs font-bold text-cyan-300 cursor-pointer">
                                                    "Diğer" seçeneğine ve manuel girişe izin ver
                                                </label>
                                            </div>
                                            <p className="text-[9px] text-primary-400 italic font-medium">İpucu: Virgül ayraçlı veya satır bazlı giriş yapabilirsiniz.</p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-1">
                                        <label className="flex items-center gap-2 font-bold text-xs text-slate-300 cursor-pointer">
                                            <input type="checkbox" checked={editingColumn.is_required} onChange={(e) => setEditingColumn({ ...editingColumn, is_required: e.target.checked })} className="h-4 w-4 rounded border-white/20 text-cyan-400 focus:ring-cyan-500/50" />
                                            Bu alan zorunlu olsun
                                        </label>
                                    </div>
                                    <button type="submit" className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 active:scale-[0.98] transition-all mt-4 border-b-4 border-primary-800">
                                        {editingColumn.id ? 'Değişiklikleri Kaydet' : 'Kolonu Oluştur'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    isFormModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                            <div className="glass-panel border-white/5 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                                <div className="p-6 border-b flex justify-between items-center bg-slate-900/50 text-slate-200">
                                    <h3 className="font-bold">Form Tasarla</h3>
                                    <button onClick={() => setIsFormModalOpen(false)} className="text-2xl font-bold">&times;</button>
                                </div>
                                <form onSubmit={handleSaveForm} className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Form Adı</label>
                                        <input required type="text" placeholder="Örn: Temel Bilgi Formu" value={editingForm.name} onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })} className="w-full bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Görünecek Alanlar</label>
                                        <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10">
                                            {columns.length === 0 ? (
                                                <p className="text-xs text-slate-500 text-center py-4">Önce Tablo sekmesinden kolon ekleyin.</p>
                                            ) : (
                                                columns.map(col => (
                                                    <label key={col.id} className="flex items-center gap-3 p-2 glass-panel border-white/5 rounded-lg border border-gray-50 hover:border-primary-100 cursor-pointer">
                                                        <input type="checkbox" checked={editingForm.selected_columns?.includes(col.id)} onChange={(e) => {
                                                            const sel = editingForm.selected_columns || [];
                                                            setEditingForm({ ...editingForm, selected_columns: e.target.checked ? [...sel, col.id] : sel.filter((s: any) => s !== col.id) });
                                                        }} className="h-4 w-4 rounded border-white/20 text-cyan-400 focus:ring-cyan-500/50" />
                                                        <span className="text-sm font-medium">{col.label}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 transition-all mt-4">Kaydet</button>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Grid Regeneration Warning Modal */}
            {
                showAreaDataWarning && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <div className="glass-panel border-white/5 rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-8 w-8" />
                                    <h3 className="text-xl font-bold">Veri Kaybı Uyarısı</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Bu proje için <span className="font-bold text-red-600">{areaDataCount} adet</span> grid bazlı veri girişi bulunmaktadır.
                                </p>
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-red-700 text-sm font-medium">
                                        ⚠️ Gridleri yeniden üretirseniz bu veriler <strong>kalıcı olarak silinecektir</strong>!
                                    </p>
                                </div>
                                <p className="text-slate-400 text-xs">
                                    Devam etmeden önce verilerinizi yedeklemenizi öneririz.
                                </p>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <button
                                    onClick={() => setShowAreaDataWarning(false)}
                                    className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={confirmGridGeneration}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
                                >
                                    Yine de Devam Et
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Edit Response Modal */}
            {isEditingModalOpen && editingResponse && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="glass-panel border-white/5 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-900/50 text-slate-200 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg flex items-center justify-center">
                                    <Edit className="h-4 w-4" />
                                </div>
                                <h3 className="font-bold text-white">Kaydı Düzenle</h3>
                            </div>
                            <button onClick={() => setIsEditingModalOpen(false)} className="text-slate-500 hover:text-slate-300 text-2xl font-bold p-2">&times;</button>
                        </div>

                        <form onSubmit={handleUpdateResponse} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Kullanıcı</label>
                                    <div className="bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 text-sm font-medium text-slate-400">
                                        User_{editingResponse.user_id}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Hücre ID</label>
                                    <div className="bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 text-sm font-mono text-slate-400">
                                        {editingResponse.h3_index || '-'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Veri İçeriği</h4>
                                </div>

                                {Object.entries(editingResponse.response_data || {}).map(([key, value]: [string, any]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{key}</label>
                                        {typeof value === 'object' && value !== null ? (
                                            <textarea
                                                className="w-full bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none text-xs font-mono"
                                                rows={4}
                                                value={JSON.stringify(value, null, 2)}
                                                onChange={(e) => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        setEditingResponse({
                                                            ...editingResponse,
                                                            response_data: {
                                                                ...editingResponse.response_data,
                                                                [key]: parsed
                                                            }
                                                        });
                                                    } catch (err) {
                                                        // Just update text for now, but user will get error on submit if invalid
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full bg-slate-900/50 text-slate-200 p-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-cyan-500/50 outline-none text-sm font-medium"
                                                value={String(value)}
                                                onChange={(e) => {
                                                    setEditingResponse({
                                                        ...editingResponse,
                                                        response_data: {
                                                            ...editingResponse.response_data,
                                                            [key]: e.target.value
                                                        }
                                                    });
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </form>

                        <div className="p-6 border-t bg-slate-900/50 text-slate-200 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsEditingModalOpen(false)}
                                className="flex-1 px-4 py-3 glass-panel border-white/5 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-slate-800 transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleUpdateResponse}
                                className="flex-[2] px-4 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-500 transition-all active:scale-95"
                            >
                                Değişiklikleri Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProjectDetails;

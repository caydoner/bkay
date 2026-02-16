import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MapContainer from '../../components/map/MapContainer';
import { ChevronLeft, Send, Search, X, Loader2, Database, MapPin, FileUp, Grid3x3, Pencil, Trash2 } from 'lucide-react';
import api from '../../lib/api';

// Geometry input modes
type GeometryInputMode = 'grid' | 'manual' | null;

const MapEntry: React.FC = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [selectedCell, setSelectedCell] = useState<string | null>(null);
    const [formDetails, setFormDetails] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Drawing states
    const [drawMode, setDrawMode] = useState<string | null>(null);
    const [activeDrawCol, setActiveDrawCol] = useState<string | null>(null);
    const activeDrawColRef = useRef<string | null>(null);
    const drawInstanceRef = useRef<any>(null); // Store draw instance to clear polygons

    // Multi-select grid states
    const [selectedGridCells, setSelectedGridCells] = useState<string[]>([]);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [activeGeomCol, setActiveGeomCol] = useState<string | null>(null);

    // Geometry input mode per column
    const [geometryInputModes, setGeometryInputModes] = useState<Record<string, GeometryInputMode>>({});

    // Tracks which select columns have "Other" option active
    const [activeOtherCols, setActiveOtherCols] = useState<Record<string, boolean>>({});

    // Zoom-based grid loading
    const [currentZoom, setCurrentZoom] = useState(10);
    const [currentResolution, setCurrentResolution] = useState<number | null>(null);

    // Load grids based on zoom level
    const loadGridsByZoom = useCallback(async (zoom: number) => {
        if (!projectId) return;
        try {
            const res = await api.get(`/grids/${projectId}/by-zoom?zoom=${zoom}`);
            if (res.data.features && res.data.features.length > 0) {
                setCurrentResolution(res.data.resolution);
            }
        } catch (err) {
            console.error('Error loading grids by zoom:', err);
            // Fallback to default grids
        }
    }, [projectId]);

    useEffect(() => {
        const init = async () => {
            if (!projectId) return;
            const userId = localStorage.getItem('user_id');

            try {
                // 1. Fetch Grids (initial load - will be updated on zoom)
                try {
                    const gridRes = await api.get(`/grids/${projectId}/by-zoom?zoom=10`);
                    if (gridRes.data.features && gridRes.data.features.length > 0) {
                        setCurrentResolution(gridRes.data.resolution);
                    }
                } catch {
                    // Legacy grid fetching removed
                }

                // 2. Fetch User Assignment to get Form
                const assignmentsRes = await api.get(`/schema/assignments/${projectId}`);
                const userAssign = assignmentsRes.data.find((a: any) => a.user_id.toString() === userId);

                if (userAssign) {
                    // 3. Fetch Full Form Details
                    const formRes = await api.get(`/schema/form/${userAssign.form_id}`);
                    setFormDetails(formRes.data);
                }
            } catch (err) {
                console.error('Initialization error:', err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [projectId]);

    // Handle zoom change to load appropriate resolution grids
    const handleZoomChange = useCallback((zoom: number) => {
        setCurrentZoom(zoom);
        loadGridsByZoom(zoom);
    }, [loadGridsByZoom]);

    const handleCellClick = (feature: any) => {
        if (drawMode) return; // Don't switch cells while drawing
        if (multiSelectMode) return; // Multi-select handled by MapContainer
        setSelectedCell(feature.properties.h3_index);
        setFormData({}); // Reset form data for new cell
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !formDetails) return;

        // Validation
        const missingFields = formDetails.columns
            .filter((col: any) => col.is_required && !formData[col.name])
            .map((col: any) => col.label);

        if (missingFields.length > 0) {
            toast.error(`Lütfen zorunlu alanları doldurun: ${missingFields.join(', ')}`, {
                duration: 5000,
            });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/responses/', {
                project_id: projectId,
                h3_index: selectedCell || null,
                response_data: formData
            });
            toast.success('✅ Veri başarıyla kaydedildi!', {
                duration: 3000,
            });
            setSelectedCell(null);
            setSelectedGridCells([]);
            setFormData({});
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Bilinmeyen hata';
            toast.error(
                <div>
                    <strong>Kayıt Hatası:</strong>
                    <br />
                    {errorMessage}
                </div>,
                { duration: 6000 }
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (colName: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [colName]: value }));
    };

    const handleDrawComplete = (feature: any) => {
        // Use ref to get current value (avoids stale closure)
        const col = activeDrawColRef.current;
        if (col && feature?.geometry) {
            // Set form data with the geometry
            setFormData((prev: any) => ({ ...prev, [col]: feature.geometry }));
            // Reset all draw-related state
            setDrawMode(null);
            setActiveDrawCol(null);
            activeDrawColRef.current = null;
            // Clear geometry input mode so the completed geometry section shows
            setGeometryInputModes((prev: Record<string, GeometryInputMode>) => ({ ...prev, [col]: null }));
        }
    };

    const startDrawing = (colName: string, geomType: string) => {
        setActiveDrawCol(colName);
        activeDrawColRef.current = colName; // Sync ref
        const mode = geomType === 'Point' ? 'draw_point' :
            geomType === 'LineString' ? 'draw_line_string' :
                'draw_polygon';
        setDrawMode(mode);
    };

    // Handle multi-select grid cells change
    const handleSelectedCellsChange = (cells: string[]) => {
        setSelectedGridCells(cells);
    };

    // Start multi-select mode for a polygon column
    const startGridSelection = (colName: string) => {
        setMultiSelectMode(true);
        setActiveGeomCol(colName);
        setSelectedGridCells([]);
    };

    // Confirm grid selection and convert to geometry
    const confirmGridSelection = async () => {
        if (!activeGeomCol || selectedGridCells.length === 0) return;

        try {
            // Get intersecting high-resolution cells
            const res = await api.post(`/grids/${projectId}/intersecting-cells`, selectedGridCells);

            // Create a combined geometry from selected cells
            // For now, store the array of H3 indices and let backend handle conversion
            const geometryData = {
                type: 'GridSelection',
                h3_indices: res.data.cells || selectedGridCells,
                resolution: res.data.resolution,
                original_selection: selectedGridCells
            };

            handleInputChange(activeGeomCol, geometryData);

            // Exit multi-select mode
            setMultiSelectMode(false);
            setActiveGeomCol(null);
        } catch (err) {
            console.error('Error confirming grid selection:', err);
            // Fallback: just use selected cells
            handleInputChange(activeGeomCol, {
                type: 'GridSelection',
                h3_indices: selectedGridCells
            });
            setMultiSelectMode(false);
            setActiveGeomCol(null);
        }
    };

    // Set geometry input mode for a column
    const setColumnGeometryMode = (colName: string, mode: GeometryInputMode) => {
        setGeometryInputModes(prev => ({ ...prev, [colName]: mode }));

        // If switching to grid mode for polygon, activate multi-select
        if (mode === 'grid') {
            startGridSelection(colName);
        } else if (mode === 'manual') {
            setMultiSelectMode(false);
            setActiveGeomCol(null);
        }
    };

    // Clear geometry input mode
    const clearColumnGeometryMode = (colName: string) => {
        setGeometryInputModes(prev => ({ ...prev, [colName]: null }));
        setMultiSelectMode(false);
        setActiveGeomCol(null);
        setSelectedGridCells([]);
        // Reset draw mode and active column
        setDrawMode(null);
        setActiveDrawCol(null);
        activeDrawColRef.current = null;
        // Clear drawn polygon from map
        if (drawInstanceRef.current) {
            drawInstanceRef.current.deleteAll();
        }
        // Clear form data for this column
        setFormData((prev: any) => ({ ...prev, [colName]: null }));
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center font-bold text-primary-600 bg-gray-50"><Loader2 className="h-8 w-8 animate-spin" /> Yükleniyor...</div>;

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
            {/* Map Header */}
            <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/public')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-900">Veri Toplama</h1>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{formDetails?.name || 'Genel Form'}</p>
                    </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center gap-3">
                    {multiSelectMode && (
                        <div className="bg-cyan-50 border border-cyan-200 px-4 py-2 rounded-xl flex items-center gap-3">
                            <Grid3x3 className="h-4 w-4 text-cyan-600" />
                            <span className="text-xs font-bold text-cyan-800">
                                Grid Seçimi: {selectedGridCells.length} hücre
                            </span>
                            <button
                                onClick={confirmGridSelection}
                                disabled={selectedGridCells.length === 0}
                                className="text-[10px] font-black uppercase text-cyan-600 hover:text-cyan-800 disabled:opacity-50"
                            >
                                ONAYLA
                            </button>
                            <button
                                onClick={() => {
                                    setMultiSelectMode(false);
                                    setSelectedGridCells([]);
                                    setActiveGeomCol(null);
                                }}
                                className="text-[10px] font-black uppercase text-red-500 hover:text-red-700"
                            >
                                İPTAL
                            </button>
                        </div>
                    )}

                    {drawMode && (
                        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-amber-600 animate-pulse" />
                            <span className="text-xs font-bold text-amber-800">Çizim: {activeDrawCol}</span>
                            <span className="text-[10px] text-amber-600">(Haritada çift tıklayarak bitirin)</span>
                            <button
                                onClick={() => { setDrawMode(null); setActiveDrawCol(null); }}
                                className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 border-l border-amber-300 pl-3"
                            >
                                İPTAL
                            </button>
                        </div>
                    )}

                    {currentResolution && (
                        <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
                            <span className="text-[10px] font-bold text-gray-500">
                                Zoom: {currentZoom} | Çözünürlük: {currentResolution}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative hidden md:block">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Konum Ara..."
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
                        />
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Left Pane: Map (3/4) */}
                <div className="flex-[3] relative bg-gray-200">
                    <MapContainer
                        projectId={projectId}
                        onCellClick={handleCellClick}
                        drawMode={drawMode}
                        onDrawComplete={handleDrawComplete}
                        multiSelectMode={multiSelectMode}
                        selectedCells={selectedGridCells}
                        onSelectedCellsChange={handleSelectedCellsChange}
                        onZoomChange={handleZoomChange}
                        onLoad={(_map, draw) => {
                            drawInstanceRef.current = draw;
                        }}
                    />
                </div>

                {/* Right Pane: Form (1/4) */}
                <div className="flex-1 bg-white border-l border-gray-100 flex flex-col min-h-0 shadow-xl z-20">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <div>
                            <h2 className="font-bold text-gray-900">Veri Giriş Formu</h2>
                            {selectedCell && (
                                <p className="text-xs text-primary-600 font-mono mt-1">
                                    Hücre: {selectedCell.slice(-8)}
                                </p>
                            )}
                        </div>
                        {selectedCell && (
                            <button
                                onClick={() => { setSelectedCell(null); setFormData({}); }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {formDetails ? (
                            formDetails.columns.map((col: any) => (
                                <div key={col.id} className="mb-6">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                        {col.label} {col.is_required && <span className="text-red-500">*</span>}
                                    </label>

                                    {col.type === 'text' && (
                                        <input
                                            type="text"
                                            required={col.is_required}
                                            value={formData[col.name] || ''}
                                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                                            className="w-full bg-white border border-gray-100 py-3 px-4 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            placeholder={col.label}
                                        />
                                    )}

                                    {col.type === 'number' && (
                                        <input
                                            type="number"
                                            required={col.is_required}
                                            value={formData[col.name] || ''}
                                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                                            className="w-full bg-white border border-gray-100 py-3 px-4 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            placeholder={col.label}
                                        />
                                    )}

                                    {col.type === 'rating' && (
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => handleInputChange(col.name, v)}
                                                    className={`flex-1 h-12 rounded-xl font-bold border transition-all ${formData[col.name] === v ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-200' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {col.type === 'select' && (
                                        <div className="space-y-2">
                                            <select
                                                required={col.is_required && !formData[col.name]}
                                                value={col.options?.some((o: any) => o.value === formData[col.name]) ? (formData[col.name] || '') : (formData[col.name] || activeOtherCols[col.name] ? 'other' : '')}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'other') {
                                                        setActiveOtherCols(prev => ({ ...prev, [col.name]: true }));
                                                        handleInputChange(col.name, '');
                                                    } else {
                                                        setActiveOtherCols(prev => ({ ...prev, [col.name]: false }));
                                                        handleInputChange(col.name, val);
                                                    }
                                                }}
                                                className="w-full bg-white border border-gray-100 py-3 px-4 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm appearance-none cursor-pointer"
                                            >
                                                <option value="">Seçiniz...</option>
                                                {col.options?.map((opt: any) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                                {col.config?.allow_other && (
                                                    <option value="other">Diğer...</option>
                                                )}
                                            </select>

                                            {(activeOtherCols[col.name] || (formData[col.name] && !col.options?.some((o: any) => o.value === formData[col.name]))) && (
                                                <div className="animate-in slide-in-from-top-2 duration-200">
                                                    <input
                                                        type="text"
                                                        placeholder="Lütfen belirtiniz..."
                                                        value={formData[col.name] || ''}
                                                        onChange={(e) => handleInputChange(col.name, e.target.value)}
                                                        className="w-full bg-primary-50/50 border border-primary-100 py-3 px-4 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium"
                                                        required={col.is_required}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {col.type === 'geometry' && (
                                        <div className="space-y-3">
                                            {/* Geometry type determines available modes */}
                                            {col.config?.geom_type === 'Polygon' ? (
                                                <>
                                                    {/* Mode selection for Polygon */}
                                                    {!geometryInputModes[col.name] && !formData[col.name] && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setColumnGeometryMode(col.name, 'grid')}
                                                                className="flex-1 py-3 rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-cyan-100 transition-all"
                                                            >
                                                                <Grid3x3 className="h-4 w-4" />
                                                                Grid Bazlı
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setColumnGeometryMode(col.name, 'manual')}
                                                                className="flex-1 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-100 transition-all"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Manuel Çizim
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Grid selection mode */}
                                                    {geometryInputModes[col.name] === 'grid' && !formData[col.name] && (
                                                        <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl space-y-3">
                                                            <p className="text-xs text-cyan-700">
                                                                Haritadan gridleri seçin. <strong>Shift+Click</strong> ile seçimi kaldırın.
                                                            </p>
                                                            {selectedGridCells.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                                                    {selectedGridCells.slice(0, 10).map(cell => (
                                                                        <span key={cell} className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded text-[10px] font-mono">
                                                                            {cell.slice(-6)}
                                                                        </span>
                                                                    ))}
                                                                    {selectedGridCells.length > 10 && (
                                                                        <span className="text-cyan-600 text-[10px]">
                                                                            +{selectedGridCells.length - 10} daha
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={confirmGridSelection}
                                                                    disabled={selectedGridCells.length === 0}
                                                                    className="flex-1 py-2 rounded-lg bg-cyan-600 text-white font-bold text-xs disabled:opacity-50"
                                                                >
                                                                    Seçimi Onayla ({selectedGridCells.length})
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => clearColumnGeometryMode(col.name)}
                                                                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 font-bold text-xs"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Manual drawing mode for polygon */}
                                                    {geometryInputModes[col.name] === 'manual' && !formData[col.name] && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startDrawing(col.name, 'Polygon')}
                                                                className="flex-1 py-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center gap-2"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Poligon Çiz
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => clearColumnGeometryMode(col.name)}
                                                                className="px-4 rounded-xl border border-gray-200 text-gray-500"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Show completed geometry */}
                                                    {formData[col.name] && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 py-3 px-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center gap-2">
                                                                <MapPin className="h-4 w-4" />
                                                                {formData[col.name].type === 'GridSelection'
                                                                    ? `${formData[col.name].h3_indices?.length || 0} grid seçildi`
                                                                    : 'Poligon çizildi'}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => clearColumnGeometryMode(col.name)}
                                                                className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                /* Point and LineString - Manual only */
                                                <>
                                                    {!formData[col.name] ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => startDrawing(col.name, col.config?.geom_type || 'Point')}
                                                            className="w-full py-4 rounded-xl border border-primary-100 bg-white text-primary-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-50 transition-all"
                                                        >
                                                            <MapPin className="h-4 w-4" />
                                                            {col.config?.geom_type === 'LineString' ? 'Çizgi Çiz' : 'Nokta İşaretle'}
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 py-3 px-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center gap-2">
                                                                <MapPin className="h-4 w-4" />
                                                                {col.config?.geom_type === 'LineString' ? 'Çizgi çizildi' : 'Nokta işaretlendi'}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleInputChange(col.name, null)}
                                                                className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {col.type === 'file' && (
                                        <label className="w-full py-6 rounded-xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all">
                                            <FileUp className="h-6 w-6 text-gray-300" />
                                            <span className="text-xs font-bold text-gray-400">Tıklayın veya Dosya Sürükleyin</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleInputChange(col.name, file.name);
                                                }}
                                            />
                                            {formData[col.name] && <span className="text-[10px] text-primary-600 font-bold">{formData[col.name]} Seçildi</span>}
                                        </label>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <div className="h-16 w-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto">
                                    <Database className="h-8 w-8" />
                                </div>
                                <h4 className="font-bold text-gray-900">Form Atanmamış</h4>
                                <p className="text-sm text-gray-500">Bu proje için size bir form atanmamış. Lütfen yönetici ile iletişime geçin.</p>
                            </div>
                        )}
                    </div>

                    {formDetails && (
                        <div className="p-6 border-t border-gray-50 bg-gray-50/50 shrink-0">
                            <button
                                type="button"
                                disabled={submitting || drawMode !== null || multiSelectMode}
                                onClick={handleFormSubmit}
                                className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                Veriyi Gönder
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapEntry;

import os

file_path = r'c:\Users\caydoner\Desktop\BKAY\paydas_analizi\app_v1\frontend\src\pages\admin\ProjectDetails.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# I will find the exact bounds of the bad sections
start_marker = "                {activeTab === 'general' && ("
end_marker = "                {activeTab === 'table' && ("

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

if start_idx != -1 and end_idx != -1:
    fixed_content = """                {activeTab === 'general' && (
                    <div className="w-full max-w-2xl glass-panel border-white/5 rounded-3xl p-8 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit mt-8 animate-in zoom-in-95 fade-in duration-300">
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
                )}
                
                {activeTab === 'map' && (
                    <div className="w-[340px] glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto absolute left-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-left-8 duration-300">
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
                                        const area = projectAreas.find((a: any) => a.id === areaId);
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
                                {projectAreas.map((area: any) => (
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
                                        className="flex-1 bg-red-50/10 text-red-500 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
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
                                    className="bg-green-600/80 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-all disabled:opacity-50 flex items-center gap-1"
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
                                <div className="bg-cyan-500/10 rounded-lg p-2 text-center border border-cyan-500/20">
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
                                    className="accent-cyan-500 w-full h-1.5"
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
                                    className="accent-cyan-500 w-full h-1.5"
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
                                    className="accent-cyan-500 w-full h-1.5"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                            <label className="flex items-center justify-center gap-2 w-full bg-slate-900/50 text-slate-200 border border-white/10 text-slate-300 py-2 rounded-xl font-bold cursor-pointer hover:bg-slate-800 transition-all text-xs">
                                <FileUp className="h-4 w-4" /> KML/GeoJSON Yükle
                                <input type="file" accept=".kml,.geojson" className="hidden" onChange={handleFileUpload} />
                            </label>

                            <button
                                onClick={handleGenerateGrid}
                                disabled={generatingGrids || (!selectedAreaId && !drawnGeometry)}
                                className="w-full bg-indigo-600/80 text-white py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-900/50 border border-indigo-500/50 hover:bg-indigo-600 transition-all active:scale-95 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {generatingGrids ? <Loader2 className="h-4 w-4 animate-spin" /> : <GridIcon className="h-4 w-4" />}
                                {generatingGrids ? 'Üretiliyor...' : (selectedAreaId ? 'Alan Gridlerini Üret' : 'Gridleri Üret')}
                            </button>

                            {generatingGrids && (
                                <div className="space-y-2 pt-1 border-t border-white/10 mt-1">
                                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full transition-all duration-300"
                                            style={{ width: `${generationProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium animate-pulse text-center">{generationMessage}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
\n"""

    new_code = code[:start_idx] + fixed_content + code[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("General and Map blocks replaced successfully!")
else:
    print("Could not find start or end markers:")
    print("START:", start_idx)
    print("END:", end_idx)

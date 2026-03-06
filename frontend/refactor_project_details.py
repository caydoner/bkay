import os
import re

file_path = r'c:\Users\caydoner\Desktop\BKAY\paydas_analizi\app_v1\frontend\src\pages\admin\ProjectDetails.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    original_code = f.read()

# 1. extract General content block
general_match = re.search(r'\{activeTab === \'general\' && \(\s*<div className="max-w-2xl(.*?)</button>\s*</div>\s*</div>\s*\)}', original_code, re.DOTALL)
general_content = general_match.group(1) if general_match else ""

# 2. extract Map settings block (Area Selection + Grid Settings)
map_content_match = re.search(r'<div className="absolute top-4 right-4 bg-slate-900/80(.*?)</button>\s*</div>\s*</div>\s*</div>\s*\)}', original_code, re.DOTALL)
map_content = map_content_match.group(1) if map_content_match else ""
map_content = map_content.replace('</div>\n                                        </div>\n                                    )}', '</div>\n                                    )}')

# 3. extract Table config block 
table_match = re.search(r'\{activeTab === \'table\' && \(\s*<div className="max-w-4xl(.*?)</button>\s*</div>\s*</div>\s*</div>\s*\)}', original_code, re.DOTALL)
table_content = table_match.group(1) if table_match else ""

# 4. extract Forms block
forms_match = re.search(r'\{activeTab === \'forms\' && \(\s*<div className="max-w-4xl(.*?)</button>\s*</div>\s*</div>\s*</div>\s*\)}', original_code, re.DOTALL)
forms_content = forms_match.group(1) if forms_match else ""

# 5. extract Stakeholders block
stakeholders_match = re.search(r'\{activeTab === \'stakeholders\' && \(\s*<div className="max-w-4xl(.*?)</select>\s*</div>\s*</div>\s*\);\s*}\)}\s*</div>\s*</div>\s*\)}', original_code, re.DOTALL)
stakeholders_content = stakeholders_match.group(1) if stakeholders_match else ""

# 6. extract Data block
data_toolbar_match = re.search(r'{/\* Toolbar \*/}(.*?){/\* Top: Records Table \*/}', original_code, re.DOTALL)
data_toolbar = data_toolbar_match.group(1) if data_toolbar_match else ""

data_table_match = re.search(r'{/\* Top: Records Table \*/}(.*?){/\* Bottom: Split View', original_code, re.DOTALL)
data_table = data_table_match.group(1) if data_table_match else ""

data_details_match = re.search(r'<h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">Kayıt Detayları</h4>(.*?)</div>\s*</div>\s*</div>\s*\)}', original_code, re.DOTALL)
data_details = data_details_match.group(1) if data_details_match else ""


new_structure = r"""
    // Helper to get selected response geometry for the data tab map view
    const getActiveResponseGeometryData = () => {
        const activeResponse = selectedResponse || (selectedResponseIds.size > 0
            ? responses.find((r: any) => r.id === Array.from(selectedResponseIds)[0])
            : null);

        if (activeResponse?.response_data) {
            const geomEntry = Object.entries(activeResponse.response_data).find(([_, v]: [string, any]) =>
                v && (v.type === 'GridSelection' || v.type || v.coordinates || v.features)
            );

            if (geomEntry) {
                const [_, geomData] = geomEntry as [string, any];
                if (geomData.type === 'GridSelection') {
                    return { selectedCells: geomData.h3_indices || [] };
                }
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
    };

    const mapGeomData = activeTab === 'data' ? getActiveResponseGeometryData() : {};

    return (
        <div className="flex-1 relative flex flex-col h-full h-[calc(100vh)] overflow-hidden bg-slate-950">
            {/* Full Bleed Background Map */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${activeTab === 'general' ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
                <MapContainer
                    projectId={id}
                    areaId={selectedAreaId || undefined}
                    initialGeometry={
                        activeTab === 'data' 
                            ? mapGeomData.initialGeometry 
                            : (selectedAreaId ? projectAreas.find(a => a.id === selectedAreaId)?.boundary_geom : boundary)
                    }
                    selectedCells={mapGeomData.selectedCells}
                    onZoomChange={setCurrentZoom}
                    fitTrigger={fitTrigger}
                    autoZoom={activeTab === 'data'}
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
            </div>

            {/* Top HUD Layer (Header + Tabs) */}
            <div className="relative z-10 w-full p-4 pb-0 pointer-events-none flex flex-col items-center">
                <div className="glass-panel border-white/5 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl bg-slate-900/60 pointer-events-auto border border-white/10 w-full max-w-7xl relative mx-auto">
                    {/* Header */}
                    <header className="px-6 py-4 flex justify-between items-center bg-slate-900/40 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/admin/projects')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="h-10 w-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                <Database className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="font-bold text-white text-lg">{project?.name}</h1>
                                <p className="text-[10px] uppercase font-bold text-cyan-500 tracking-widest">Proje Command Center</p>
                            </div>
                        </div>
                    </header>
                    {/* Tabs / HUD Navigation */}
                    <div className="px-6 flex gap-8 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'general', label: 'Genel', icon: Settings },
                            { id: 'map', label: 'Harita (Grid)', icon: MapIcon },
                            { id: 'table', label: 'Şema Defteri', icon: TableIcon },
                            { id: 'forms', label: 'Formlar', icon: ClipboardList },
                            { id: 'stakeholders', label: 'Görev Atamaları', icon: UsersIcon },
                            { id: 'data', label: 'Veri Radarı', icon: Database }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 border-b-2 font-bold transition-all whitespace-nowrap text-xs tracking-wide uppercase ${
                                    activeTab === tab.id
                                    ? 'border-cyan-400 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Content Panels */}
            <div className="relative z-10 flex-1 flex pointer-events-none p-4 overflow-hidden justify-center max-w-7xl mx-auto w-full">
                {activeTab === 'general' && (
                    <div className="w-full max-w-2xl glass-panel border-white/5 rounded-3xl p-8 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit mt-8 animate-in zoom-in-95 fade-in duration-300">
                        <!--GENERAL_CONTENT-->
                        </button>
                    </div>
                )}
                
                {activeTab === 'map' && (
                    <div className="w-[340px] glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto absolute left-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-left-8 duration-300">
                        <!--MAP_CONTENT-->
                        </div>
                    </div>
                )}

                {activeTab === 'table' && (
                    <div className="w-[600px] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto absolute left-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-left-8 duration-300">
                        <!--TABLE_CONTENT-->
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'forms' && (
                    <div className="w-[600px] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto absolute left-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-left-8 duration-300">
                        <!--FORMS_CONTENT-->
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'stakeholders' && (
                    <div className="w-[500px] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto absolute right-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 duration-300">
                        <!--STAKEHOLDERS_CONTENT-->
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                )}

                {activeTab === 'data' && (
                    {/* Retractable Bottom Drawer for Table & Analytics */}
                    <div className="absolute inset-x-4 bottom-4 h-[45%] glass-panel border-white/5 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-3xl bg-slate-900/80 border border-white/10 flex flex-col pointer-events-auto animate-in slide-in-from-bottom-8 duration-300 overflow-hidden">
                        <!--DATA_TOOLBAR-->
                        <!--DATA_TABLE-->
                    </div>
                )}
            </div>

            {/* Selected Data Overlay HUD (Shows up for details) */}
            {activeTab === 'data' && selectedResponse && (
                 <div className="absolute right-8 top-[140px] bottom-[calc(45%+2rem)] w-[400px] glass-panel border-white/5 border-l border-b border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-3xl bg-slate-900/90 rounded-3xl p-6 pointer-events-auto flex flex-col min-h-0 overflow-y-auto scrollbar-hide animate-in slide-in-from-right-8 duration-300 z-20">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                        <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                           <Database className="h-4 w-4"/> Kayıt Detayları
                        </h4>
                        <button onClick={() => setSelectedResponse(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-900/50 p-2 rounded-xl">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <!--DATA_DETAILS-->
            )}
        </div>
"""

new_structure = new_structure.replace('<!--GENERAL_CONTENT-->', general_content)
new_structure = new_structure.replace('<!--MAP_CONTENT-->', map_content)
new_structure = new_structure.replace('<!--TABLE_CONTENT-->', table_content)
new_structure = new_structure.replace('<!--FORMS_CONTENT-->', forms_content)
new_structure = new_structure.replace('<!--STAKEHOLDERS_CONTENT-->', stakeholders_content)
new_structure = new_structure.replace('<!--DATA_TOOLBAR-->', data_toolbar)
new_structure = new_structure.replace('<!--DATA_TABLE-->', data_table)
new_structure = new_structure.replace('<!--DATA_DETAILS-->', data_details)


# Replace in original file
start_marker = r'    if \(loading\) return <div .*? Yükleniyor\.\.\.</div>;'
end_marker = r'                \{/\* Modals \*/\}'

match_start = re.search(start_marker, original_code)
match_end = re.search(end_marker, original_code)

if match_start and match_end:
    pre_code = original_code[:match_start.end()]
    post_code = original_code[match_end.start():]
    
    new_code = pre_code + '\n' + new_structure + '\n' + post_code
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print('Refactoring successful!')
else:
    print('Failed to find markers')
    if not match_start: print('Start marker not found')
    if not match_end: print('End marker not found')

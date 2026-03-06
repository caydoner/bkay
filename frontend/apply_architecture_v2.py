import re
import sys

file_path = r'c:\Users\caydoner\Desktop\BKAY\paydas_analizi\app_v1\frontend\src\pages\admin\ProjectDetails.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Capture Header & Tabs
header_match = re.search(r'<header className="glass-panel.*?<div className="flex items-center gap-4">(.*?)</header>', code, re.DOTALL)
tabs_match = re.search(r'<div className="glass-panel border-white/5 border-b border-white/10 px-6 sm:px-10 flex gap-8 overflow-x-auto scrollbar-hide">(.*?)</div>\n\n\s*\{/\* Content \*/\}', code, re.DOTALL)

if not header_match or not tabs_match:
    print("Could not find header or tabs!")
    sys.exit(1)

header_inner = '<div className="flex items-center gap-4">' + header_match.group(1)
# Clean up tab padding
tabs_inner = tabs_match.group(1).replace('className={`flex items-center gap-2 py-4', 'className={`flex items-center min-w-max gap-2 pb-4').replace('className={`flex items-center min-w-max pb-4', 'className={`flex items-center min-w-max gap-2 pb-4')

new_wrapper = f"""    // Helper to get selected response geometry for the data tab map view
    const getActiveResponseGeometryData = () => {{
        const activeResponse = selectedResponse || (selectedResponseIds.size > 0 
            ? responses.find((r: any) => r.id === Array.from(selectedResponseIds)[0]) 
            : null);
            
        if (activeResponse?.response_data) {{
            const geomEntry = Object.entries(activeResponse.response_data).find(([_, v]: [string, any]) => 
                v && (v.type === 'GridSelection' || v.type || v.coordinates || v.features)
            );
            
            if (geomEntry) {{
                const [_, geomData] = geomEntry as [string, any];
                if (geomData.type === 'GridSelection') {{
                    return {{ selectedCells: geomData.h3_indices || [] }};
                }}
                if (geomData.type === 'FeatureCollection' && geomData.features?.length > 0) {{
                    return {{ initialGeometry: geomData.features[0].geometry }};
                }}
                if (geomData.type === 'Feature') {{
                    return {{ initialGeometry: geomData.geometry }};
                }}
                return {{ initialGeometry: geomData }};
            }}
        }}
        return {{}};
    }};

    const mapGeomData = activeTab === 'data' ? getActiveResponseGeometryData() : {{}};

    return (
        <div className="flex-1 relative flex flex-col h-full h-[calc(100vh)] overflow-hidden bg-slate-950">
            {{/* Full Bleed Background Map */}}
            <div className={{`absolute inset-0 z-0 transition-opacity duration-500 ${{activeTab === 'general' ? 'opacity-30 blur-sm' : 'opacity-100'}}`}}>
                <MapContainer
                    projectId={{id}}
                    areaId={{activeTab === 'map' ? (selectedAreaId || undefined) : undefined}}
                    initialGeometry={{activeTab === 'map' ? (selectedAreaId ? projectAreas.find((a: any) => a.id === selectedAreaId)?.boundary_geom : boundary) : mapGeomData.initialGeometry}}
                    selectedCells={{mapGeomData.selectedCells}}
                    onZoomChange={{setCurrentZoom}}
                    onLoad={{(map: any, draw: any) => {{
                        if (draw) {{
                            const updateGeom = () => {{
                                const data = draw.getAll();
                                if (data.features.length > 0) {{
                                    setDrawnGeometry(data.features[0].geometry);
                                }}
                            }};
                            map.on('draw.create', updateGeom);
                            map.on('draw.update', updateGeom);
                            map.on('draw.delete', () => setDrawnGeometry(null));
                        }}
                    }}}}
                    fitTrigger={{activeTab === 'data' ? Array.from(selectedResponseIds).join(',') : undefined}}
                    autoZoom={{activeTab === 'data'}}
                />
            </div>

            {{/* Top HUD Layer (Header + Tabs) */}}
            <div className="relative z-10 w-full p-4 pb-0 pointer-events-none flex flex-col items-center">
                <div className="w-full max-w-7xl glass-panel border-white/5 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 pointer-events-auto border border-white/10 overflow-hidden">
                    <header className="p-4 flex justify-between items-center z-10 bg-transparent shadow-none border-b border-white/10">
                        {header_inner}
                    </header>
                    <div className="px-6 flex gap-6 overflow-x-auto scrollbar-hide pt-4">
                        {tabs_inner}
                    </div>
                </div>
            </div>

            {{/* Floating Content Panels */}}
            <div className="relative z-10 flex-1 flex pointer-events-none p-4 overflow-hidden justify-center max-w-7xl mx-auto w-full">"""

# Replace the beginning of the return statement
pattern = r'return \(\s*<>\s*<div className="flex-1 flex flex-col bg-slate-900/50 text-slate-200 overflow-hidden">.*?<div className={`flex-1 flex flex-col min-h-0 bg-slate-950/50 text-slate-200 \${activeTab === \'map\' \? \'p-0 overflow-hidden\' : \'p-4 sm:p-8 overflow-y-auto pb-32\'}`>}'
new_code = re.sub(pattern, new_wrapper, code, flags=re.DOTALL)

# Fix the closing of the main wrapper at the end of the file
new_code = new_code.replace('                </div>\n            </div>\n        </>\n    );\n}', '            </div>\n        </div>\n    );\n}')

# Now apply spatial styles to each tab's wrapper
# General
general_style_replace = """{activeTab === 'general' && (
                    <div className="w-full max-w-2xl glass-panel border-white/5 rounded-3xl p-8 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit mt-8 animate-in zoom-in-95 fade-in duration-300">
                        <div className="glass-panel border-white/5 rounded-3xl p-8 shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 space-y-6">"""
new_code = re.sub(r"\{activeTab === 'general' && \(\s*<div className=\"w-full max-w-2xl glass-panel border-white/5 rounded-3xl p-8 shadow-\[0_0_30px_rgba\(0,0,0,0\.8\)\] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit mt-8 animate-in zoom-in-95 fade-in duration-300\">\s*<div className=\"glass-panel border-white/5 rounded-3xl p-8 shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\] border border-white/10 space-y-6\">", general_style_replace, new_code)
# Also catch the old version if it was reverted further back:
new_code = re.sub(r"\{activeTab === 'general' && \(\s*<div className=\"max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300\">\s*<div className=\"glass-panel border-white/5 rounded-3xl p-8 shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\] border border-white/10 space-y-6\">", general_style_replace, new_code)

# Map (Extract tools/grid generation into floating left pane and delete MapContainer instance from inside mapping tab)
map_content_match = re.search(r'\{activeTab === \'map\' && \(\s*<div className="flex-grow flex flex-col h-full min-h-0 relative animate-in fade-in duration-300">\s*<MapContainer.*?</MapContainer>\s*<div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-white/5 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/10 flex flex-col gap-4 z-10 w-72">(.*?)</div>\s*</div>\s*\)}', new_code, re.DOTALL)
if map_content_match:
    map_tools = map_content_match.group(1)
    new_map_tab = f"""{{activeTab === 'map' && (
                    <div className="w-[340px] glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto absolute left-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-left-8 duration-300">
                        {map_tools}
                    </div>
                )}}"""
    new_code = new_code[:map_content_match.start()] + new_map_tab + new_code[map_content_match.end():]

# Table (Note: Since we already applied modal refactors to the Table tab, we need to match the current state)
table_style_replace = """{activeTab === 'table' && (
                    <div className="w-[600px] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit absolute right-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 duration-300">"""
new_code = re.sub(r"\{activeTab === 'table' && \(\s*<div className=\"w-\[600px\] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-\[0_0_30px_rgba\(0,0,0,0\.8\)\] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit absolute right-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 duration-300\">", table_style_replace, new_code)
# Catch old version just in case
new_code = re.sub(r"\{activeTab === 'table' && \(\s*<div className=\"max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300\">\s*<div className=\"flex justify-between items-center glass-panel border-white/5 p-6 rounded-3xl shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\] border border-white/10\">", table_style_replace + '\n<div className="flex justify-between items-center glass-panel border-white/5 p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10">', new_code)

# Form Tab
form_style_replace = """{activeTab === 'forms' && (
                    <div className="w-[800px] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit absolute right-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 duration-300">"""
new_code = re.sub(r"\{activeTab === 'forms' && \(\s*<div className=\"w-\[800px\] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-\[0_0_30px_rgba\(0,0,0,0\.8\)\] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit absolute right-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 duration-300\">", form_style_replace, new_code)
new_code = re.sub(r"\{activeTab === 'forms' && \(\s*<div className=\"max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300\">\s*<div className=\"flex justify-between items-center mb-6\">", form_style_replace + '\n<div className="flex justify-between items-center mb-6">', new_code)

# Atamalar
stakeholders_style_replace = """{activeTab === 'stakeholders' && (
                    <div className="w-[900px] max-w-full glass-panel border-white/5 rounded-3xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/80 border border-white/10 space-y-6 pointer-events-auto h-fit absolute right-4 top-4 bottom-4 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-8 duration-300">
                        <div className="glass-panel border-white/5 p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 flex justify-between items-center mb-6">"""
new_code = re.sub(r"\{activeTab === 'stakeholders' && \(\s*<div className=\"max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300\">\s*<div className=\"glass-panel border-white/5 p-6 rounded-3xl shadow-\[0_0_15px_rgba\(0,0,0,0\.5\)\] border border-white/10 flex justify-between items-center mb-6\">", stakeholders_style_replace, new_code)

# Data Tab
# Remove MapContainer from Data tab and make it a bottom drawer
data_content_match = re.search(r'\{activeTab === \'data\' && \(\s*<div className="flex-grow flex flex-col h-full min-h-0 relative animate-in fade-in duration-300">\s*<MapContainer.*?</MapContainer>\s*<div className="absolute inset-x-0 bottom-0 top-\[60%\] sm:top-auto sm:h-\[45%\] bg-slate-950/95 border-t border-white/10 shadow-2xl flex flex-col pointer-events-auto z-10 backdrop-blur-xl">(.*?)</div>\s*</div>\s*\)}', new_code, re.DOTALL)
if data_content_match:
    data_drawer_content = data_content_match.group(1)
    new_data_tab = f"""{{activeTab === 'data' && (
                    <>
                        {{/* Data Table Drawer */}}
                        <div className="absolute inset-x-4 bottom-4 top-[50%] glass-panel border-white/5 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl bg-slate-900/90 border border-white/10 flex flex-col pointer-events-auto z-10 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                            {data_drawer_content}
                        </div>
                    </>
                )}}"""
    new_code = new_code[:data_content_match.start()] + new_data_tab + new_code[data_content_match.end():]


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_code)
print("Structural refactoring applied with apply_architecture_v2.py!")

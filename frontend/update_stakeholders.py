import os

file_path = r'c:\Users\caydoner\Desktop\BKAY\paydas_analizi\app_v1\frontend\src\pages\admin\ProjectDetails.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

target = """                                        <div key={user.id} className="glass-panel border-white/5 p-6 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-between group hover:border-primary-100 transition-all">
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
                                        </div>"""

replacement = """                                        <div key={user.id} className={`glass-panel border-white/5 p-5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border transition-all relative overflow-hidden group ${assignedFormId ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-slate-900/50 border-white/10 hover:border-cyan-500/30'}`}>
                                            {/* Decorative background glow if assigned */}
                                            {assignedFormId && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>}

                                            <div className="flex flex-col gap-4 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner ${assignedFormId ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-white/10 text-slate-500'}`}>
                                                        <UserCheck className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-white tracking-wide">{user.first_name || user.username} {user.last_name || ''}</h4>
                                                        <p className="text-xs text-slate-500 font-medium">{user.email || user.username}</p>
                                                    </div>
                                                    {assignedFormId && (
                                                        <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)] flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Aktif Görev
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 mt-2 flex items-center justify-between gap-4">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                                                        Yetkilendirme Formu
                                                    </div>
                                                    <select
                                                        className="bg-slate-900 text-cyan-50 text-xs font-bold px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800"
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
                                        </div>"""

if target in code:
    new_code = code.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Stakeholders replacement successful!")
else:
    print("Target string not found in Stakeholders code.")

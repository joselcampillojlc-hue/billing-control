import React, { useMemo } from 'react';
import { Trash2, Calendar, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { clsx } from 'clsx';

export default function DataManagement({ rawData, onDeleteMonth, onDeleteWeek, onReset, isAdmin }) {
    // Use pre-computed fields (month, week, amount, billingAmount) already stored in Firestore
    // Do NOT re-parse from 'F.Carga' which doesn't exist at the top level of Firestore docs
    const months = useMemo(() => {
        const groups = {};
        rawData.forEach(row => {
            const key = row.month;
            if (!key || key === 'Sin Fecha') return;
            if (!groups[key]) groups[key] = { total: 0, billing: 0, count: 0, monthIndex: row.monthIndex || '' };
            groups[key].total += parseFloat(row.amount || 0);
            groups[key].billing += parseFloat(row.billingAmount || 0);
            groups[key].count += 1;
        });
        return Object.entries(groups).sort((a, b) => b[1].monthIndex.localeCompare(a[1].monthIndex));
    }, [rawData]);

    const weeks = useMemo(() => {
        const groups = {};
        rawData.forEach(row => {
            const key = row.week;
            if (!key || key === 'S/F') return;
            if (!groups[key]) groups[key] = { total: 0, billing: 0, count: 0 };
            groups[key].total += parseFloat(row.amount || 0);
            groups[key].billing += parseFloat(row.billingAmount || 0);
            groups[key].count += 1;
        });
        return Object.entries(groups).sort((a, b) => {
            const numA = parseInt(String(a[0]).match(/Semana (\d+)/)?.[1] || 0);
            const numB = parseInt(String(b[0]).match(/Semana (\d+)/)?.[1] || 0);
            return numB - numA;
        });
    }, [rawData]);

    if (!isAdmin) {
        return (
            <div className="h-full flex items-center justify-center p-12">
                <div className="glass-card p-12 text-center max-w-md animate-fade-in">
                    <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/30">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Acceso Restringido</h2>
                    <p className="text-slate-400 font-medium leading-relaxed">Solo los administradores pueden gestionar los datos históricos del sistema.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Header */}
            <div className="border-b border-white/5 pb-8">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Gestión de Datos</h1>
                <p className="text-slate-400 font-medium">Control y mantenimiento de registros históricos</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Months Management */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Cargas Mensuales</h3>
                    </div>

                    <div className="space-y-4">
                        {months.map(([month, data]) => (
                            <div key={month} className="glass-card p-6 flex items-center justify-between group glass-card-hover transition-all duration-500">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform ring-1 ring-white/5">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white capitalize mb-1">{month}</h4>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.count} Reg.</span>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EUROS:</span>
                                            <span className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(data.billing)}</span>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOT+ADDONS:</span>
                                            <span className="text-xs font-mono font-bold text-indigo-400">{formatCurrency(data.total)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onDeleteMonth(month)}
                                        className="p-4 rounded-2xl bg-red-500/10 text-red-400 transition-all hover:bg-red-500 hover:text-white shadow-lg active:scale-95"
                                        title="Eliminar Mes"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {months.length === 0 && (
                            <p className="text-slate-600 font-black uppercase tracking-widest text-xs text-center py-10 opacity-50">No hay datos mensuales</p>
                        )}
                    </div>
                </div>

                {/* Weeks Management */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Cargas Semanales</h3>
                    </div>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                        {weeks.map(([week, data]) => (
                            <div key={week} className="glass-card p-6 flex items-center justify-between group glass-card-hover transition-all duration-500">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform ring-1 ring-white/5">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white">{week}</h4>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.count} Reg.</span>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EUROS:</span>
                                            <span className="text-xs font-mono font-bold text-emerald-400">{formatCurrency(data.billing)}</span>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOT+ADDONS:</span>
                                            <span className="text-xs font-mono font-bold text-blue-400">{formatCurrency(data.total)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onDeleteWeek(week)}
                                        className="p-4 rounded-2xl bg-red-500/10 text-red-400 transition-all hover:bg-red-500 hover:text-white shadow-lg active:scale-95"
                                        title="Eliminar Semana"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {weeks.length === 0 && (
                            <p className="text-slate-600 font-black uppercase tracking-widest text-xs text-center py-10 opacity-50">No hay datos semanales</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-20 border-t border-red-500/10 pt-12">
                <div className="glass-card p-10 border-red-500/20 bg-red-500/5 overflow-hidden relative group">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] group-hover:bg-red-500/20 transition-all duration-500"></div>

                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className="text-red-500" size={24} strokeWidth={3} />
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Zona de Peligro</h3>
                            </div>
                            <p className="text-slate-400 font-medium max-w-xl">
                                Esta acción eliminará permanentemente todos los registros del sistema. Esta operación no se puede deshacer. Por favor, asegúrese de tener una copia de seguridad.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción borrará TODO el historial permanentemente.')) {
                                    onReset();
                                }
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl px-12 py-5 transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] active:scale-95 flex items-center gap-4 shrink-0"
                        >
                            <RefreshCw size={20} /> Formatear Base de Datos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

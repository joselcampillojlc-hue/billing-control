import React, { useMemo } from 'react';
import { Trash2, Calendar, Database, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DataManagement({ data, onDeleteMonth, onDeleteWeek, onResetAll, isAdmin }) {

    // Group data by Month
    const months = useMemo(() => {
        const groups = {};
        data.forEach(row => {
            let dateObj;
            const rawDate = row['F.Carga'];
            if (typeof rawDate === 'number') {
                dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            } else if (typeof rawDate === 'string' && /^\d+$/.test(rawDate)) {
                const serial = parseInt(rawDate, 10);
                dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
            } else {
                dateObj = new Date(rawDate);
                if (isNaN(dateObj) && typeof rawDate === 'string' && rawDate.includes('/')) {
                    const part = rawDate.split('/');
                    if (part.length === 3) dateObj = new Date(part[2], part[1] - 1, part[0]);
                }
            }
            if (!isNaN(dateObj)) {
                const key = format(dateObj, 'MMM yyyy', { locale: es });
                groups[key] = (groups[key] || 0) + 1;
            }
        });
        return Object.entries(groups).sort((a, b) => b[1] - a[1]); // Sort by count for now
    }, [data]);

    // Group data by Week
    const weeks = useMemo(() => {
        const groups = {};
        data.forEach(row => {
            let dateObj;
            const rawDate = row['F.Carga'];
            if (typeof rawDate === 'number') {
                dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            } else if (typeof rawDate === 'string' && /^\d+$/.test(rawDate)) {
                const serial = parseInt(rawDate, 10);
                dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
            } else {
                dateObj = new Date(rawDate);
                if (isNaN(dateObj) && typeof rawDate === 'string' && rawDate.includes('/')) {
                    const part = rawDate.split('/');
                    if (part.length === 3) dateObj = new Date(part[2], part[1] - 1, part[0]);
                }
            }
            if (!isNaN(dateObj)) {
                // Get ISO week
                const target = new Date(dateObj.valueOf());
                const dayNr = (dateObj.getDay() + 6) % 7;
                target.setDate(target.getDate() - dayNr + 3);
                const firstThursday = target.valueOf();
                target.setMonth(0, 1);
                if (target.getDay() !== 4) {
                    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                }
                const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
                const key = `Semana ${weekNum} - ${dateObj.getFullYear()}`;
                groups[key] = (groups[key] || 0) + 1;
            }
        });
        return Object.entries(groups);
    }, [data]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Database size={48} className="mb-4 opacity-50" />
                <p>No hay datos cargados para gestionar.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <Database className="text-indigo-600" /> Gestión de Datos
            </h1>
            <p className="text-slate-500 mb-8">Administra los registros cargados, borra periodos específicos o reinicia todo.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Monthly Management */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                        <span className="flex items-center gap-2"><Calendar size={18} className="text-blue-500" /> Por Meses</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{months.length} Periodos</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
                        {months.map(([month, count]) => (
                            <div key={month} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                <div>
                                    <p className="font-bold text-slate-700 capitalize">{month}</p>
                                    <p className="text-xs text-slate-400">{count} registros</p>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => onDeleteMonth(month)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 placeholder:opacity-100 focus:opacity-100"
                                        title="Eliminar este mes"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Weekly Management */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                        <span className="flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> Por Semanas</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{weeks.length} Periodos</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
                        {weeks.map(([week, count]) => (
                            <div key={week} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                <div>
                                    <p className="font-bold text-slate-700">{week}</p>
                                    <p className="text-xs text-slate-400">{count} registros</p>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => onDeleteWeek(week)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 placeholder:opacity-100 focus:opacity-100"
                                        title="Eliminar esta semana"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            {isAdmin && (
                <div className="mt-10 p-6 rounded-xl border border-red-200 bg-red-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-800">Zona de Peligro</h3>
                            <p className="text-sm text-red-600">Esta acción borrará todos los datos almacenados permanentemente.</p>
                        </div>
                    </div>
                    <button
                        onClick={onResetAll}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <Trash2 size={18} /> Borrar Todo
                    </button>
                </div>
            )}
        </div>
    );
}

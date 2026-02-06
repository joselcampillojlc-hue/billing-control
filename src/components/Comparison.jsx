import React, { useState, useMemo } from 'react';
import { BarChart2, Check, X, Truck, TrendingUp, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';

export default function Comparison({ data }) {
    const [selectedDrivers, setSelectedDrivers] = useState([]);

    // Get list of all available drivers from current data
    const allDrivers = useMemo(() => {
        const drivers = new Set(data.map(d => d.Conductor).filter(Boolean));
        return Array.from(drivers).sort();
    }, [data]);

    // Aggregate data for selected drivers
    const stats = useMemo(() => {
        if (selectedDrivers.length === 0) return [];

        const driverStats = {};
        selectedDrivers.forEach(d => {
            driverStats[d] = { total: 0, count: 0, name: d };
        });

        data.forEach(row => {
            if (selectedDrivers.includes(row.Conductor)) {
                driverStats[row.Conductor].total += parseFloat(row.Euros || 0);
                driverStats[row.Conductor].count += 1;
            }
        });

        return Object.values(driverStats).sort((a, b) => b.total - a.total);
    }, [data, selectedDrivers]);

    const toggleDriver = (driver) => {
        setSelectedDrivers(prev =>
            prev.includes(driver)
                ? prev.filter(d => d !== driver)
                : [...prev, driver]
        );
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Driver Selection Area */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Truck size={16} className="text-blue-500" /> Selecciona Conductores:
                    </h3>
                    <div className="flex items-center gap-3">
                        {selectedDrivers.length < allDrivers.length && (
                            <button
                                onClick={() => setSelectedDrivers(allDrivers)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors"
                            >
                                <Check size={14} /> Seleccionar Todos
                            </button>
                        )}
                        {selectedDrivers.length > 0 && (
                            <button
                                onClick={() => setSelectedDrivers([])}
                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
                            >
                                <X size={14} /> Limpiar
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {allDrivers.map(driver => (
                        <button
                            key={driver}
                            onClick={() => toggleDriver(driver)}
                            className={clsx(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                                selectedDrivers.includes(driver)
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                            )}
                        >
                            {selectedDrivers.includes(driver) && <Check size={12} />}
                            {driver}
                        </button>
                    ))}
                </div>
            </div>

            {selectedDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <BarChart2 size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Selecciona al menos un conductor arriba</p>
                    <p className="text-sm">para ver la comparativa de rendimiento.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Stats Table Section */}
                    <div className="w-full bg-white rounded-xl border border-slate-200 border-t-4 border-t-emerald-500 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={20} className="text-emerald-500" /> Tabla de Rendimiento
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 border-collapse border border-slate-300">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-6 py-4 text-center w-12 border border-slate-300">#</th>
                                        <th className="px-6 py-4 border border-slate-300">Conductor</th>
                                        <th className="px-6 py-4 text-right border border-slate-300">Total Facturado</th>
                                        <th className="px-6 py-4 text-center border border-slate-300">Viajes</th>
                                        <th className="px-6 py-4 text-right border border-slate-300">Media / Viaje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((stat, index) => (
                                        <tr key={stat.name} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-center border border-slate-300">
                                                <div className={clsx(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto",
                                                    index === 0 ? "bg-yellow-400 text-white shadow-sm" :
                                                        index === 1 ? "bg-slate-300 text-white" :
                                                            index === 2 ? "bg-orange-300 text-white" : "text-slate-400"
                                                )}>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className={clsx("px-6 py-4 font-bold border border-slate-300", index === 0 ? "text-slate-900" : "text-slate-700")}>
                                                {stat.name}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 border border-slate-300">
                                                {formatCurrency(stat.total)}
                                            </td>
                                            <td className="px-6 py-4 text-center border border-slate-300">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                    {stat.count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-600 border border-slate-300 text-xs">
                                                {formatCurrency(stat.total / stat.count)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

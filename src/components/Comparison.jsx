import React, { useState, useMemo } from 'react';
import { BarChart2, Check, X, Truck, TrendingUp, DollarSign, Users, Award, Target, Download, Calendar, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { formatCurrency } from '../utils/format';
import { exportDataToPDF } from '../utils/pdfExport';

export default function Comparison({ data }) {
    const [selectedDrivers, setSelectedDrivers] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedWeek, setSelectedWeek] = useState('all');

    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
        setSelectedWeek('all');
    };

    const availableMonths = useMemo(() => {
        const months = new Set();
        data.forEach(row => {
            if (row.month) months.add(row.month);
        });
        return Array.from(months).sort((a, b) => a.localeCompare(b));
    }, [data]);

    const availableWeeks = useMemo(() => {
        const weeks = new Set();
        data.forEach(row => {
            if (row.month && (selectedMonth === 'all' || row.month === selectedMonth)) {
                if (row.week !== undefined && row.week !== null) weeks.add(row.week);
            }
        });
        return Array.from(weeks).sort((a, b) => {
            const numA = typeof a === 'number' ? a : parseInt(String(a).match(/Semana (\d+)/)?.[1] || String(a).replace(/\D/g, '') || 0);
            const numB = typeof b === 'number' ? b : parseInt(String(b).match(/Semana (\d+)/)?.[1] || String(b).replace(/\D/g, '') || 0);
            return numA - numB;
        });
    }, [data, selectedMonth]);

    const filteredData = useMemo(() => {
        return data.filter(row => {
            const mKey = row.month || 'Sin Fecha';
            const wKey = row.week || 'S/F';

            if (selectedMonth !== 'all' && mKey !== selectedMonth) return false;
            if (selectedWeek !== 'all' && String(wKey) !== String(selectedWeek)) return false;
            return true;
        });
    }, [data, selectedMonth, selectedWeek]);

    const allDrivers = useMemo(() => {
        const drivers = new Set(filteredData.map(d => d.driver).filter(Boolean));
        return Array.from(drivers).sort();
    }, [filteredData]);

    const stats = useMemo(() => {
        if (selectedDrivers.length === 0) return [];

        const driverStats = {};
        selectedDrivers.forEach(d => {
            driverStats[d] = { total: 0, billing: 0, count: 0, name: d, byMonth: {} };
        });

        filteredData.forEach(row => {
            if (selectedDrivers.includes(row.driver)) {
                const amt = parseFloat(row.amount || 0);
                const bill = parseFloat(row.billingAmount || 0);
                driverStats[row.driver].total += amt;
                driverStats[row.driver].billing += bill;
                driverStats[row.driver].count += 1;

                const m = row.month || 'Sin Fecha';
                if (!driverStats[row.driver].byMonth[m]) {
                    driverStats[row.driver].byMonth[m] = { total: 0, billing: 0, monthIndex: row.monthIndex || '0000-00' };
                }
                driverStats[row.driver].byMonth[m].total += amt;
                driverStats[row.driver].byMonth[m].billing += bill;
            }
        });

        return Object.values(driverStats).sort((a, b) => b.total - a.total);
    }, [filteredData, selectedDrivers]);

    const toggleDriver = (driver) => {
        setSelectedDrivers(prev =>
            prev.includes(driver)
                ? prev.filter(d => d !== driver)
                : [...prev, driver]
        );
    };

    const handleExportComparison = () => {
        const dataForExport = stats.map(s => ({
            name: s.name,
            count: s.count,
            billing: s.billing || 0,
            total: s.total,
            avg: s.total / (s.count || 1)
        }));

        const columns = [
            { key: 'name', label: 'Conductor', align: 'left' },
            { key: 'count', label: 'Viajes', align: 'center', width: 20 },
            { key: 'billing', label: 'Euros', align: 'right', format: 'currency', width: 35 },
            { key: 'total', label: 'TOT+ADDONS', align: 'right', format: 'currency', width: 35 },
            { key: 'avg', label: 'Media TOT', align: 'right', format: 'currency', width: 35 }
        ];

        exportDataToPDF('Comparativa de Conductores', columns, dataForExport, 'Comparativa_Conductores');
    };

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Header / Selection Area */}
            <div className="glass-card p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-6">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Users className="text-indigo-400" size={24} /> Comparativa de Rendimiento
                        </h3>
                        <p className="text-slate-500 font-medium text-xs mt-1">Selecciona conductores para analizar su producción</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <select
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="pl-9 pr-8 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none"
                            >
                                <option value="all">Todos los Meses</option>
                                {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
                            </select>
                        </div>

                        <div className="relative group">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <select
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                disabled={availableWeeks.length === 0}
                                className="pl-9 pr-8 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <option value="all">Semanas</option>
                                {availableWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                            </select>
                        </div>

                        {selectedDrivers.length > 0 && (
                            <button
                                onClick={handleExportComparison}
                                className="px-4 py-2 bg-slate-500/10 text-slate-400 hover:bg-slate-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-slate-500/20 flex items-center gap-2"
                                title="Exportar a PDF"
                            >
                                <Download size={14} /> PDF
                            </button>
                        )}
                        <button
                            onClick={() => setSelectedDrivers(allDrivers)}
                            className="px-4 py-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-indigo-500/20"
                        >
                            Seleccionar Todos
                        </button>
                        <button
                            onClick={() => setSelectedDrivers([])}
                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-red-500/20"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                    {allDrivers.map(driver => (
                        <button
                            key={driver}
                            onClick={() => toggleDriver(driver)}
                            className={clsx(
                                "px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300 flex items-center gap-3 group",
                                selectedDrivers.includes(driver)
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                            )}
                        >
                            <div className={clsx(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                selectedDrivers.includes(driver) ? "bg-white border-white text-indigo-600" : "border-slate-700 bg-transparent"
                            )}>
                                {selectedDrivers.includes(driver) && <Check size={10} strokeWidth={4} />}
                            </div>
                            {driver}
                        </button>
                    ))}
                </div>
            </div>

            {selectedDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 glass-card border-dashed border-white/10 opacity-60">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-600">
                        <BarChart2 size={40} />
                    </div>
                    <p className="text-lg font-black text-white/50 uppercase tracking-tighter">Esperando Selección</p>
                    <p className="text-slate-600 font-medium text-sm">Elige conductores arriba para visualizar la comparativa</p>
                </div>
            ) : (
                <div id="comparison-export-content" className="grid grid-cols-1 gap-10">
                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-card p-8 bg-emerald-600/5 border-emerald-500/20">
                            <DollarSign className="text-emerald-400 mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Top Euros</p>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter truncate">
                                {stats.length > 0 ? stats.sort((a, b) => b.billing - a.billing)[0].name : '-'}
                            </h4>
                            <p className="text-2xl font-black text-emerald-400 mt-2">
                                {stats.length > 0 ? formatCurrency(stats.sort((a, b) => b.billing - a.billing)[0].billing) : formatCurrency(0)}
                            </p>
                        </div>
                        <div className="glass-card p-8 bg-indigo-600/5 border-indigo-500/20">
                            <Award className="text-indigo-400 mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Top TOT+ADDONS</p>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter truncate">{stats[0]?.name}</h4>
                            <p className="text-2xl font-black text-indigo-400 mt-2">{formatCurrency(stats[0]?.total)}</p>
                        </div>
                        <div className="glass-card p-8 bg-blue-600/5 border-blue-500/20">
                            <Target className="text-blue-400 mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mayor Rendimiento (TOT)</p>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter truncate">
                                {stats.length > 0 ? stats.reduce((prev, curr) => (curr.total / (curr.count || 1) > prev.total / (prev.count || 1)) ? curr : prev).name : '-'}
                            </h4>
                            <p className="text-2xl font-black text-blue-400 mt-2">
                                {stats.length > 0 ? formatCurrency(stats.reduce((prev, curr) => (curr.total / (curr.count || 1) > prev.total / (prev.count || 1)) ? curr : prev).total / (stats.reduce((prev, curr) => (curr.total / (curr.count || 1) > prev.total / (prev.count || 1)) ? curr : prev).count || 1)) : formatCurrency(0)} <span className="text-[10px] opacity-60">avg</span>
                            </p>
                        </div>
                        <div className="glass-card p-8 bg-white/5 border-white/10">
                            <TrendingUp className="text-slate-400 mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Grupo (TOT)</p>
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter">Comparativa</h4>
                            <p className="text-2xl font-black text-white mt-2">{formatCurrency(stats.reduce((acc, curr) => acc + (curr.total || 0), 0))}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/2">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter text-center">Desglose Detallado</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="pl-10 text-center w-16">Puesto</th>
                                        <th className="pl-6">Conductor</th>
                                        <th className="text-right">Euros</th>
                                        <th className="text-right">TOT+ADDONS</th>
                                        <th className="text-center">Viajes</th>
                                        <th className="pr-10 text-right">Media TOT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((stat, index) => (
                                        <React.Fragment key={stat.name}>
                                            <tr className="hover:bg-white/[0.03] transition-colors group border-b border-white/5">
                                                <td className="pl-10 text-center py-5">
                                                    <div className={clsx(
                                                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black mx-auto",
                                                        index === 0 ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]" :
                                                            index === 1 ? "bg-slate-300 text-black" :
                                                                index === 2 ? "bg-orange-300 text-black" : "bg-white/5 text-slate-500"
                                                    )}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="pl-6 font-black text-white">{stat.name}</td>
                                                <td className="text-right font-mono font-black text-emerald-400 text-lg">
                                                    {formatCurrency(stat.billing)}
                                                </td>
                                                <td className="text-right font-mono font-black text-indigo-400 text-lg">
                                                    {formatCurrency(stat.total)}
                                                </td>
                                                <td className="text-center">
                                                    <span className="bg-white/5 text-slate-400 px-3 py-1.5 rounded-xl font-black text-xs ring-1 ring-white/5">
                                                        {stat.count}
                                                    </span>
                                                </td>
                                                <td className="pr-10 text-right font-mono text-slate-500 font-bold text-sm">
                                                    {formatCurrency(stat.total / stat.count)}
                                                </td>
                                            </tr>
                                            {/* Monthly breakdown for this driver */}
                                            <tr>
                                                <td colSpan="6" className="px-10 py-4 bg-white/[0.01]">
                                                    <div className="flex flex-wrap gap-8">
                                                        {Object.entries(stat.byMonth)
                                                            .sort((a, b) => a[1].monthIndex.localeCompare(b[1].monthIndex))
                                                            .map(([month, mData]) => (
                                                                <div key={month} className="flex flex-col">
                                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{month}</span>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-bold text-emerald-400/80">{formatCurrency(mData.billing)}</span>
                                                                        <span className="text-xs font-bold text-indigo-400/80">{formatCurrency(mData.total)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
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

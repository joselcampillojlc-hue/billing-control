import React, { useState, useMemo } from 'react';
import { processBillingData } from '../utils/billing';
import { Users, Truck, DollarSign, Calendar, Filter, Plus, LayoutDashboard, BarChart2, Globe, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Comparison from './Comparison';
import { parseDate, getWeekKey, getMonthKey } from '../utils/dateUtils';

function StatCard({ title, value, icon: Icon, color }) {
    const accents = {
        success: 'text-emerald-400 group-hover:text-emerald-300',
        primary: 'text-blue-400 group-hover:text-blue-300',
        warning: 'text-amber-400 group-hover:text-amber-300',
        accent: 'text-indigo-400 group-hover:text-indigo-300'
    };

    return (
        <div className="glass-card glass-card-hover p-8 group overflow-hidden relative">
            {/* Background Glow */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${color === 'success' ? 'bg-emerald-500' :
                color === 'primary' ? 'bg-blue-500' :
                    color === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                }`}></div>

            <div className="relative flex items-center gap-6">
                <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 transition-all duration-500 group-hover:scale-110 group-hover:border-white/10 ${accents[color]}`}>
                    <Icon size={28} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</p>
                    <p className="text-3xl font-black text-white tracking-tighter leading-none">{value}</p>
                </div>
            </div>
        </div>
    );
}

// Visual Bar Component
function DataBar({ value, max, colorClass = "bg-indigo-500" }) {
    const percentage = Math.max(5, Math.min(100, (value / max) * 100));
    return (
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-3 ring-1 ring-white/5">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)] ${colorClass}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

export default function Dashboard({ rawData, currentDepartment, onDepartmentChange, onAddMore, isAdmin }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [selectedClient, setSelectedClient] = useState('all');

    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
        setSelectedWeek('all');
    };

    const availableMonths = useMemo(() => {
        const months = new Set();
        rawData.forEach(row => {
            if (currentDepartment !== 'all' && row.department && row.department !== currentDepartment) return;
            if (row.month) months.add(row.month);
        });
        return Array.from(months).sort((a, b) => a.localeCompare(b));
    }, [rawData, currentDepartment]);

    const availableWeeks = useMemo(() => {
        const weeks = new Set();
        rawData.forEach(row => {
            if (currentDepartment !== 'all' && row.department && row.department !== currentDepartment) return;
            if (selectedClient !== 'all' && row.client !== selectedClient) return;
            if (row.month && (selectedMonth === 'all' || row.month === selectedMonth)) {
                if (row.week) weeks.add(row.week);
            }
        });
        return Array.from(weeks).sort((a, b) => {
            const strA = String(a || '');
            const strB = String(b || '');
            const numA = parseInt(strA.match(/Semana (\d+)/)?.[1] || strA.replace(/\D/g, '') || 0);
            const numB = parseInt(strB.match(/Semana (\d+)/)?.[1] || strB.replace(/\D/g, '') || 0);
            return numA - numB;
        });
    }, [rawData, selectedMonth, currentDepartment, selectedClient]);

    const availableClients = useMemo(() => {
        const clients = new Set();
        rawData.forEach(row => {
            if (currentDepartment !== 'all' && row.department && row.department !== currentDepartment) return;
            if (row.client) clients.add(row.client);
        });
        return Array.from(clients).sort();
    }, [rawData, currentDepartment]);

    const filteredData = useMemo(() => {
        return rawData.filter(row => {
            if (currentDepartment !== 'all' && row.department && row.department !== currentDepartment) return false;

            // Usar los campos ya calculados que vienen de Firebase para evitar discrepancias
            const mKey = row.month || 'Sin Fecha';
            const wKey = row.week || 'S/F';

            if (selectedMonth !== 'all' && mKey !== selectedMonth) return false;
            if (selectedWeek !== 'all' && wKey !== selectedWeek) return false;
            if (selectedClient !== 'all' && row.client !== selectedClient) return false;
            return true;
        });
    }, [rawData, currentDepartment, selectedMonth, selectedWeek, selectedClient]);

    // Recalcular el resumen solo sobre los datos filtrados
    const { summary } = useMemo(() => {
        // En el dashboard, como ya están procesados, solo sumamos lo que hay
        const byDriver = {};
        const byClient = {};
        const byMonth = {};
        const byWeek = {};
        let total = 0;

        filteredData.forEach(item => {
            const amt = item.amount || 0;
            total += amt;

            if (!byDriver[item.driver]) byDriver[item.driver] = { total: 0, count: 0 };
            byDriver[item.driver].total += amt;
            byDriver[item.driver].count += 1;

            if (!byClient[item.client]) byClient[item.client] = { total: 0, count: 0 };
            byClient[item.client].total += amt;
            byClient[item.client].count += 1;

            const m = item.month || 'Sin Fecha';
            byMonth[m] = (byMonth[m] || 0) + amt;

            const w = item.week || 'S/F';
            byWeek[w] = (byWeek[w] || 0) + amt;
        });

        return { summary: { total, byDriver, byClient, byMonth, byWeek } };
    }, [filteredData]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <div className="flex flex-col h-full space-y-8 pb-10">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pb-6 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Panel de Control</h1>
                        {currentDepartment !== 'all' && (
                            <span className={clsx(
                                "text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest border",
                                currentDepartment === 'Intermodal' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            )}>
                                {currentDepartment}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 font-medium tracking-wide">
                        {selectedWeek !== 'all' ? `Periodo: ${selectedWeek}` : selectedMonth !== 'all' ? `Mes: ${selectedMonth}` : 'Visión Global de Facturación'}
                    </p>
                    {summary.byMonth['Sin Fecha'] > 0 && (
                        <div className="mt-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <p className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">
                                ¡Aviso! Hay {formatCurrency(summary.byMonth['Sin Fecha'])} sin fecha detectada. Revisa el formato de tu Excel.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    {isAdmin && (
                        <div className="relative group">
                            <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <select
                                value={currentDepartment}
                                onChange={(e) => onDepartmentChange(e.target.value)}
                                className="pl-11 pr-10 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-2xl focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none"
                            >
                                <option value="all">🌍 Global</option>
                                <option value="Intermodal">🚢 Intermodal</option>
                                <option value="Nacional">🚛 Nacional</option>
                            </select>
                        </div>
                    )}
                    <div className="relative group">
                        <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="pl-11 pr-10 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-2xl focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none"
                        >
                            <option value="all">Clientes</option>
                            {availableClients.map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative group">
                        <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="pl-11 pr-10 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-2xl focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none"
                        >
                            <option value="all">Todos los Meses</option>
                            {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            disabled={availableWeeks.length === 0}
                            className="pl-11 pr-10 py-3 bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-2xl focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <option value="all">Semanas</option>
                            {availableWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                        </select>
                    </div>

                    {isAdmin && (
                        <button onClick={onAddMore} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl px-8 py-3.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95 flex items-center gap-3">
                            <Plus size={18} /> Añadir Excel
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-black/20 p-1.5 rounded-full w-fit mb-8 border border-white/5">
                {[
                    { id: 'overview', label: 'Resumen Global', icon: LayoutDashboard },
                    { id: 'drivers', label: 'Conductores', icon: Truck },
                    { id: 'clients', label: 'Clientes', icon: Users }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                            activeTab === tab.id
                                ? "bg-white text-black shadow-xl"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="space-y-8 animate-fade-in pb-10">
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard title="Facturación Total" value={formatCurrency(summary.total)} icon={DollarSign} color="success" />
                            <StatCard title="Conductores" value={Object.keys(summary.byDriver).length} icon={Truck} color="primary" />
                            <StatCard title="Clientes" value={Object.keys(summary.byClient).length} icon={Users} color="warning" />
                            <StatCard title="Meses Activos" value={Object.keys(summary.byMonth).length} icon={Calendar} color="accent" />
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-card p-8">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                                    <div className="w-1 h-5 bg-indigo-500 rounded-full"></div> Facturación Mensual
                                </h3>
                                <div className="space-y-5">
                                    {Object.entries(summary.byMonth)
                                        .sort((a, b) => {
                                            if (a[0] === 'Sin Fecha') return 1;
                                            if (b[0] === 'Sin Fecha') return -1;
                                            // Usar monthIndex directamente de los datos procesados si estuviera fuera, 
                                            // pero aquí tenemos que buscarlo o inferirlo.
                                            // Como ayuda, intentamos extraer YYYY-MM del nombre o buscar el primer item.
                                            const itemA = filteredData.find(r => r.month === a[0]);
                                            const itemB = filteredData.find(r => r.month === b[0]);
                                            return (itemA?.monthIndex || '').localeCompare(itemB?.monthIndex || '');
                                        })
                                        .map(([month, total]) => (
                                            <div key={month} className="group">
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <span className="capitalize text-slate-400 font-bold text-xs tracking-wider">{month}</span>
                                                    <span className="font-mono font-bold text-white text-xs">{formatCurrency(total)}</span>
                                                </div>
                                                <DataBar value={total} max={summary.total} />
                                            </div>
                                        ))}
                                    {Object.keys(summary.byMonth).length === 1 && Object.keys(summary.byMonth)[0] !== 'Sin Fecha' && (
                                        <p className="text-slate-500 text-[10px] mt-4 italic border-t border-white/5 pt-4">
                                            Tip: Si solo ves un mes, limpia la base de datos y vuelve a subir el Excel con el nuevo formato.
                                        </p>
                                    )}
                                    {Object.keys(summary.byMonth).length === 0 && (
                                        <p className="text-slate-500 text-xs italic">No hay datos disponibles.</p>
                                    )}
                                </div>
                            </div>

                            <div className="glass-card p-8">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                                    <div className="w-1 h-5 bg-blue-500 rounded-full"></div> Facturación Semanal
                                </h3>
                                <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.entries(summary.byWeek)
                                        .sort((a, b) => (parseInt(String(a[0]).replace(/\D/g, '')) || 0) - (parseInt(String(b[0]).replace(/\D/g, '')) || 0))
                                        .map(([week, total]) => (
                                            <div key={week} className="group">
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <span className="text-slate-400 font-bold text-xs tracking-wider">{week}</span>
                                                    <span className="font-mono font-bold text-white text-xs">{formatCurrency(total)}</span>
                                                </div>
                                                <DataBar value={total} max={summary.total} colorClass="bg-blue-500" />
                                            </div>
                                        ))}
                                    {Object.keys(summary.byWeek).length === 0 && (
                                        <p className="text-slate-500 text-xs italic">No hay datos disponibles.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'drivers' && (
                    <div className="animate-fade-in glass-card overflow-hidden flex flex-col h-[600px]">
                        <div className="p-6 border-b border-white/5 bg-white/2 shrink-0">
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter flex justify-between items-center">
                                Ranking Conductores
                                <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">Top 10</span>
                            </h3>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
                            <table className="w-full">
                                <tbody>
                                    {Object.entries(summary.byDriver)
                                        .sort((a, b) => b[1].total - a[1].total)
                                        .slice(0, 10)
                                        .map(([driver, data], idx) => (
                                            <tr key={driver} className="hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0">
                                                <td className="pl-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold text-sm truncate max-w-[150px]">{driver}</span>
                                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{data.count} viajes</span>
                                                    </div>
                                                </td>
                                                <td className="pr-6 text-right">
                                                    <span className="font-mono font-black text-indigo-400 text-sm">
                                                        {formatCurrency(data.total)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="animate-fade-in glass-card overflow-hidden flex flex-col h-[600px]">
                        <div className="p-6 border-b border-white/5 bg-white/2 shrink-0">
                            <h3 className="text-sm font-black text-white uppercase tracking-tighter flex justify-between items-center">
                                Ranking Clientes
                                <span className="text-[9px] text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">Top 10</span>
                            </h3>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
                            <table className="w-full">
                                <tbody>
                                    {Object.entries(summary.byClient)
                                        .sort((a, b) => b[1].total - a[1].total)
                                        .slice(0, 10)
                                        .map(([client, data]) => (
                                            <tr key={client} className="hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0">
                                                <td className="pl-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold text-sm truncate max-w-[300px]" title={client}>{client}</span>
                                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{data.count} servicios</span>
                                                    </div>
                                                </td>
                                                <td className="pr-6 text-right">
                                                    <span className="font-mono font-black text-blue-400 text-sm">
                                                        {formatCurrency(data.total)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

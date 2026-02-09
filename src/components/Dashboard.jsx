import React, { useState, useMemo } from 'react';
import { processBillingData } from '../utils/billing';
import { Users, Truck, DollarSign, Calendar, Filter, Plus, LayoutDashboard, BarChart2, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Comparison from './Comparison';

function StatCard({ title, value, icon: Icon, color }) {
    const bgColors = {
        success: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
        primary: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
        warning: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
        accent: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
    };

    return (
        <div className={`bg-white p-6 rounded-xl border border-slate-200 border-t-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow ${color === 'success' ? 'border-t-emerald-500' :
            color === 'primary' ? 'border-t-blue-500' :
                color === 'warning' ? 'border-t-amber-500' :
                    'border-t-indigo-500'
            }`}>
            <div className={`p-4 rounded-xl ${bgColors[color] || 'bg-slate-100'}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium">{title}</p>
                <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
            </div>
        </div>
    );
}

// Visual Bar Component
function DataBar({ value, max, colorClass = "bg-blue-600" }) {
    const percentage = Math.max(5, Math.min(100, (value / max) * 100));
    return (
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

export default function Dashboard({ rawData, currentDepartment, onDepartmentChange, onAddMore, onReset, isAdmin }) {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'drivers', 'clients', 'comparison'
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedWeek, setSelectedWeek] = useState('all');

    // Reset week when month changes
    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
        setSelectedWeek('all');
    };

    // Extract all available months
    const availableMonths = useMemo(() => {
        const months = new Set();
        rawData.forEach(row => {
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
                months.add(format(dateObj, 'MMM yyyy', { locale: es }));
            }
        });
        return Array.from(months);
    }, [rawData]);

    // Extract available weeks based on selected Month
    const availableWeeks = useMemo(() => {
        const weeks = new Set();
        rawData.forEach(row => {
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
                // Formatting week string
                const target = new Date(dateObj.valueOf());
                const dayNr = (dateObj.getDay() + 6) % 7;
                target.setDate(target.getDate() - dayNr + 3);
                const firstThursday = target.valueOf();
                target.setMonth(0, 1);
                if (target.getDay() !== 4) {
                    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                }
                const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
                const weekKey = `Semana ${weekNum} - ${dateObj.getFullYear()}`;

                // Only add if it belongs to selected month (or if all months selected)
                if (selectedMonth === 'all' || format(dateObj, 'MMM yyyy', { locale: es }) === selectedMonth) {
                    weeks.add(weekKey);
                }
            }
        });
        return Array.from(weeks).sort((a, b) => {
            // Simple string sort works for "Semana X - YEAR" usually, but ideally split numbers
            const numA = parseInt(a.match(/Semana (\d+)/)?.[1] || 0);
            const numB = parseInt(b.match(/Semana (\d+)/)?.[1] || 0);
            return numA - numB;
        });
    }, [rawData, selectedMonth]);

    // Filter data
    const filteredData = useMemo(() => {
        return rawData.filter(row => {
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
            if (isNaN(dateObj)) return false;

            // Month Filter
            if (selectedMonth !== 'all' && format(dateObj, 'MMM yyyy', { locale: es }) !== selectedMonth) {
                return false;
            }

            // Week Filter
            if (selectedWeek !== 'all') {
                const target = new Date(dateObj.valueOf());
                const dayNr = (dateObj.getDay() + 6) % 7;
                target.setDate(target.getDate() - dayNr + 3);
                const firstThursday = target.valueOf();
                target.setMonth(0, 1);
                if (target.getDay() !== 4) {
                    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                }
                const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
                const weekKey = `Semana ${weekNum} - ${dateObj.getFullYear()}`;
                if (weekKey !== selectedWeek) return false;
            }

            return true;
        });
    }, [rawData, selectedMonth, selectedWeek]);

    const { summary } = useMemo(() => processBillingData(filteredData), [filteredData]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <div className="flex flex-col h-screen max-h-[calc(100vh-60px)] fade-in">
            {/* Header Area */}
            <div className="shrink-0 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl text-slate-900 font-bold tracking-tight flex items-center gap-3">
                        Panel de Control MG TRANSPORT
                        {currentDepartment !== 'all' && (
                            <span className={`text-sm px-3 py-1 rounded-full border flex items-center gap-2 ${currentDepartment === 'Intermodal'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                {currentDepartment === 'Intermodal' ? '🚢 Intermodal' : <><Truck size={14} /> Nacional</>}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                        {selectedMonth === 'all' && selectedWeek === 'all' ? 'Mostrando todos los periodos' :
                            selectedWeek !== 'all' ? `Mostrando: ${selectedWeek}` :
                                `Mostrando datos de: ${selectedMonth}`}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {isAdmin && (
                        <div className="relative animate-in fade-in slide-in-from-left-4">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-indigo-500">
                                <Globe size={16} />
                            </div>
                            <select
                                value={currentDepartment}
                                onChange={(e) => onDepartmentChange(e.target.value)}
                                className="pl-10 pr-8 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full appearance-none cursor-pointer hover:bg-indigo-100 transition shadow-sm font-bold"
                            >
                                <option value="all">🌍 Global</option>
                                <option value="Intermodal">🚢 Intermodal</option>
                                <option value="Nacional">🚛 Nacional</option>
                            </select>
                        </div>
                    )}

                    {/* Month Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <Filter size={16} />
                        </div>
                        <select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full appearance-none cursor-pointer hover:bg-slate-50 transition shadow-sm font-medium"
                        >
                            <option value="all">Todos los Meses</option>
                            {availableMonths.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>
                    </div>

                    {/* Week Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <Calendar size={16} />
                        </div>
                        <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            className={clsx(
                                "pl-10 pr-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full appearance-none cursor-pointer hover:bg-slate-50 transition shadow-sm font-medium",
                                availableWeeks.length === 0 && "opacity-50 cursor-not-allowed bg-slate-100"
                            )}
                            disabled={availableWeeks.length === 0}
                        >
                            <option value="all">Todas las Semanas</option>
                            {availableWeeks.map(week => (
                                <option key={week} value={week}>{week}</option>
                            ))}
                        </select>
                    </div>

                    {isAdmin && (
                        <button onClick={onAddMore} className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/30 text-nowrap border-0 rounded-full px-6 py-2.5 transition-all">
                            <Plus size={18} /> Añadir Excel
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-white/20 mb-6 shrink-0 overflow-x-auto pb-2 px-1">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={clsx(
                        "px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-full transition-all whitespace-nowrap shadow-sm",
                        activeTab === 'overview'
                            ? "bg-blue-600 text-white shadow-blue-500/30 translate-y-[-1px]"
                            : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                    )}
                >
                    <LayoutDashboard size={18} /> Resumen General
                </button>
                <button
                    onClick={() => setActiveTab('drivers')}
                    className={clsx(
                        "px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-full transition-all whitespace-nowrap shadow-sm",
                        activeTab === 'drivers'
                            ? "bg-blue-600 text-white shadow-blue-500/30 translate-y-[-1px]"
                            : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                    )}
                >
                    <Truck size={18} /> Conductores
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={clsx(
                        "px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-full transition-all whitespace-nowrap shadow-sm",
                        activeTab === 'clients'
                            ? "bg-amber-500 text-white shadow-amber-500/30 translate-y-[-1px]"
                            : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                    )}
                >
                    <Users size={18} /> Clientes
                </button>
                <div className="w-px h-8 bg-slate-300 mx-2 self-center"></div>
                <button
                    onClick={() => setActiveTab('comparison')}
                    className={clsx(
                        "px-6 py-2.5 text-sm font-bold flex items-center gap-2 rounded-full transition-all whitespace-nowrap shadow-sm",
                        activeTab === 'comparison'
                            ? "bg-indigo-600 text-white shadow-indigo-500/30 translate-y-[-1px]"
                            : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                    )}
                >
                    <BarChart2 size={18} /> Comparativa
                </button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar pb-10">

                {/* VIEW: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard title="Facturación Total" value={formatCurrency(summary.total)} icon={DollarSign} color="success" />
                            <StatCard title="Conductores Activos" value={Object.keys(summary.byDriver).length} icon={Truck} color="primary" />
                            <StatCard title="Clientes Totales" value={Object.keys(summary.byClient).length} icon={Users} color="warning" />
                            <StatCard title="Periodos Cargados" value={Object.keys(summary.byMonth).length} icon={Calendar} color="accent" />
                        </div>

                        {/* Breakdowns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Monthly Breakdown with Bars */}
                            <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-blue-400 shadow-sm p-6">
                                <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Calendar className="text-blue-500" size={20} /> Facturación por Mes
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(summary.byMonth).map(([month, total]) => (
                                        <div key={month} className="group">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="capitalize text-slate-600 font-medium text-sm">{month}</span>
                                                <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(total)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${Math.max(5, (total / summary.total) * 100 * 2)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Weekly Breakdown with Bars */}
                            <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-indigo-400 shadow-sm p-6">
                                <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Calendar className="text-indigo-500" size={20} /> Facturación por Semana
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(summary.byWeek).map(([week, total]) => (
                                        <div key={week} className="group">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-slate-600 font-medium text-sm">{week}</span>
                                                <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(total)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${Math.max(5, (total / summary.total) * 100 * 5)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: DRIVERS (LIST TABLE) */}
                {activeTab === 'drivers' && (
                    <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-blue-500 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm flex items-center gap-2">
                                <Truck size={18} className="text-blue-600" /> Listado de Conductores
                            </h3>
                            <span className="bg-white px-2 py-1 text-xs font-bold text-slate-500 rounded border border-slate-200">{Object.keys(summary.byDriver).length} Registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Conductor</th>
                                        <th className="px-6 py-4 text-center">Órdenes Realizadas</th>
                                        <th className="px-6 py-4 text-right">Facturado Total</th>
                                        <th className="px-6 py-4 text-center w-24">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(summary.byDriver)
                                        .sort((a, b) => b[1].total - a[1].total)
                                        .map(([driver, data], index) => (
                                            <tr key={driver} className="hover:bg-blue-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-slate-900 relative">
                                                    {index < 3 && (
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-yellow-500 mr-1">★</span>
                                                    )}
                                                    <span className={index < 3 ? "ml-4" : ""}>{driver}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                                                        {data.count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 group-hover:scale-105 transition-transform origin-right">
                                                    {formatCurrency(data.total)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${Math.min(100, (data.total / Object.values(summary.byDriver)[0].total) * 100)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW: CLIENTS (LIST TABLE) */}
                {activeTab === 'clients' && (
                    <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm flex items-center gap-2">
                                <Users size={18} className="text-amber-600" /> Listado de Clientes
                            </h3>
                            <span className="bg-white px-2 py-1 text-xs font-bold text-slate-500 rounded border border-slate-200">{Object.keys(summary.byClient).length} Registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4 text-center">Órdenes Realizadas</th>
                                        <th className="px-6 py-4 text-right">Facturado Total</th>
                                        <th className="px-6 py-4 text-center w-24">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(summary.byClient)
                                        .sort((a, b) => b[1].total - a[1].total)
                                        .map(([client, data], index) => (
                                            <tr key={client} className="hover:bg-amber-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-slate-900 relative">
                                                    {index < 3 && (
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-yellow-500 mr-1">★</span>
                                                    )}
                                                    <span className={index < 3 ? "ml-4" : ""}>{client}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                                                        {data.count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 group-hover:scale-105 transition-transform origin-right">
                                                    {formatCurrency(data.total)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-amber-500 rounded-full"
                                                            style={{ width: `${Math.min(100, (data.total / Object.values(summary.byClient)[0].total) * 100)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW: COMPARISON */}
                {activeTab === 'comparison' && (
                    <Comparison data={filteredData} />
                )}

            </div>
        </div>
    );
}

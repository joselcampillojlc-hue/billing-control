import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, FileDown, Loader2, Upload as UploadIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { parseExcel, processBillingData } from '../utils/billing';
import * as XLSX from 'xlsx';

export default function Upload({ onDataLoaded, currentDepartment }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(currentDepartment === 'all' ? 'Intermodal' : currentDepartment);

    // Update local selection if prop changes (e.g. login/logout)
    useEffect(() => {
        if (currentDepartment !== 'all') {
            setSelectedDepartment(currentDepartment);
        } else {
            setSelectedDepartment('Intermodal'); // Default for admin
        }
    }, [currentDepartment]);

    const processFile = async (file) => {
        setIsProcessing(true);
        try {
            const rawData = await parseExcel(file);
            const { raw, summary } = processBillingData(rawData);

            // Inject Department Tag
            const taggedRaw = raw.map(row => ({
                ...row,
                department: selectedDepartment
            }));

            onDataLoaded(taggedRaw, summary);
        } catch (error) {
            console.error("Error processing file:", error);
            alert(`Error al procesar el archivo: ${error.message || 'Formato inválido'}. \n\nAsegúrate de usar la Plantilla correcta.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            processFile(file);
        } else {
            alert("Por favor, sube un archivo Excel (.xlsx o .xls)");
        }
    }, [selectedDepartment]); // Re-create onDrop when department changes

    const onFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDownloadTemplate = (e) => {
        e.stopPropagation();
        try {
            const ws = XLSX.utils.aoa_to_sheet([
                ['F.Carga', 'Conductor', 'Nomb.Cliente', 'Euros', 'Kms'],
                ['01/01/2026', 'Juan Pérez', 'Cliente Ejemplo S.L.', 150.50, 120]
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
            XLSX.writeFile(wb, "plantilla_facturacion.xlsx");
        } catch (err) {
            console.error("Error downloading template:", err);
            alert("Error al generar la plantilla.");
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">

            {/* Department Selector for Admins */}
            {currentDepartment === 'all' ? (
                <div className="mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <UploadIcon size={16} className="text-indigo-600" />
                        Elige el departamento de destino:
                    </label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setSelectedDepartment('Intermodal')}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold flex items-center justify-center gap-2 ${selectedDepartment === 'Intermodal'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-102'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <span>🚢</span> Intermodal
                        </button>
                        <button
                            onClick={() => setSelectedDepartment('Nacional')}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-bold flex items-center justify-center gap-2 ${selectedDepartment === 'Nacional'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm scale-102'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <span>🇪🇸</span> Nacional
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                        Estás subiendo datos como <b>Administrador</b>.
                    </p>
                </div>
            ) : (
                <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                        {currentDepartment === 'Intermodal' ? '🚢' : '🇪🇸'}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-blue-900">
                            Modo Restringido: <b>{currentDepartment}</b>
                        </p>
                        <p className="text-xs text-blue-700">
                            Los archivos que subas se asignarán automáticamente a este departamento.
                        </p>
                    </div>
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`
            border-3 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden
            ${isDragging
                        ? 'border-indigo-500 bg-indigo-50 scale-102 shadow-xl'
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                    }
        `}
            >
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={onFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                />

                <label htmlFor="file-upload" className="cursor-pointer block relative z-10">
                    <div className={`
                w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 shadow-md
                ${isDragging ? 'bg-indigo-600 rotate-12 scale-110' : 'bg-indigo-100 text-indigo-600'}
            `}>
                        {isProcessing ? (
                            <Loader2 size={40} className="text-white animate-spin" />
                        ) : (
                            <UploadIcon size={40} className={isDragging ? 'text-white' : 'text-indigo-600'} />
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                        {isProcessing ? 'Procesando archivo...' : 'Arrastra tu Excel aquí'}
                    </h3>
                    <p className="text-slate-500 mb-6 font-medium">
                        o haz clic para explorar carpetas
                    </p>

                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 transition-colors ${selectedDepartment === 'Intermodal' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                        Destino: {selectedDepartment}
                    </div>

                    <div className="flex gap-4 justify-center mt-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl text-sm font-bold shadow-sm transition-all"
                        >
                            <FileDown size={18} className="text-slate-400" />
                            Descargar Plantilla
                        </button>
                    </div>
                </label>
            </div>
        </div>
    );
}

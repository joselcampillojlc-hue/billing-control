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
            alert("Error al procesar el archivo. Asegúrate de que es un Excel válido.");
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
                ['01/01/2024', 'Juan Pérez', 'Cliente A', 150.50, 120]
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
            {currentDepartment === 'all' && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Departamento de destino:</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setSelectedDepartment('Intermodal')}
                            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all font-medium ${selectedDepartment === 'Intermodal'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                        >
                            🚢 Intermodal
                        </button>
                        <button
                            onClick={() => setSelectedDepartment('Nacional')}
                            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all font-medium ${selectedDepartment === 'Nacional'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                        >
                            🇪🇸 Nacional
                        </button>
                    </div>
                </div>
            )}

            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`
            border-3 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer
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

                <label htmlFor="file-upload" className="cursor-pointer block">
                    <div className={`
                w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500
                ${isDragging ? 'bg-indigo-600 rotate-12' : 'bg-indigo-100'}
            `}>
                        {isProcessing ? (
                            <Loader2 size={40} className="text-white animate-spin" />
                        ) : (
                            <UploadIcon size={40} className={isDragging ? 'text-white' : 'text-indigo-600'} />
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {isProcessing ? 'Procesando archivo...' : 'Arrastra tu Excel aquí'}
                    </h3>
                    <p className="text-slate-500 mb-6">
                        o haz clic para buscarlo en tu ordenador
                    </p>

                    {currentDepartment !== 'all' && (
                        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">
                            Subiendo a: {currentDepartment === 'Intermodal' ? '🚢 Intermodal' : '🇪🇸 Nacional'}
                        </div>
                    )}

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            <FileDown size={16} />
                            Descargar Plantilla
                        </button>
                    </div>
                </label>
            </div>
        </div>
    );
}

import React, { useCallback } from 'react';
import { UploadCloud, FileDown } from 'lucide-react';
import { clsx } from 'clsx';
import { parseExcel } from '../utils/billing';
import * as XLSX from 'xlsx';

export default function Upload({ onDataLoaded }) {
    const handleFile = async (file) => {
        try {
            const data = await parseExcel(file);
            await onDataLoaded(data);
        } catch (error) {
            console.error("Error reading file:", error);
            alert("Error reading file. Please check the format.");
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
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
        <div
            className="card flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
            style={{ minHeight: '400px', background: 'rgba(30, 41, 59, 0.5)' }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => document.getElementById('file-upload').click()}
        >
            <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                <UploadCloud size={48} className="text-blue-500" />
            </div>
            <h2 className="text-2xl mb-2 text-white">Sube tu Excel de Facturación</h2>
            <p className="text-muted mb-6">Arrastra tu archivo aquí o haz clic para seleccionar</p>

            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleInputChange}
            />

            <div className="flex gap-4">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('file-upload').click();
                    }}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2"
                >
                    Seleccionar Archivo
                </button>
                <button
                    onClick={handleDownloadTemplate}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all border border-slate-200 shadow-sm flex items-center gap-2"
                >
                    <FileDown size={20} />
                    Descargar Plantilla
                </button>
            </div>

            <p className="text-xs text-muted mt-8">
                Formatos soportados: .xlsx, .xls
            </p>
        </div>
    );
}

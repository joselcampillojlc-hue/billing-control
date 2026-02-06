import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';
import { parseExcel } from '../utils/billing';

export default function Upload({ onDataLoaded }) {
    const handleFile = async (file) => {
        try {
            const data = await parseExcel(file);
            onDataLoaded(data);
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
                accept=".xlsx, .xls"
                onChange={handleInputChange}
            />

            <button className="btn btn-primary">
                Seleccionar Archivo
            </button>

            <p className="text-xs text-muted mt-8">
                Formatos soportados: .xlsx, .xls
            </p>
        </div>
    );
}

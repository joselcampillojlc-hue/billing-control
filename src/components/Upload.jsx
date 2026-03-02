import React, { useState, useCallback, useEffect } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle2, AlertCircle, X, Truck, Ship, Database, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';
import { parseExcel, processBillingData, downloadTemplate } from '../utils/billing';

export default function Upload({ onDataLoaded, currentDepartment, onCancel }) {
    const [file, setFile] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(currentDepartment === 'all' ? 'Intermodal' : currentDepartment);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);

    useEffect(() => {
        if (currentDepartment !== 'all') {
            setSelectedDepartment(currentDepartment);
        }
    }, [currentDepartment]);

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false
    });

    const handleUpload = async () => {
        if (!file || !selectedDepartment) return;
        setIsUploading(true);
        try {
            const rawData = await parseExcel(file);

            // LOG DE DEPURACIÓN
            if (rawData && rawData.length > 0) {
                console.log("Columnas detectadas en el Excel:", Object.keys(rawData[0]));
                console.log("Muestra de datos (Fila 1):", rawData[0]);
            }

            const { raw: processedRows } = processBillingData(rawData);

            // Inject Department Tag into processed data
            const taggedData = processedRows.map(row => ({
                ...row,
                department: selectedDepartment
            }));

            await onDataLoaded(taggedData);
            setUploadComplete(true);
        } catch (error) {
            console.error(error);
            alert(`Error al procesar el archivo: ${error.message || 'Formato inválido'}`);
        } finally {
            setIsUploading(false);
        }
    };

    if (uploadComplete) {
        return (
            <div className="h-full flex items-center justify-center p-6 animate-fade-in">
                <div className="glass-card p-12 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                    <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse-soft">
                        <CheckCircle2 size={48} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">¡Carga Exitosa!</h2>
                    <p className="text-slate-400 font-medium mb-10 leading-relaxed">Los datos se han procesado y sincronizado correctamente con la base de datos.</p>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg active:scale-95"
                    >
                        Volver al Panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center p-6 animate-fade-in">
            <div className="glass-card max-w-2xl w-full p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>

                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Importar Datos</h2>
                        <p className="text-slate-400 font-medium">Cargar facturación desde Excel</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={downloadTemplate}
                            title="Descargar Plantilla Excel"
                            className="p-3 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-2xl transition-all ring-1 ring-white/5 group flex items-center gap-2 px-4"
                        >
                            <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Plantilla</span>
                        </button>
                        <button onClick={onCancel} className="p-3 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-2xl transition-all ring-1 ring-white/5">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Department Selection */}
                    {currentDepartment === 'all' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSelectedDepartment('Intermodal')}
                                className={clsx(
                                    "flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 group",
                                    selectedDepartment === 'Intermodal'
                                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                )}
                            >
                                <Ship size={32} strokeWidth={selectedDepartment === 'Intermodal' ? 2.5 : 2} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Intermodal</span>
                            </button>
                            <button
                                onClick={() => setSelectedDepartment('Nacional')}
                                className={clsx(
                                    "flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 group",
                                    selectedDepartment === 'Nacional'
                                        ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10"
                                )}
                            >
                                <Truck size={32} strokeWidth={selectedDepartment === 'Nacional' ? 2.5 : 2} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Nacional</span>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                                {selectedDepartment === 'Intermodal' ? <Ship size={20} /> : <Truck size={20} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Departamento Activo</p>
                                <p className="text-white font-black uppercase text-sm">{selectedDepartment}</p>
                            </div>
                        </div>
                    )}

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={clsx(
                            "relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-[32px] p-12 transition-all duration-500 flex flex-col items-center justify-center text-center",
                            isDragActive ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]" : "border-white/10 bg-white/2 hover:border-indigo-500/50 hover:bg-white/5",
                            file && "border-emerald-500/50 bg-emerald-500/5"
                        )}
                    >
                        <input {...getInputProps()} />

                        <div className={clsx(
                            "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110",
                            file ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500 group-hover:text-indigo-400"
                        )}>
                            {file ? <FileText size={36} /> : <UploadIcon size={36} />}
                        </div>

                        {file ? (
                            <div>
                                <h4 className="text-white font-black uppercase tracking-tight text-lg mb-1">{file.name}</h4>
                                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    <CheckCircle2 size={12} /> Archivo Preparado
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h4 className="text-white font-black uppercase tracking-tight text-lg mb-2">Suelte el archivo aquí</h4>
                                <p className="text-slate-500 font-medium text-sm">o haga clic para seleccionar desde su equipo</p>
                                <p className="mt-4 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl inline-block">SÓLO .XLSX O .XLS</p>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleUpload}
                        disabled={!file || !selectedDepartment || isUploading}
                        className={clsx(
                            "w-full py-5 rounded-[20px] font-black uppercase tracking-[0.3em] text-xs transition-all duration-500 flex items-center justify-center gap-4 group relative overflow-hidden",
                            !file || !selectedDepartment || isUploading
                                ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                                : "bg-indigo-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:-translate-y-1 active:scale-[0.98]"
                        )}
                    >
                        {isUploading ? (
                            <div className="flex items-center gap-4">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Procesando...</span>
                            </div>
                        ) : (
                            <>
                                <span>Iniciar Importación</span>
                                <Database size={18} className="group-hover:rotate-12 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

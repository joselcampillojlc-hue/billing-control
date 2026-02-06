import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

export default function Login({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        // Small artifical delay for "security feel"
        setTimeout(() => {
            const success = onLogin(password);
            if (!success) {
                setError(true);
                setLoading(false);
            }
        }, 600);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-blue-900/10 border border-white/50 backdrop-blur-sm p-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mx-auto mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Control Facturación</h1>
                    <p className="text-slate-500 text-sm mt-1">Acceso Restringido</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Contraseña de Acceso
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={clsx(
                                    "block w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all",
                                    error
                                        ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                                        : "border-slate-200 focus:ring-blue-100 focus:border-blue-500"
                                )}
                                placeholder="Introduce tu clave..."
                                autoFocus
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                ⚠️ Contraseña incorrecta
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className={clsx(
                            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all shadow-lg",
                            loading || !password
                                ? "bg-slate-300 cursor-not-allowed shadow-none"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                        )}
                    >
                        {loading ? 'Verificando...' : 'Entrar al Sistema'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">
                        Sistema Seguro • MG TRANSPORT
                    </p>
                </div>
            </div>
        </div>
    );
}

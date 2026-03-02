import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { clsx } from 'clsx';

export default function Login({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        const adminPass = import.meta.env.VITE_ADMIN_PASSWORD;
        const intermodalPass = import.meta.env.VITE_INTERMODAL_PASSWORD;
        const nacionalPass = import.meta.env.VITE_NACIONAL_PASSWORD;

        setTimeout(() => {
            if (password === adminPass) {
                onLogin({ role: 'admin', department: 'all' });
            } else if (password === intermodalPass) {
                onLogin({ role: 'user', department: 'Intermodal' });
            } else if (password === nacionalPass) {
                onLogin({ role: 'user', department: 'Nacional' });
            } else {
                setError(true);
                setLoading(false);
                setTimeout(() => setError(false), 2000);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0b14] relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-soft"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-soft" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-[440px] z-10 animate-fade-in">
                <div className="glass-card p-10 relative overflow-hidden">
                    {/* Subtle Internal Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-[0_0_40px_rgba(99,102,241,0.4)] mx-auto mb-6 transform hover:rotate-6 transition-transform duration-500">
                            <Truck size={40} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tighter uppercase mb-2">MG Transport</h1>
                        <p className="text-slate-400 font-medium tracking-widest text-[10px] uppercase">Control de Facturación • v3.0</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">
                                Clave de Acceso
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={clsx(
                                        "block w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all duration-300",
                                        error
                                            ? "border-red-500/50 focus:ring-red-500/30"
                                            : "border-white/10 focus:ring-indigo-500/50 focus:bg-white/10"
                                    )}
                                    placeholder="••••••••"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <p className="text-red-400 text-[11px] mt-2 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 px-1 text-center justify-center">
                                    Acceso denegado. Reinténtalo.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className={clsx(
                                "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-500 relative overflow-hidden group",
                                loading || !password
                                    ? "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
                                    : "bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-1 active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Entrar al Sistema</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] mt-8 opacity-50">
                    Trusted by logistics teams worldwide
                </p>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart2,
  Trash2,
  Truck,
  LogOut,
  UploadCloud,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { parseDate, getWeekKey, getMonthKey } from './utils/dateUtils';

// Components
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import DataManagement from './components/DataManagement';
import Upload from './components/Upload';
import Comparison from './components/Comparison';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-900/50 text-white rounded-xl m-10">
          <h2 className="text-2xl font-bold mb-4">Error Fatal en Dashboard</h2>
          <p className="font-mono text-xs">{this.state.error && this.state.error.toString()}</p>
          <pre className="font-mono text-[10px] mt-4 opacity-70 whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom minimal nav button
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap",
        active
          ? "bg-white text-black shadow-xl scale-105"
          : "text-slate-400 hover:text-white hover:bg-white/10"
      )}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden inline">{label.substring(0, 3)}</span>
    </button>
  );
}

// Validation Modal Component
function ValidationErrorsModal({ errors, onClose }) {
  if (errors.length === 0) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 sm:p-12 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      <div className="glass-card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col relative animate-scale-in">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Errores de Validación</h2>
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mt-1">{errors.length} problemas encontrados</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
          {errors.map((err, i) => (
            <div key={i} className="flex gap-6 p-6 rounded-3xl bg-red-500/5 border border-red-500/10 group hover:border-red-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0 font-black">
                {err.row}
              </div>
              <div>
                <p className="text-white font-black uppercase tracking-tight text-sm mb-1">Fila {err.row}</p>
                <p className="text-slate-400 text-sm font-medium">{err.reason}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-8 border-t border-white/5 bg-white/2">
          <button onClick={onClose} className="w-full py-4 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-indigo-50 active:scale-95 shadow-xl">
            Entendido, corregiré el archivo
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [view, setView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    // Check for saved session
    const savedSession = localStorage.getItem('mg_auth');
    if (savedSession) {
      try {
        const { isAdmin: savedIsAdmin, department: savedDept } = JSON.parse(savedSession);
        setIsAuthenticated(true);
        setIsAdmin(savedIsAdmin);
        setCurrentDepartment(savedDept);
      } catch (e) {
        localStorage.removeItem('mg_auth');
      }
    }

    console.log("App: Starting Firestore listener...");
    let q = collection(db, 'billing_records');

    // Safety timeout: if after 5 seconds we are still loading, force it to false
    const safetyTimeout = setTimeout(() => {
      console.warn("App: Safety timeout reached. Forcing isLoadingData to false.");
      setIsLoadingData(false);
    }, 5000);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(safetyTimeout);
      console.log(`App: onSnapshot fired with ${snapshot.docs.length} docs`);
      const records = snapshot.docs.map(doc => {
        const data = doc.data();

        // Normalize week field: older records stored week as a plain number (1, 2, 3...)
        // We need it as "Semana X - YYYY" string for filtering/display to work correctly
        let week = data.week;
        if (typeof week === 'number' || (typeof week === 'string' && /^\d+$/.test(week.trim()))) {
          const weekNum = parseInt(week, 10);
          // Extract year from monthIndex (e.g. "2026-01") or default to current year
          const year = data.monthIndex ? data.monthIndex.substring(0, 4) : new Date().getFullYear();
          week = `Semana ${weekNum} - ${year}`;
        }

        return {
          id: doc.id,
          ...data,
          week, // override with normalized value
        };
      });
      setData(records);
      setIsLoadingData(false);
    }, (error) => {
      clearTimeout(safetyTimeout);
      // Error handler - fires if Firestore rules block access or connection fails
      console.error('Firestore onSnapshot error:', error);
      setIsLoadingData(false);
      showNotification(`Error al conectar con la base de datos: ${error.message}`, 'error', 0);
    });
    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);


  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type });
    if (duration > 0) {
      setTimeout(() => setNotification(null), duration);
    }
  };

  const handleLogin = ({ role, department }) => {
    const isAdminRole = role === 'admin';
    setIsAuthenticated(true);
    setIsAdmin(isAdminRole);
    setCurrentDepartment(department);
    // Save session
    localStorage.setItem('mg_auth', JSON.stringify({ isAdmin: isAdminRole, department }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentDepartment('all');
    setView('dashboard');
    localStorage.removeItem('mg_auth');
  };

  const handleDataLoaded = async (processedData) => {
    setIsProcessing(true);
    console.log("App: handleDataLoaded started with", processedData.length, "rows");

    // Safety timeout for processing: 30 seconds
    const processingTimeout = setTimeout(() => {
      console.warn("App: Processing safety timeout reached. Forcing isProcessing to false.");
      setIsProcessing(false);
    }, 30000);

    try {
      // Split into chunks of 500 (Firestore batch limit)
      const chunks = [];
      const CHUNK_SIZE = 500;
      for (let i = 0; i < processedData.length; i += CHUNK_SIZE) {
        chunks.push(processedData.slice(i, i + CHUNK_SIZE));
      }

      for (const [index, chunk] of chunks.entries()) {
        const batch = writeBatch(db);
        chunk.forEach(row => {
          if (!row.fingerprint) return;
          const docRef = doc(db, 'billing_records', row.fingerprint);
          batch.set(docRef, row);
        });
        await batch.commit();
        console.log(`Pushed batch ${index + 1}/${chunks.length}`);
      }

      console.log("App: All batches committed successfully.");
      showNotification("¡Datos sincronizados correctamente!", 'success');
      setView('dashboard');
    } catch (error) {
      console.error("Firebase Sync Error:", error);
      showNotification(`Error al guardar en Firebase: ${error.message}`, 'error');
    } finally {
      clearTimeout(processingTimeout);
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    setIsProcessing(true);
    try {
      const snapshot = await getDocs(collection(db, 'billing_records'));
      const docs = snapshot.docs;

      const CHUNK_SIZE = 500;
      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      showNotification("Base de datos formateada", 'success');
      setView('dashboard');
    } catch (e) {
      console.error("Reset Error:", e);
      showNotification("Error al formatear: " + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMonth = async (m) => {
    if (!confirm(`¿Estás seguro de eliminar todo el mes ${m}?`)) return;
    // Use the 'month' field directly instead of F.Carga
    const targets = data.filter(r => r.month === m);
    if (!targets.length) return;
    setIsProcessing(true);
    try {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(r => batch.delete(doc(db, 'billing_records', r.id || r.fingerprint)));
        await batch.commit();
      }
      showNotification(`Registros de ${m} eliminados`, 'success');
    } catch (e) {
      console.error("Delete Month Error:", e);
      showNotification("Error al eliminar registros del mes", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteWeek = async (w) => {
    if (!confirm(`¿Estás seguro de eliminar la semana ${w}?`)) return;
    // Use the 'week' field directly instead of F.Carga
    const targets = data.filter(r => r.week === w);
    if (!targets.length) return;
    setIsProcessing(true);
    try {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(r => batch.delete(doc(db, 'billing_records', r.id || r.fingerprint)));
        await batch.commit();
      }
      showNotification(`Registros de la semana ${w} eliminados`, 'success');
    } catch (e) {
      console.error("Delete Week Error:", e);
      showNotification("Error al eliminar registros de la semana", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col bg-transparent overflow-x-hidden">
      {isProcessing && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-fade-in">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Procesando</h2>
          <p className="text-indigo-400 font-medium mt-2">Sincronizando con la nube...</p>
        </div>
      )}

      <ValidationErrorsModal errors={validationErrors} onClose={() => setValidationErrors([])} />

      {notification && (
        <div className={clsx(
          "fixed top-8 right-8 z-[200] px-8 py-5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fade-in flex items-center gap-4 min-w-[320px]",
          notification.type === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
            notification.type === 'error' ? "bg-red-500/20 border-red-500/30 text-red-400" :
              notification.type === 'warning' ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
                "bg-blue-500/20 border-blue-500/30 text-blue-400"
        )}>
          <div className="text-2xl font-black">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
          </div>
          <div className="flex-1">
            <p className="font-bold uppercase tracking-tight text-[10px] opacity-70 mb-0.5">{notification.type}</p>
            <p className="font-semibold text-white/90 text-sm">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-40 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="w-full bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[100]">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-[88px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Truck size={24} strokeWidth={2.5} />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xl font-black text-white uppercase tracking-tighter leading-none">MG Transport</span>
              <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-[0.2em] mt-0.5">Control de Facturación</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <NavItem icon={LayoutDashboard} label="Resumen" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavItem icon={BarChart2} label="Comparativa" active={view === 'comparison'} onClick={() => setView('comparison')} />
            <NavItem icon={FileSpreadsheet} label="Gestión" active={view === 'data'} onClick={() => setView('data')} />
            {isAdmin && (
              <NavItem icon={UploadCloud} label="Cargar Excel" active={view === 'upload'} onClick={() => setView('upload')} />
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors uppercase tracking-widest font-black text-xs bg-white/5 py-2.5 px-5 rounded-xl hover:bg-red-500/10">
              <LogOut size={16} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Viewport */}
      <main className="flex-1 w-full overflow-y-auto custom-scrollbar relative bg-[#0a0b14]">
        <div className="absolute top-0 right-0 w-1/3 h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-[1600px] mx-auto w-full p-6 lg:p-10 xl:p-12 relative z-10 flex flex-col min-h-[calc(100vh-88px)]">
          {isLoadingData ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 scale-90 min-h-[50vh]">
              <div className="w-16 h-16 border-2 border-white/5 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
              <p className="text-xs font-black tracking-[0.4em] uppercase text-white/40">Sincronizando</p>
            </div>
          ) : (
            <div className="flex-1 animate-fade-in-up">
              {view === 'dashboard' && (
                <ErrorBoundary>
                  <Dashboard
                    rawData={data}
                    currentDepartment={currentDepartment}
                    onDepartmentChange={setCurrentDepartment}
                    onAddMore={() => setView('upload')}
                    isAdmin={isAdmin}
                  />
                </ErrorBoundary>
              )}

              {view === 'comparison' && (
                <Comparison data={data} />
              )}

              {view === 'data' && (
                <DataManagement
                  rawData={data}
                  onDeleteMonth={handleDeleteMonth}
                  onDeleteWeek={handleDeleteWeek}
                  onReset={handleReset}
                  isAdmin={isAdmin}
                />
              )}

              {view === 'upload' && (
                <Upload
                  onDataLoaded={handleDataLoaded}
                  currentDepartment={currentDepartment}
                  onCancel={() => setView('dashboard')}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-xl py-4 px-6 flex items-center justify-center">
        <p className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">
          © {new Date().getFullYear()} Jose Luis Campillo · Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}

export default App;

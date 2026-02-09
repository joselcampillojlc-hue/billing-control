import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Import our db instance
import { collection, onSnapshot, addDoc, doc, deleteDoc, writeBatch, query, getDocs } from 'firebase/firestore';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';
import DataManagement from './components/DataManagement';
import Login from './components/Login';
import { LayoutDashboard, FileSpreadsheet, Settings, PieChart, PanelLeft, Trash2, Database, Truck, LogOut, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Custom minimal sidebar button
function SidebarItem({ icon: Icon, label, active, onClick, variant = 'default', disabled = false }) {
  const isDestructive = variant === 'destructive';

  if (disabled) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 my-1 rounded-xl transition-all duration-300 font-medium text-sm group",
        active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 translate-x-1"
          : isDestructive
            ? "text-slate-400 hover:bg-red-900/30 hover:text-red-400 hover:shadow-md hover:-translate-y-0.5"
            : "text-slate-400 hover:bg-slate-800 hover:text-white hover:shadow-md hover:-translate-y-0.5",
        disabled && "opacity-50 cursor-not-allowed hidden"
      )}
    >
      <Icon size={18} className={clsx("transition-transform", active ? "scale-110" : "group-hover:scale-110")} />
      <span className="tracking-wide">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
    </button>
  );
}

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data State - Sync with Firestore
  const [data, setData] = useState([]);

  // Subscribe to Firestore updates
  useEffect(() => {
    // We only fetch data if user is authenticated (security rules might block otherwise, though open for now)
    // To make it simple, we listen always or after login. Let's listen always for simplicity as auth is client-side for now

    // Import Firestore functions dynamically or assume they are available at module level if we import them at top
    // TO-DO: Ensure imports are added at top of file

    const q = query(collection(db, "billing_records")); // Using 'billing_records' collection

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ ...doc.data(), id: doc.id });
      });
      console.log("Fetched records:", records.length);
      setData(records);
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
  }, []); // Run once on mount

  const [view, setView] = useState('dashboard'); // Default to dashboard

  // Handle Login Logic
  const handleLogin = (password) => {
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD;
    const userPass = import.meta.env.VITE_APP_PASSWORD;

    if (password === adminPass) {
      setIsAuthenticated(true);
      setIsAdmin(true);
      return true;
    } else if (password === userPass) {
      setIsAuthenticated(true);
      setIsAdmin(false);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setView('dashboard');
  };

  const handleDataLoaded = async (newData) => {
    // Instead of local state set, we write to Firestore
    // Using batch for efficiency if many rows, but firestore batch is limited to 500 ops.
    // For simplicity, let's chunk it or just loop for now. 
    // Given the "Upload" probably passes an array.

    const batchSize = 450;
    const chunks = [];
    for (let i = 0; i < newData.length; i += batchSize) {
      chunks.push(newData.slice(i, i + batchSize));
    }

    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((row) => {
          const docRef = doc(collection(db, "billing_records"));
          batch.set(docRef, row); // row data
        });
        await batch.commit();
      }
      // View update is automatic via onSnapshot
      setView('dashboard');
      alert(`Se han cargado ${newData.length} registros correctamente.`);
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error al guardar datos: " + e.message);
    }
  };

  const handleReset = async () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible y afectará a todos los usuarios.')) {
      try {
        // We need to delete all docs.
        // First get all docs
        const q = query(collection(db, "billing_records"));
        const snapshot = await getDocs(q);

        const batchSize = 450;
        const chunks = [];
        let currentChunk = [];

        snapshot.forEach(doc => {
          currentChunk.push(doc);
          if (currentChunk.length === batchSize) {
            chunks.push(currentChunk);
            currentChunk = [];
          }
        });
        if (currentChunk.length > 0) chunks.push(currentChunk);

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }

        setView('upload');
      } catch (e) {
        console.error("Error clearing data:", e);
        alert("Error al borrar datos: " + e.message);
      }
    }
  };

  const handleDeleteMonth = async (monthStr) => {
    if (confirm(`¿Borrar todos los datos de ${monthStr}?`)) {
      // Find docs to delete based on current data state which has IDs
      // This is efficient enough for small-medium datasets

      const docsToDelete = data.filter(row => {
        let dateObj;
        const rawDate = row['F.Carga'];
        if (typeof rawDate === 'number') {
          dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else {
          dateObj = new Date(rawDate);
        }
        if (isNaN(dateObj)) return false;
        return format(dateObj, 'MMM yyyy', { locale: es }) === monthStr;
      });

      if (docsToDelete.length === 0) return;

      try {
        const batchSize = 450;
        const chunks = [];
        for (let i = 0; i < docsToDelete.length; i += batchSize) {
          chunks.push(docsToDelete.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(row => {
            // row.id comes from our onSnapshot mapping
            const docRef = doc(db, "billing_records", row.id);
            batch.delete(docRef);
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Error deleting month:", e);
        alert("Error al borrar mes: " + e.message);
      }
    }
  };

  const handleDeleteWeek = async (weekStr) => {
    if (confirm(`¿Borrar datos de ${weekStr}?`)) {
      const docsToDelete = data.filter(row => {
        let dateObj;
        const rawDate = row['F.Carga'];
        if (typeof rawDate === 'number') {
          dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else {
          dateObj = new Date(rawDate);
        }
        if (isNaN(dateObj)) return false;

        // Calculate week key to match
        const target = new Date(dateObj.valueOf());
        const dayNr = (dateObj.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
        const key = `Semana ${weekNum} - ${dateObj.getFullYear()}`;

        return key === weekStr;
      });

      if (docsToDelete.length === 0) return;

      try {
        const batchSize = 450;
        const chunks = [];
        for (let i = 0; i < docsToDelete.length; i += batchSize) {
          chunks.push(docsToDelete.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(row => {
            const docRef = doc(db, "billing_records", row.id);
            batch.delete(docRef);
          });
          await batch.commit();
        }
      } catch (e) {
        console.error("Error deleting week:", e);
        alert("Error al borrar semana: " + e.message);
      }
    }
  };


  // If no auth, show login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // If we have no data and are admin, we might want to default to upload, but standard users can't upload.
  // So standard users see dashboard (empty). Admin sees upload if empty.
  const currentView = view;

  return (
    <div className="min-h-screen flex relative font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Floating Dark Sidebar */}
      <aside className="fixed left-4 top-4 bottom-4 w-64 bg-slate-900 border border-slate-800 shadow-2xl shadow-blue-900/20 rounded-2xl flex flex-col z-50 overflow-hidden text-slate-300">
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 pl-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Billing<span className="text-blue-400">Control</span></h1>
              <p className="text-[10px] items-center flex gap-1 text-slate-400 font-semibold uppercase tracking-wider mt-1">
                {isAdmin ? (
                  <span className="text-emerald-400 flex items-center gap-1"><Shield size={10} /> Admin</span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">Lectura</span>
                )}
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <div className="px-4 mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Navegación</span>
            </div>
            <SidebarItem
              icon={LayoutDashboard}
              label="Panel Principal"
              active={currentView === 'dashboard'}
              onClick={() => setView('dashboard')}
            />

            {/* Admin Only: Upload */}
            <SidebarItem
              icon={FileSpreadsheet}
              label="Importar Datos"
              active={currentView === 'upload'}
              onClick={() => setView('upload')}
              disabled={!isAdmin}
            />

            {/* Admin Only: Management */}
            <SidebarItem
              icon={Database}
              label="Gestión de Datos"
              active={currentView === 'management'}
              onClick={() => setView('management')}
              disabled={!isAdmin}
            />
          </nav>

          {/* Actions Section - Admin Only */}
          {data.length > 0 && isAdmin && (
            <div className="mt-8">
              <div className="px-4 mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acciones</span>
              </div>
              <SidebarItem
                icon={Trash2}
                label="Limpiar Todo"
                variant="destructive"
                onClick={handleReset}
              />
            </div>
          )}
        </div>

        <div className="mt-auto p-4 mx-2 mb-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
          {/* Config button mapping to Management - Admin Only */}
          {isAdmin && (
            <SidebarItem
              icon={Settings}
              label="Configuración"
              active={currentView === 'management'}
              onClick={() => setView('management')}
            />
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 my-1 rounded-xl transition-all duration-300 font-medium text-sm text-slate-400 hover:bg-slate-700/50 hover:text-white"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
        <div className="px-6 pb-4 text-center">
          <p className="text-[10px] text-slate-600 font-medium">© 2026 Control Facturacion</p>
          <p className="text-[10px] text-slate-600 font-medium">JL Campillo</p>
        </div>
      </aside>

      {/* Main Content - Pushed by Layout */}
      <main className="flex-1 ml-72 p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto pl-4">
          {currentView === 'upload' && isAdmin ? (
            <div className="max-w-xl mx-auto mt-16 fade-in scale-in">
              <div className="mb-10 text-center">
                <div className="inline-block p-4 rounded-full bg-blue-50 mb-4 text-blue-600">
                  <FileSpreadsheet size={48} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Importar Datos</h2>
                <p className="text-slate-500 text-lg">Arrastra tus archivos Excel aquí para actualizar el panel de control al instante.</p>
              </div>
              <Upload onDataLoaded={handleDataLoaded} />
              {data.length > 0 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setView('dashboard')}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm hover:underline decoration-2 underline-offset-4"
                  >
                    &larr; Volver al Panel
                  </button>
                </div>
              )}
            </div>
          ) : currentView === 'management' && isAdmin ? (
            <DataManagement
              data={data}
              onDeleteMonth={handleDeleteMonth}
              onDeleteWeek={handleDeleteWeek}
              onResetAll={handleReset}
            />
          ) : (
            <Dashboard
              rawData={data}
              onAddMore={() => isAdmin ? setView('upload') : alert('Solo administradores pueden añadir datos.')}
              onReset={handleReset}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

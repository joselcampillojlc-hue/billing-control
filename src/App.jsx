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

// Validation Modal Component
function ValidationErrorsModal({ errors, onClose }) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-900">Errores de Validación</h3>
            <p className="text-red-700 text-sm">Se encontraron {errors.length} filas con problemas que NO se han subido.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="space-y-2">
            {errors.map((err, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex gap-3 text-sm">
                <span className="font-mono font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">Fila {err.row}</span>
                <span className="text-slate-700">{err.reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auth_isAuthenticated') === 'true';
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('auth_isAdmin') === 'true';
  });

  // Data State - Sync with Firestore
  const [data, setData] = useState([]);

  // Subscribe to Firestore updates
  useEffect(() => {
    if (!isAuthenticated) return; // Only listen if authenticated to save reads/bandwidth

    const q = query(collection(db, "billing_records")); // Using 'billing_records' collection

    // ... rest of useEffect
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ ...doc.data(), id: doc.id });
      });
      // console.log("Fetched records:", records.length);
      setData(records);
    }, (error) => {
      console.error("Error fetching data:", error);
    });

    return () => unsubscribe();
  }, [isAuthenticated]); // Depend on isAuthenticated

  const [view, setView] = useState('dashboard'); // Default to dashboard

  // Handle Login Logic
  const handleLogin = (password) => {
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD;
    const userPass = import.meta.env.VITE_APP_PASSWORD;

    if (password === adminPass) {
      setIsAuthenticated(true);
      setIsAdmin(true);
      localStorage.setItem('auth_isAuthenticated', 'true');
      localStorage.setItem('auth_isAdmin', 'true');
      return true;
    } else if (password === userPass) {
      setIsAuthenticated(true);
      setIsAdmin(false);
      localStorage.setItem('auth_isAuthenticated', 'true');
      localStorage.setItem('auth_isAdmin', 'false');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('auth_isAuthenticated');
    localStorage.removeItem('auth_isAdmin');
    setView('dashboard');
  };

  // Notification State
  const [notification, setNotification] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]); // Store validation errors

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    // Auto clear success/info after 5 seconds
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDataLoaded = async (newData) => {
    showNotification("Validando y subiendo datos...", 'info');
    setValidationErrors([]); // Clear previous errors

    // 1. Validate Data
    const validRows = [];
    const errors = [];

    newData.forEach((row, index) => {
      const rowNum = index + 2; // Excel header is row 1, so data starts at 2

      // Check for empty object
      if (Object.keys(row).length === 0) return;

      // Required Fields
      if (!row['F.Carga']) {
        errors.push({ row: rowNum, reason: "Falta la fecha (Columna 'F.Carga')" });
        return;
      }
      if (row['Euros'] === undefined || row['Euros'] === null) {
        errors.push({ row: rowNum, reason: "Falta el importe (Columna 'Euros')" });
        return;
      }

      // Sanitize
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        cleanRow[key] = row[key] === undefined ? null : row[key];
      });
      validRows.push(cleanRow);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      // We continue to upload valid rows, but warn user
    }

    if (validRows.length === 0) {
      showNotification("No se encontraron filas válidas para subir.", 'error');
      return;
    }

    // 2. Upload Valid Data
    const batchSize = 450;
    const chunks = [];
    for (let i = 0; i < validRows.length; i += batchSize) {
      chunks.push(validRows.slice(i, i + batchSize));
    }

    let successCount = 0;
    let failCount = 0;

    for (const chunk of chunks) {
      try {
        const batch = writeBatch(db);
        chunk.forEach((row) => {
          const docRef = doc(collection(db, "billing_records"));
          batch.set(docRef, row);
        });
        await batch.commit();
        successCount += chunk.length;
        console.log(`Batch success: ${chunk.length} records`);
      } catch (e) {
        console.error("Batch failed:", e);
        failCount += chunk.length;
      }
    }

    // View update is automatic via onSnapshot but we switch view
    setView('dashboard');

    if (failCount === 0 && errors.length === 0) {
      showNotification(`✅ ÉXITO: Se han cargado ${successCount} registros correctamente.`, 'success');
    } else if (failCount === 0 && errors.length > 0) {
      showNotification(`⚠️ PARCIAL: Subidos ${successCount} registros. ${errors.length} filas tenían errores (ver detalles).`, 'warning');
    } else {
      showNotification(`❌ PROBLEMAS: Subidos ${successCount}, Fallados ${failCount}.`, 'error');
    }
  };

  const handleReset = async () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible y afectará a todos los usuarios.')) {
      try {
        showNotification("Borrando todos los datos...", 'info');
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
        showNotification("Todos los datos han sido borrados.", 'success');
      } catch (e) {
        console.error("Error clearing data:", e);
        showNotification("Error al borrar datos: " + e.message, 'error');
      }
    }
  };

  const handleDeleteMonth = async (monthStr) => {
    if (confirm(`¿Borrar todos los datos de ${monthStr}?`)) {
      // Find docs to delete based on current data state which has IDs
      // This is efficient enough for small-medium datasets
      showNotification(`Borrando datos de ${monthStr}...`, 'info');

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
        showNotification(`Datos de ${monthStr} eliminados.`, 'success');
      } catch (e) {
        console.error("Error deleting month:", e);
        showNotification("Error al borrar mes: " + e.message, 'error');
      }
    }
  };

  const handleDeleteWeek = async (weekStr) => {
    if (confirm(`¿Borrar datos de ${weekStr}?`)) {
      showNotification(`Borrando datos de ${weekStr}...`, 'info');
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
        showNotification(`Datos de ${weekStr} eliminados.`, 'success');
      } catch (e) {
        console.error("Error deleting week:", e);
        showNotification("Error al borrar semana: " + e.message, 'error');
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

      {/* Validation Modal */}
      <ValidationErrorsModal errors={validationErrors} onClose={() => setValidationErrors([])} />

      {/* Notification Toast */}
      {notification && (
        <div className={clsx(
          "fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl border transition-all duration-300 animate-in slide-in-from-top-4",
          notification.type === 'success' ? "bg-emerald-500 text-white border-emerald-600" :
            notification.type === 'error' ? "bg-red-500 text-white border-red-600" :
              notification.type === 'warning' ? "bg-amber-500 text-white border-amber-600" :
                "bg-blue-500 text-white border-blue-600"
        )}>
          <div className="flex items-center gap-3">
            <div className="font-bold text-lg">
              {notification.type === 'success' ? '✓' :
                notification.type === 'error' ? '✕' :
                  notification.type === 'warning' ? '⚠️' : 'ℹ'}
            </div>
            <p className="font-medium">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-4 hover:bg-white/20 p-1 rounded">✕</button>
          </div>
        </div>
      )}

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
          <p className="text-[10px] text-slate-600 font-medium">JL Campillo - <span className="text-blue-400">v1.1</span></p>
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

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
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
      className={clsx(
        "relative group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 w-14 h-14",
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20"
          : isDestructive
            ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
      title={label}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      {active && (
        <span className="absolute -right-1 top-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
      )}
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
    return localStorage.getItem('auth_role') === 'admin';
  });
  const [currentDepartment, setCurrentDepartment] = useState(() => {
    return localStorage.getItem('auth_department') || 'all';
  });

  // Data State
  const [data, setData] = useState([]);

  // Notification State
  const [notification, setNotification] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]); // Store validation errors
  const [isLoadingData, setIsLoadingData] = useState(true); // Initial load state
  const [isProcessing, setIsProcessing] = useState(false); // Blocking action state

  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type });
    if (duration > 0 && type !== 'error') {
      setTimeout(() => setNotification(null), duration);
    }
  };

  // Fetch Data from Supabase
  const fetchData = async () => {
    try {
      // setIsLoadingData(true); // Don't block UI on background updates
      let query = supabase.from('billing_records').select('*');

      // Apply Department Filter if not 'all'
      if (currentDepartment !== 'all') {
        query = query.eq('department', currentDepartment);
      }

      const { data: records, error } = await query;

      if (error) {
        throw error;
      }

      setData(records || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("Error de conexión: " + error.message, 'error', 0);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial Fetch
    fetchData();

    // Realtime Subscription
    // Note: Supabase Realtime row-level filtering logic is complex.
    // Simplest strategy: Listen to all changes on the table, but re-fetch with our query filter.
    const channel = supabase
      .channel('billing-control-calm')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'billing_records' },
        (payload) => {
          // console.log('Change received!', payload);
          fetchData(); // Simplest strategy: re-fetch all. efficient enough for <10k rows.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, currentDepartment]);

  const [view, setView] = useState('dashboard'); // Default to dashboard

  // Handle Login Logic
  const handleLogin = ({ role, department }) => {
    setIsAuthenticated(true);
    setIsAdmin(role === 'admin');
    setCurrentDepartment(department);

    localStorage.setItem('auth_isAuthenticated', 'true');
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_department', department);
    return true;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentDepartment('all');
    localStorage.removeItem('auth_isAuthenticated');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_department');
    setView('dashboard');
  };

  const handleDataLoaded = async (newData) => {
    try {
      setIsProcessing(true);
      showNotification("Analizando archivo...", 'info', 0); // Sticky
      setValidationErrors([]);

      // 1. Validate Data
      const validRows = [];
      const errors = [];

      newData.forEach((row, index) => {
        const rowNum = index + 2;
        if (Object.keys(row).length === 0) return;

        if (!row['F.Carga']) {
          errors.push({ row: rowNum, reason: "Falta la fecha (Columna 'F.Carga')" });
          return;
        }
        if (row['Euros'] === null || row['Euros'] === undefined) {
          errors.push({ row: rowNum, reason: "Falta el importe (Columna 'Euros')" });
          return;
        }
        if (!row['Conductor']) {
          errors.push({ row: rowNum, reason: "Falta el Conductor (Columna 'Conductor')" });
          return;
        }
        if (!row['Nomb.Cliente']) {
          errors.push({ row: rowNum, reason: "Falta el Cliente (Columna 'Nomb.Cliente')" });
          return;
        }

        // Heuristic: Check for swapped columns (Company in Driver field)
        const conductorName = String(row['Conductor']).toUpperCase();
        if (conductorName.includes(' S.L') || conductorName.includes(' S.A') || conductorName.includes('LOGISTICA') || conductorName.includes('TRANSPORT')) {
          errors.push({ row: rowNum, reason: `Error: La columna 'Conductor' contiene una empresa (${row['Conductor']}). ¿Es posible que las columnas estén intercambiadas?` });
          return;
        }

        // Sanitize
        const cleanRow = {};
        Object.keys(row).forEach(key => {
          cleanRow[key] = row[key] === undefined ? null : row[key];
        });
        // Assign raw_data for future proofing if needed, though cleanRow is flat
        cleanRow.raw_data = row;
        validRows.push(cleanRow);
      });

      if (errors.length > 0) setValidationErrors(errors);

      if (validRows.length === 0) {
        showNotification("No se encontraron filas válidas.", 'error', 0);
        return;
      }

      // 2. Upload Valid Data
      const batchSize = 100; // Supabase limit is often higher but 100 is safe
      const chunks = [];
      for (let i = 0; i < validRows.length; i += batchSize) {
        chunks.push(validRows.slice(i, i + batchSize));
      }

      let successCount = 0;
      let failCount = 0;
      let lastError = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          showNotification(`Subiendo bloque ${i + 1} de ${chunks.length}...`, 'info', 0);

          const { error } = await supabase
            .from('billing_records')
            .insert(chunk);

          if (error) throw error;

          successCount += chunk.length;
        } catch (e) {
          console.error("Batch failed:", e);
          lastError = e.message || JSON.stringify(e);
          failCount += chunk.length;
        }
      }

      setView('dashboard');

      if (failCount === 0 && errors.length === 0) {
        showNotification(`✅ ÉXITO: ${successCount} registros subidos.`, 'success');
      } else if (failCount === 0 && errors.length > 0) {
        showNotification(`⚠️ PARCIAL: ${successCount} subidos. ${errors.length} errores.`, 'warning', 0);
      } else {
        // Show the actual error message to the user
        showNotification(`❌ ERROR (${lastError}): ${successCount} subidos. ${failCount} fallados.`, 'error', 0);
      }

    } catch (error) {
      console.error("Critical upload error:", error);
      showNotification("Error crítico: " + error.message, 'error', 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción es irreversible y afectará a todos los usuarios.')) {
      try {
        showNotification("Borrando todos los datos...", 'info');

        // Supabase truncate or delete all
        // We can't easy truncate without admin API sometimes, but delete where id is not null works
        const { error } = await supabase
          .from('billing_records')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything that isn't a dummy uuid

        if (error) throw error;

        // Optimize: Trigger manual fetch immediately in case realtime lags
        fetchData();

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
      showNotification(`Borrando datos de ${monthStr}...`, 'info');

      const docsToDelete = data.filter(row => {
        let dateObj;
        const rawDate = row['F.Carga'];
        // Supabase might return text, check if format matches
        // Assuming row['F.Carga'] is what we saved.
        if (!rawDate) return false;

        // Try parsing
        if (typeof rawDate === 'number') {
          dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else {
          dateObj = new Date(rawDate);
        }

        if (isNaN(dateObj)) return false;
        return format(dateObj, 'MMM yyyy', { locale: es }) === monthStr;
      });

      if (docsToDelete.length === 0) return;
      const idsToDelete = docsToDelete.map(d => d.id);

      try {
        const { error } = await supabase
          .from('billing_records')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;

        fetchData();
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
        if (!rawDate) return false;

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
      const idsToDelete = docsToDelete.map(d => d.id);

      try {
        const { error } = await supabase
          .from('billing_records')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;

        fetchData();
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

      {/* Blocking Overlay for Uploads */}
      {isProcessing && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white cursor-wait animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-bold">Procesando datos...</h2>
          <p className="text-white/80 mt-2">Por favor no cierres la ventana</p>
        </div>
      )}

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

      {/* Sidebar */}
      <div className="w-20 bg-slate-900 flex flex-col items-center py-6 gap-2 shadow-xl z-20">
        <div className="p-3 bg-indigo-500/20 rounded-xl mb-4">
          <Truck className="text-indigo-400" size={28} />
        </div>

        <SidebarItem
          icon={LayoutDashboard}
          label="Dash"
          active={view === 'dashboard'}
          onClick={() => setView('dashboard')}
        />
        <SidebarItem
          icon={FileSpreadsheet}
          label="Datos"
          active={view === 'data'}
          onClick={() => setView('data')}
        />
        <SidebarItem
          icon={Database}
          label="Subir"
          active={view === 'upload'}
          onClick={() => setView('upload')}
          disabled={!isAdmin}
        />

        <div className="mt-auto flex flex-col items-center gap-2">
          <SidebarItem
            icon={LogOut}
            label="Salir"
            variant="destructive"
            onClick={handleLogout}
          />
          <p className="text-[10px] text-slate-600 font-medium">JL Campillo - <span className="text-emerald-400">v2.0 (Supabase)</span></p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-slate-100 h-screen overflow-hidden flex flex-col">
        {isLoadingData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-10 h-10 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="font-medium">Cargando datos desde Supabase...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {view === 'dashboard' && <Dashboard rawData={data} currentDepartment={currentDepartment} />}
            {view === 'data' && <DataManagement data={data} onDeleteMonth={handleDeleteMonth} onDeleteWeek={handleDeleteWeek} onResetAll={handleReset} isAdmin={isAdmin} />}
            {view === 'upload' && isAdmin && (
              <div className="p-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-100 bg-white">
                    <h2 className="text-2xl font-bold text-slate-800">Cargar Archivo Excel</h2>
                    <p className="text-slate-500 mt-2">Sube el archivo de facturación para actualizar el dashboard.</p>
                  </div>
                  <div className="p-8 bg-slate-50/50">
                    <Upload onDataLoaded={handleDataLoaded} currentDepartment={currentDepartment} />

                    <div className="mt-8 pt-8 border-t border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Trash2 size={16} />
                        Zona de Peligro
                      </h3>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors border border-red-200 flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Borrar todos los datos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default App;

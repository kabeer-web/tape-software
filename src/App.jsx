import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './Components/ErrorBoundary';
import { WifiOff, RefreshCw } from 'lucide-react';
import { StockProvider } from './Components/inventory/StockContext';
import { AccountsProvider } from './Components/inventory/ACCOUNTS/AccountsContext';
import { AuthProvider, useAuth } from './Components/AuthContext';

import Sidebar from './Components/Sidebar';
import Dashboard from './Components/Dashboard';
import Analytics from './Components/Analytics';
import MasterSearch from './Components/MasterSearch';
import Login from './Components/Login';
import Production from './Components/inventory/Production';

// Jambo
import JamboStock from './Components/inventory/JamboStock';
import Clear from './Components/inventory/JAMBOFILES/clear';
import Lemon from './Components/inventory/JAMBOFILES/lemon';
import Tan from './Components/inventory/JAMBOFILES/tan';
import SuperYellow from './Components/inventory/JAMBOFILES/superyellow';
import SuperClear from './Components/inventory/JAMBOFILES/superclear';
import Color from './Components/inventory/JAMBOFILES/color';
import Cloth from './Components/inventory/JAMBOFILES/cloth';
import Masking from './Components/inventory/JAMBOFILES/masking';
import Tissue from './Components/inventory/JAMBOFILES/tissue';
import Foam from './Components/inventory/JAMBOFILES/foam';

// Carton & Core — one dynamic page each now (brand list comes from the
// `brands` table), replacing what used to be 4 hardcoded files per
// category (CARTON BRANDS/bell.jsx, race.jsx, tesco.jsx, jhonson.jsx and
// the CORE BRANDS equivalents). A new brand no longer needs a new file.
import CartonManager from './Components/inventory/CartonManager';
import CoreManager from './Components/inventory/CoreManager';

// Billing & Accounts (YAHAN FIX KIYA HAI)
import SaleInvoice from './Components/inventory/BILL/SaleInvoice';
import PurchaseInvoice from './Components/inventory/BILL/PurchaseInvoice';
import SavedBills from './Components/inventory/BILL/SavedBills';
import Ledger from './Components/inventory/ACCOUNTS/Ledger';

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#22c55e] font-bold text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Main Layout
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex bg-[#070707] min-h-screen relative">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed top-0 left-0 h-full z-30 transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      <main className="flex-1 min-h-screen text-white flex flex-col">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0c0c0c] border-b border-[#22c55e]/10 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-[#22c55e] p-2 rounded-xl hover:bg-[#22c55e]/10 transition">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 className="text-[#22c55e] font-black text-xl italic tracking-tighter">BEER<span className="text-white">FLOW</span></h1>
          <div className="w-9" />
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<MasterSearch />} />
            <Route path="/inventory/jambo" element={<JamboStock />} />
            <Route path="/inventory/jambo/clear" element={<Clear />} />
            <Route path="/inventory/jambo/lemon" element={<Lemon />} />
            <Route path="/inventory/jambo/tan" element={<Tan />} />
            <Route path="/inventory/jambo/super-yellow" element={<SuperYellow />} />
            <Route path="/inventory/jambo/super-clear" element={<SuperClear />} />
            <Route path="/inventory/jambo/color-tape" element={<Color />} />
            <Route path="/inventory/jambo/cloth-tape" element={<Cloth />} />
            <Route path="/inventory/jambo/masking" element={<Masking />} />
            <Route path="/inventory/jambo/tissue-tape" element={<Tissue />} />
            <Route path="/inventory/jambo/foam-tape" element={<Foam />} />
            <Route path="/inventory/carton/bell" element={<Navigate to="/inventory/carton/Bell" replace />} />
            <Route path="/inventory/carton/race" element={<Navigate to="/inventory/carton/Race" replace />} />
            <Route path="/inventory/carton/tesco" element={<Navigate to="/inventory/carton/Tesco" replace />} />
            <Route path="/inventory/carton/jhonson" element={<Navigate to="/inventory/carton/Jhonson" replace />} />
            <Route path="/inventory/carton/:brand" element={<CartonManager />} />
            <Route path="/inventory/carton" element={<CartonManager />} />
            <Route path="/inventory/core/bell" element={<Navigate to="/inventory/core/Bell" replace />} />
            <Route path="/inventory/core/race" element={<Navigate to="/inventory/core/Race" replace />} />
            <Route path="/inventory/core/tesco" element={<Navigate to="/inventory/core/Tesco" replace />} />
            <Route path="/inventory/core/jhonson" element={<Navigate to="/inventory/core/Jhonson" replace />} />
            <Route path="/inventory/core/:brand" element={<CoreManager />} />
            <Route path="/inventory/core" element={<CoreManager />} />
            <Route path="/billing/sale" element={<SaleInvoice />} />
            <Route path="/billing/purchase" element={<PurchaseInvoice />} />
            <Route path="/billing/saved" element={<SavedBills />} />
            <Route path="/accounts/ledger" element={<Ledger />} />
            <Route path="/accounts/bills" element={<SavedBills />} />
            <Route path="/production" element={<Production />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={
              <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                  <p className="text-6xl font-black text-[#22c55e]/20 mb-4">404</p>
                  <p className="text-gray-400">Page nahi mila</p>
                </div>
              </div>
            } />
          </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

// Tracks browser connectivity and shows a banner — folded into App.jsx
// (instead of separate hook/component files) since this is the only place
// it's used. Offline: shows a warning that data may be stale. Just back
// online: shows a "syncing" message for a few seconds while the service
// worker's Background Sync queue (see vite.config.js) replays anything
// saved while offline.
const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 5000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !justReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-widest ${
        isOnline ? 'bg-[#10b981] text-black' : 'bg-red-600 text-white'
      }`}
    >
      {isOnline ? (
        <><RefreshCw size={14} className="animate-spin" /> Back Online — Syncing Queued Changes...</>
      ) : (
        <><WifiOff size={14} /> Offline — Showing Last Synced Data. Changes Will Sync Automatically.</>
      )}
    </div>
  );
};

function App() {
  return (
    <>
      <OfflineBanner />
      <AuthProvider>
        <StockProvider>
          <AccountsProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<PublicRoute />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                } />
              </Routes>
            </Router>
          </AccountsProvider>
        </StockProvider>
      </AuthProvider>
    </>
  );
}

const PublicRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <Login />;
};

export default App;
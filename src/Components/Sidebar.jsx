import { useState, useContext } from 'react';
import {
  LayoutDashboard, Package, Receipt, Settings,
  ChevronDown, ChevronRight, Search,
  Users, X, FileText, BookOpen, LogOut, Factory, History,
  Pencil, Trash2, Plus, Check
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { StockContext } from './inventory/StockContext';

// Inline delete-confirm (click once to arm, click again to confirm) instead
// of a browser confirm() popup — matches the app's own styling instead of
// looking like a jarring native dialog.
const BrandRow = ({ brand, type, isRenaming, renameValue, setRenameValue, onStartRename, onCancelRename, onSaveRename, onDelete, onNavClick, navLinkClass }) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 py-1">
        <input
          autoFocus
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSaveRename(); if (e.key === 'Escape') onCancelRename(); }}
          className="flex-1 min-w-0 bg-black/40 px-2 py-1 rounded-md border border-[#22c55e]/40 outline-none text-xs text-white"
        />
        <button onClick={onSaveRename} className="text-[#22c55e] p-1 shrink-0"><Check size={12} /></button>
        <button onClick={onCancelRename} className="text-gray-500 p-1 shrink-0"><X size={12} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 group">
      <NavLink to={`/inventory/${type}/${encodeURIComponent(brand.name)}`} onClick={onNavClick} className={navLinkClass + ' flex-1 min-w-0'}>
        <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0" /><span className="truncate">{brand.name}</span>
      </NavLink>
      {confirmingDelete ? (
        <>
          <button onClick={onDelete} title="Confirm delete" className="text-red-500 hover:text-red-400 p-1 shrink-0"><Check size={12} /></button>
          <button onClick={() => setConfirmingDelete(false)} title="Cancel" className="text-gray-500 hover:text-gray-300 p-1 shrink-0"><X size={12} /></button>
        </>
      ) : (
        <>
          <button onClick={onStartRename} title="Rename brand" className="text-gray-600 hover:text-[#22c55e] p-1 shrink-0 opacity-60 group-hover:opacity-100 transition"><Pencil size={11} /></button>
          <button onClick={() => setConfirmingDelete(true)} title="Delete brand" className="text-gray-600 hover:text-red-500 p-1 shrink-0 opacity-60 group-hover:opacity-100 transition"><Trash2 size={11} /></button>
        </>
      )}
    </div>
  );
};

const AddBrandRow = ({ isAdding, value, setValue, onStart, onCancel, onSave }) => {
  if (isAdding) {
    return (
      <div className="flex items-center gap-1 py-1">
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
          placeholder="Brand name..."
          className="flex-1 min-w-0 bg-black/40 px-2 py-1 rounded-md border border-[#22c55e]/40 outline-none text-xs text-white"
        />
        <button onClick={onSave} className="text-[#22c55e] p-1 shrink-0"><Check size={12} /></button>
        <button onClick={onCancel} className="text-gray-500 p-1 shrink-0"><X size={12} /></button>
      </div>
    );
  }
  return (
    <button onClick={onStart} className="flex items-center gap-1.5 text-[11px] text-[#22c55e]/70 hover:text-[#22c55e] py-1.5 px-1 transition">
      <Plus size={11} /> Add Brand
    </button>
  );
};

const Sidebar = ({ onClose = () => {} }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const [isJamboOpen, setIsJamboOpen] = useState(false);
  const [isCartonOpen, setIsCartonOpen] = useState(false);
  const [isCoreOpen, setIsCoreOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);

  const { brands, addBrandManual, renameBrandManual, deleteBrandManual } = useContext(StockContext);

  // Add/rename-brand inline UI state (shared by both the Core and Carton
  // submenus below, since brand names are the same list for both).
  const [addingBrandFor, setAddingBrandFor] = useState(null); // 'core' | 'carton' | null
  const [newBrandName, setNewBrandName] = useState('');
  const [renamingBrandId, setRenamingBrandId] = useState(null);
  const [renameBrandInput, setRenameBrandInput] = useState('');

  const handleAddBrand = async () => {
    const name = newBrandName.trim();
    if (!name) return;
    try { await addBrandManual(name); } catch (e) { console.error(e); }
    setNewBrandName('');
    setAddingBrandFor(null);
  };

  const startRenameBrand = (b) => { setRenamingBrandId(b._id); setRenameBrandInput(b.name); };
  const cancelRenameBrand = () => { setRenamingBrandId(null); setRenameBrandInput(''); };
  const handleRenameBrand = async (b) => {
    try { await renameBrandManual(b, renameBrandInput); } catch (e) { console.error(e); }
    cancelRenameBrand();
  };
  const handleDeleteBrand = async (b) => {
    if (!window.confirm(`"${b.name}" brand delete karna hai? (Stock khud delete nahi hoga.)`)) return;
    try { await deleteBrandManual(b._id); } catch (e) { console.error(e); }
  };

  const jamboFiles = [
    { name: "Overview",     path: "/inventory/jambo" },
    { name: "Clear",        path: "/inventory/jambo/clear" },
    { name: "Lemon",        path: "/inventory/jambo/lemon" },
    { name: "Tan",          path: "/inventory/jambo/tan" },
    { name: "Super Yellow", path: "/inventory/jambo/super-yellow" },
    { name: "Super Clear",  path: "/inventory/jambo/super-clear" },
    { name: "Color Tape",   path: "/inventory/jambo/color-tape" },
    { name: "Cloth Tape",   path: "/inventory/jambo/cloth-tape" },
    { name: "Masking",      path: "/inventory/jambo/masking" },
    { name: "Tissue Tape",  path: "/inventory/jambo/tissue-tape" },
    { name: "Foam Tape",    path: "/inventory/jambo/foam-tape" },
  ];

  // Carton/Core Stock are single dynamic pages now (brand list comes from
  // the `brands` table) — see CartonManager.jsx / CoreManager.jsx.

  const billingPages = [
    { name: "Sale Invoice",     path: "/billing/sale" },
    { name: "Purchase Invoice", path: "/billing/purchase" },
    { name: "Saved Bills",      path: "/billing/saved" },
  ];

  const accountsPages = [
    { name: "Party Ledger", path: "/accounts/ledger" },
    { name: "Saved Bills",  path: "/accounts/bills" },
  ];

  const handleNavClick = () => onClose();

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
      isActive
        ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
        : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
    }`;

  const subLinkClass = ({ isActive }) =>
    `flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-all ${
      isActive
        ? 'text-[#22c55e] font-bold bg-[#22c55e]/5'
        : 'text-gray-500 hover:text-[#22c55e] hover:bg-white/5'
    }`;

  const SectionToggle = ({ label, icon: Icon, isOpen, onToggle, isActive }) => (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
        isActive
          ? 'text-[#22c55e] bg-[#22c55e]/5 border-[#22c55e]/20'
          : 'text-gray-400 hover:bg-white/5 hover:text-white border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      {isOpen
        ? <ChevronDown size={15} className="opacity-60" />
        : <ChevronRight size={15} className="opacity-60" />
      }
    </button>
  );

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isBillingActive   = location.pathname.startsWith('/billing');
  const isAccountsActive  = location.pathname.startsWith('/accounts');

  return (
    <aside className="w-64 h-screen bg-[#0c0c0c] border-r border-[#22c55e]/10 flex flex-col shrink-0 overflow-hidden">

      {/* Logo */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <div>
          <h1 className="text-[#22c55e] text-2xl font-black tracking-tighter italic">
            BEER<span className="text-white">FLOW</span>
          </h1>
          <div className="h-0.5 w-12 bg-[#22c55e] mt-1.5 rounded-full" />
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition">
          <X size={18} />
        </button>
      </div>

      {/* Master Search */}
      <div className="px-4 pb-2 shrink-0">
        <NavLink
          to="/search"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              isActive
                ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-white border-transparent'
            }`
          }
        >
          <Search size={18} /> Master Search
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto px-4 pb-4">

        <NavLink to="/" end onClick={handleNavClick} className={navLinkClass}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        {/* Inventory */}
        <div className="mt-1">
          <SectionToggle label="Inventory" icon={Package} isOpen={isInventoryOpen} onToggle={() => setIsInventoryOpen(!isInventoryOpen)} isActive={isInventoryActive} />
          {isInventoryOpen && (
            <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-[#22c55e]/10 pl-3">
              <button onClick={() => setIsJamboOpen(!isJamboOpen)} className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-[#22c55e] py-1.5 px-2 rounded-lg hover:bg-white/5 transition">
                <span className="font-semibold">Jambo Files</span>
                {isJamboOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isJamboOpen && (
                <div className="ml-3 flex flex-col gap-0.5 mb-1 border-l border-[#22c55e]/10 pl-2">
                  {jamboFiles.map(f => (
                    <NavLink key={f.path} to={f.path} end onClick={handleNavClick} className={subLinkClass}>
                      <span className="w-1 h-1 rounded-full bg-current opacity-60" />{f.name}
                    </NavLink>
                  ))}
                </div>
              )}
              

              <button onClick={() => setIsCartonOpen(!isCartonOpen)} className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-[#22c55e] py-1.5 px-2 rounded-lg hover:bg-white/5 transition">
                <span className="font-semibold">Carton Stock</span>
                {isCartonOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isCartonOpen && (
                <div className="ml-3 flex flex-col gap-0.5 mb-1 border-l border-[#22c55e]/10 pl-2">
                  {brands.map(b => (
                    <BrandRow key={b._id} brand={b} type="carton"
                      isRenaming={renamingBrandId === b._id} renameValue={renameBrandInput} setRenameValue={setRenameBrandInput}
                      onStartRename={() => startRenameBrand(b)} onCancelRename={cancelRenameBrand} onSaveRename={() => handleRenameBrand(b)}
                      onDelete={() => handleDeleteBrand(b)} onNavClick={handleNavClick} navLinkClass={subLinkClass} />
                  ))}
                  <AddBrandRow isAdding={addingBrandFor==='carton'} value={newBrandName} setValue={setNewBrandName}
                    onStart={() => setAddingBrandFor('carton')} onCancel={() => { setAddingBrandFor(null); setNewBrandName(''); }} onSave={handleAddBrand} />
                </div>
              )}

              <button onClick={() => setIsCoreOpen(!isCoreOpen)} className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-[#22c55e] py-1.5 px-2 rounded-lg hover:bg-white/5 transition">
                <span className="font-semibold">Core Stock</span>
                {isCoreOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isCoreOpen && (
                <div className="ml-3 flex flex-col gap-0.5 mb-1 border-l border-[#22c55e]/10 pl-2">
                  {brands.map(b => (
                    <BrandRow key={b._id} brand={b} type="core"
                      isRenaming={renamingBrandId === b._id} renameValue={renameBrandInput} setRenameValue={setRenameBrandInput}
                      onStartRename={() => startRenameBrand(b)} onCancelRename={cancelRenameBrand} onSaveRename={() => handleRenameBrand(b)}
                      onDelete={() => handleDeleteBrand(b)} onNavClick={handleNavClick} navLinkClass={subLinkClass} />
                  ))}
                  <AddBrandRow isAdding={addingBrandFor==='core'} value={newBrandName} setValue={setNewBrandName}
                    onStart={() => setAddingBrandFor('core')} onCancel={() => { setAddingBrandFor(null); setNewBrandName(''); }} onSave={handleAddBrand} />
                </div>
              )}
            </div>
          )}
        </div>

<NavLink to="/production" onClick={handleNavClick} className={navLinkClass}>
  <Factory size={18} /> Production
</NavLink>
        {/* Billing */}
        <div className="mt-1">
          <SectionToggle label="Billing" icon={Receipt} isOpen={isBillingOpen} onToggle={() => setIsBillingOpen(!isBillingOpen)} isActive={isBillingActive} />
          {isBillingOpen && (
            <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-[#22c55e]/10 pl-3">
              {billingPages.map(p => (
                <NavLink key={p.path} to={p.path} onClick={handleNavClick} className={subLinkClass}>
                  <FileText size={11} />{p.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Accounts */}
        <div className="mt-1">
          <SectionToggle label="Accounts" icon={Users} isOpen={isAccountsOpen} onToggle={() => setIsAccountsOpen(!isAccountsOpen)} isActive={isAccountsActive} />
          {isAccountsOpen && (
            <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-[#22c55e]/10 pl-3">
              {accountsPages.map(p => (
                <NavLink key={p.path} to={p.path} onClick={handleNavClick} className={subLinkClass}>
                  <BookOpen size={11} />{p.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* History (was Analytics — dead link before, now a real page) */}
        <div className="mt-1">
          <NavLink to="/analytics" onClick={handleNavClick} className={navLinkClass}>
            <History size={18} /> History
          </NavLink>
        </div>

        {/* Settings */}
        <div className="mt-1">
          <NavLink to="/settings" onClick={handleNavClick} className={navLinkClass}>
            <Settings size={18} /> Settings
          </NavLink>
        </div>

      </nav>

      {/* User + Logout Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-[#22c55e]/10 shrink-0">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-white/[0.03] rounded-xl border border-white/5">
          <div className="w-8 h-8 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center shrink-0">
            <span className="text-[#22c55e] font-black text-sm">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-semibold truncate">
              {user?.email || 'User'}
            </p>
            <p className="text-[10px] text-[#22c55e]">Admin</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            if (window.confirm('Logout karna hai?')) signOut();
          }}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition border border-transparent"
        >
          <LogOut size={17} /> Logout
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;

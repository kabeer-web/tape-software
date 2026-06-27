import { useState } from 'react';
import {
  LayoutDashboard, Package, Receipt, Settings,
  BarChart3, ChevronDown, ChevronRight, Search,
  Users, X, FileText, BookOpen, LogOut,Factory
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Sidebar = ({ onClose = () => {} }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const [isJamboOpen, setIsJamboOpen] = useState(false);
  const [isCartonOpen, setIsCartonOpen] = useState(false);
  const [isCoreOpen, setIsCoreOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);

  const jamboFiles = [
    { name: "Clear",        path: "/inventory/jambo/clear" },
    { name: "Tan",          path: "/inventory/jambo/tan" },
    { name: "Super Yellow", path: "/inventory/jambo/super-yellow" },
    { name: "Super Clear",  path: "/inventory/jambo/super-clear" },
    { name: "Color Tape",   path: "/inventory/jambo/color-tape" },
    { name: "Cloth Tape",   path: "/inventory/jambo/cloth-tape" },
    { name: "Masking",      path: "/inventory/jambo/masking" },
    { name: "Tissue Tape",  path: "/inventory/jambo/tissue-tape" },
    { name: "Foam Tape",    path: "/inventory/jambo/foam-tape" },
  ];

  const cartonBrands = [
    { name: "Overview", path: "/inventory/carton" },
    { name: "Bell",     path: "/inventory/carton/bell" },
    { name: "Race",     path: "/inventory/carton/race" },
    { name: "Tesco",    path: "/inventory/carton/tesco" },
    { name: "Jhonson",  path: "/inventory/carton/jhonson" },
  ];

  const coreBrands = [
    { name: "Bell",    path: "/inventory/core/bell" },
    { name: "Race",    path: "/inventory/core/race" },
    { name: "Tesco",   path: "/inventory/core/tesco" },
    { name: "Jhonson", path: "/inventory/core/jhonson" },
  ];

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
                    <NavLink key={f.path} to={f.path} onClick={handleNavClick} className={subLinkClass}>
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
                  {cartonBrands.map(b => (
                    <NavLink key={b.path} to={b.path} end onClick={handleNavClick} className={subLinkClass}>
                      <span className="w-1 h-1 rounded-full bg-current opacity-60" />{b.name}
                    </NavLink>
                  ))}
                </div>
              )}

              <button onClick={() => setIsCoreOpen(!isCoreOpen)} className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-[#22c55e] py-1.5 px-2 rounded-lg hover:bg-white/5 transition">
                <span className="font-semibold">Core Stock</span>
                {isCoreOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isCoreOpen && (
                <div className="ml-3 flex flex-col gap-0.5 mb-1 border-l border-[#22c55e]/10 pl-2">
                  {coreBrands.map(b => (
                    <NavLink key={b.path} to={b.path} onClick={handleNavClick} className={subLinkClass}>
                      <span className="w-1 h-1 rounded-full bg-current opacity-60" />{b.name}
                    </NavLink>
                  ))}
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

        {/* Analytics */}
        <div className="mt-1">
          <NavLink to="/analytics" onClick={handleNavClick} className={navLinkClass}>
            <BarChart3 size={18} /> Analytics
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

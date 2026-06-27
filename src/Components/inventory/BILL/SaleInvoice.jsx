import { useState } from 'react';
import {
  LayoutDashboard, Package, Receipt, Settings,
  BarChart3, ChevronDown, ChevronRight, Search,
  Users, X, FileText, BookOpen, LogOut, Factory
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const [isJamboOpen, setIsJamboOpen] = useState(false);
  const [isCartonOpen, setIsCartonOpen] = useState(false);
  const [isCoreOpen, setIsCoreOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

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
      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
    </button>
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0c0c0c] border-r border-[#22c55e]/10 flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h1 className="text-[#22c55e] text-2xl font-black italic">BEER<span className="text-white">FLOW</span></h1>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:text-white rounded-lg transition"><X size={20} /></button>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto px-4 pb-4">
          <NavLink to="/" end onClick={handleNavClick} className={navLinkClass}><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/search" onClick={handleNavClick} className={navLinkClass}><Search size={18} /> Master Search</NavLink>
          <NavLink to="/production" onClick={handleNavClick} className={navLinkClass}><Factory size={18} /> Production</NavLink>
          <NavLink to="/billing/sale" onClick={handleNavClick} className={navLinkClass}><Receipt size={18} /> Sale Invoice</NavLink>
        </nav>

        <div className="px-4 pb-5 pt-3 border-t border-[#22c55e]/10 shrink-0">
          <button onClick={() => window.confirm('Logout?') && signOut()} className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-400 hover:bg-red-500/5 rounded-xl transition">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; // <--- YE LIKHNA SABSE ZAROORI HAI

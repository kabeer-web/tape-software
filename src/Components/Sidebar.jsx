// Layout.jsx ya App.jsx ke andar
import { useState } from 'react';
import { Menu } from 'lucide-react'; // Hamburger icon ke liye
import Sidebar from './Sidebar';

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#070707]">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Navbar Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0c0c0c] border-b border-[#22c55e]/10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <span className="text-[#22c55e] font-black italic">BEERFLOW</span>
          <div className="w-10"></div> {/* Spacing balance karne ke liye */}
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

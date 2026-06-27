const Header = ({ title }) => {
  return (
    <header className="flex justify-between items-center mb-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="bg-[--color-surface] px-4 py-2 rounded-full border border-[--color-border] text-sm flex items-center gap-2">
        <span className="w-2 h-2 bg-[--color-neonGreen] rounded-full animate-pulse"></span>
        Status: <span className="text-[--color-neonGreen] font-bold">Online</span>
      </div>
    </header>
  );
};

export default Header;
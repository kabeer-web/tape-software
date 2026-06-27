import { useState } from 'react';
import { useAccounts } from "../ACCOUNTS/AccountsContext";
import { Users, TrendingUp, TrendingDown, ChevronRight, ChevronDown } from 'lucide-react';

const Ledger = () => {
  const { parties } = useAccounts();
  const [activeType, setActiveType] = useState('Sale');
  const [openParty, setOpenParty] = useState(null);

  const partyList = Object.values(parties).filter(p => p.type === activeType);

  const toggleParty = (name) => setOpenParty(prev => prev === name ? null : name);

  return (
    <div className="p-8 bg-[#070707] text-white min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Users className="text-[#22c55e]" size={28} />
        <h1 className="text-3xl font-black">PARTY <span className="text-[#22c55e]">LEDGER</span></h1>
      </div>

      <div className="flex gap-3 mb-8">
        <button onClick={() => setActiveType('Sale')} className={`px-6 py-2.5 rounded-xl font-bold text-sm border flex items-center gap-2 transition ${activeType==='Sale' ? 'bg-[#22c55e] text-black border-[#22c55e]' : 'bg-white/[0.03] text-gray-400 border-[#22c55e]/20 hover:border-[#22c55e]/50'}`}>
          <TrendingUp size={16} /> Sales Ledger
        </button>
        <button onClick={() => setActiveType('Purchase')} className={`px-6 py-2.5 rounded-xl font-bold text-sm border flex items-center gap-2 transition ${activeType==='Purchase' ? 'bg-[#22c55e] text-black border-[#22c55e]' : 'bg-white/[0.03] text-gray-400 border-[#22c55e]/20 hover:border-[#22c55e]/50'}`}>
          <TrendingDown size={16} /> Purchase Ledger
        </button>
      </div>

      {partyList.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>Koi {activeType} party nahi mili.</p>
          <p className="text-xs mt-1">Bill banao aur save karo — party khud-ba-khud yahan add ho jayegi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partyList.map(party => {
            const totalAmount = party.entries.reduce((s, e) => s + e.grandTotal, 0);
            const totalCartons = party.entries.reduce((s, e) => s + e.totalCarton, 0);
            const isOpen = openParty === party.name;

            return (
              <div key={party.name} className={`bg-white/[0.03] backdrop-blur-xl rounded-2xl border overflow-hidden transition ${isOpen ? 'border-[#22c55e]/40' : 'border-white/10'}`}>
                <button
                  onClick={() => toggleParty(party.name)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
                      <span className="text-[#22c55e] font-black text-lg">{party.name[0].toUpperCase()}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-black">{party.name}</p>
                      <p className="text-xs text-gray-500">{party.entries.length} bills · {totalCartons.toLocaleString()} cartons</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-black text-[#22c55e]">{totalAmount.toLocaleString()}</p>
                    {isOpen ? <ChevronDown size={18} className="text-[#22c55e]" /> : <ChevronRight size={18} className="text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/20 text-gray-500 uppercase">
                        <tr>
                          <th className="p-3">Bill #</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Total Carton</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {party.entries.map((entry, idx) => (
                          <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.02]">
                            <td className="p-3 font-bold">{entry.billNo || '—'}</td>
                            <td className="p-3 text-gray-400">{entry.date}</td>
                            <td className="p-3">{entry.totalCarton.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-[#22c55e]">{entry.grandTotal.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[#22c55e]/30 bg-[#22c55e]/5">
                          <td className="p-3 font-black" colSpan={2}>TOTAL</td>
                          <td className="p-3 font-black">{totalCartons.toLocaleString()}</td>
                          <td className="p-3 text-right font-black text-[#22c55e]">{totalAmount.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Ledger;
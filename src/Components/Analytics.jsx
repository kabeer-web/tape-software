import { useState, useEffect, useMemo } from 'react';
import { getActivityLog, updateActivityLogNote, deleteActivityLog } from '../api';
import { supabase } from '../supabase';
import {
  History, Search, Trash2, Pencil, Check, X,
  RefreshCcw, Package, Layers, Receipt, Factory, Box
} from 'lucide-react';

// Filename kept as Analytics.jsx on purpose (per instruction) — only the
// sidebar label and this page's own heading say "History" now. This used to
// be a dead nav item (Sidebar linked to /analytics, but no route existed —
// it just fell through to the 404 page). Now it's a real activity log
// covering every add/edit/delete across Jambo, Core, Carton, Production,
// and Bills, sourced from the new `activity_log` table (see the SQL
// migration handed over alongside this file).

const ENTITY_ICON = { Jambo: Layers, Core: Package, Carton: Box, Production: Factory, Bill: Receipt };
const ENTITY_COLOR = { Jambo: '#22c55e', Core: '#38bdf8', Carton: '#f97316', Production: '#a78bfa', Bill: '#f43f5e' };
const ACTION_LABEL = { add: 'Added', edit: 'Edited', delete: 'Deleted' };
const ACTION_COLOR = { add: 'text-[#22c55e] bg-[#22c55e]/10', edit: 'text-yellow-400 bg-yellow-400/10', delete: 'text-red-400 bg-red-400/10' };

const timeAgo = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Analytics = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [search, setSearch]   = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'All' | 'Today' | 'Week' | 'Month'
  const [editId, setEditId]   = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const data = await getActivityLog();
      setLogs(data || []);
    } catch (e) {
      // Most likely cause: the activity_log table/migration hasn't been run yet.
      setLoadErr(e.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Real-time ─────────────────────────────────────────────
  // Every add/edit/delete anywhere in the app (Jambo, Core, Carton,
  // Production, Bills) inserts a row into `activity_log` the moment it
  // happens. This subscribes to that table directly, so the list here
  // updates itself live — no refresh needed, even if the action happened
  // on another tab/device.
  useEffect(() => {
    const channel = supabase
      .channel('activity_log_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = { ...payload.new, _id: payload.new.id };
          setLogs(prev => prev.some(l => l._id === row._id) ? prev : [row, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const row = { ...payload.new, _id: payload.new.id };
          setLogs(prev => prev.map(l => l._id === row._id ? row : l));
        } else if (payload.eventType === 'DELETE') {
          setLogs(prev => prev.filter(l => l._id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const entities = ['All', 'Jambo', 'Core', 'Carton', 'Production', 'Bill'];
  const actions  = ['All', 'add', 'edit', 'delete'];
  const dateRanges = ['All', 'Today', 'Week', 'Month'];

  const withinDateFilter = (iso) => {
    if (dateFilter === 'All') return true;
    const d = new Date(iso);
    if (isNaN(d)) return false;
    const now = new Date();
    if (dateFilter === 'Today') return d.toDateString() === now.toDateString();
    if (dateFilter === 'Week') { const diff = (now - d) / 86400000; return diff >= 0 && diff <= 7; }
    if (dateFilter === 'Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      if (entityFilter !== 'All' && l.entity !== entityFilter) return false;
      if (actionFilter !== 'All' && l.action !== actionFilter) return false;
      if (!withinDateFilter(l.created_at)) return false;
      if (q && !`${l.label} ${l.category || ''} ${l.party_name || ''} ${l.note || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, search, entityFilter, actionFilter, dateFilter]);

  const todayStr = new Date().toLocaleDateString('en-GB');
  const isToday = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB') === todayStr; } catch { return false; } };
  const todayCount   = logs.filter(l => isToday(l.created_at)).length;
  const addCount     = logs.filter(l => l.action === 'add').length;
  const editCount    = logs.filter(l => l.action === 'edit').length;
  const deleteCount  = logs.filter(l => l.action === 'delete').length;

  const startEditNote = (l) => { setEditId(l._id); setNoteDraft(l.note || ''); };
  const cancelEditNote = () => { setEditId(null); setNoteDraft(''); };
  const saveNote = async (l) => {
    try {
      const updated = await updateActivityLogNote(l._id, noteDraft.trim());
      setLogs(prev => prev.map(x => x._id === l._id ? updated : x));
      cancelEditNote();
    } catch (e) { alert('Note save failed: ' + e.message); }
  };

  const handleDeleteLog = async (l) => {
    if (!window.confirm('Delete this history entry? (This only removes the log line — it does NOT undo the original action.)')) return;
    try {
      await deleteActivityLog(l._id);
      setLogs(prev => prev.filter(x => x._id !== l._id));
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  return (
    <div className="max-w-6xl mx-auto text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter"><History className="inline text-[#22c55e] mr-2 -mt-2" size={32}/> HS <span className="text-[#22c55e]">HISTORY</span></h1>
          <p className="text-gray-500 text-xs mt-1">Har add / edit / delete ka record — Jambo, Core, Carton, Production, Bills.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#22c55e]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span> Live
          </span>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition"><RefreshCcw size={14}/> Refresh</button>
        </div>
      </div>

      {loadErr && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <b>History load nahi ho saki:</b> {loadErr}<br/>
          <span className="text-red-300/70 text-xs">Agar ye pehli baar hai, to Supabase mein `001_activity_log.sql` migration run karni hogi.</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"><p className="text-2xl font-black text-white">{logs.length}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Total Events</p></div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"><p className="text-2xl font-black text-[#22c55e]">{todayCount}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Today</p></div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"><p className="text-2xl font-black text-yellow-400">{editCount}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Edits</p></div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"><p className="text-2xl font-black text-red-400">{deleteCount}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Deletes</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search roll #, party, brand, note..."
            className="w-full pl-9 p-2.5 bg-white/[0.03] rounded-xl border border-white/10 outline-none focus:border-[#22c55e]/50 text-sm"/>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {entities.map(e => (
            <button key={e} onClick={() => setEntityFilter(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${entityFilter === e ? 'bg-[#22c55e] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {actions.map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${actionFilter === a ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
              {a === 'All' ? 'All' : ACTION_LABEL[a]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dateRanges.map(r => (
            <button key={r} onClick={() => setDateFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${dateFilter === r ? 'bg-[#22c55e] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {r === 'All' ? 'All Time' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
        {loading ? (
          <div className="p-24 text-center text-gray-500 font-bold">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="p-24 text-center text-gray-600 font-bold uppercase tracking-widest italic">Koi record nahi mila.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(l => {
              const Icon = ENTITY_ICON[l.entity] || Package;
              const color = ENTITY_COLOR[l.entity] || '#9ca3af';
              const isEditing = editId === l._id;
              return (
                <div key={l._id} className="p-4 flex items-start gap-4 hover:bg-white/[0.02] transition group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1A`, color }}>
                    <Icon size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${ACTION_COLOR[l.action] || 'bg-white/10 text-gray-400'}`}>{ACTION_LABEL[l.action] || l.action}</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{l.entity}{l.category ? ` • ${l.category}` : ''}</span>
                      <span className="text-[10px] text-gray-600">{timeAgo(l.created_at)}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{l.label}</p>
                    {l.party_name && <p className="text-xs text-gray-500 mt-0.5">Party: <span className="text-gray-300 font-bold">{l.party_name}</span>{l.amount != null && <> • Rs. {Number(l.amount).toLocaleString()}</>}</p>}

                    {isEditing ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input autoFocus value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Add a note..."
                          className="flex-1 bg-black/30 p-2 rounded-lg border border-[#22c55e]/40 outline-none text-xs" />
                        <button onClick={() => saveNote(l)} className="text-[#22c55e] p-1.5"><Check size={15}/></button>
                        <button onClick={cancelEditNote} className="text-gray-500 p-1.5"><X size={15}/></button>
                      </div>
                    ) : l.note ? (
                      <p className="text-xs text-gray-400 italic mt-1">📝 {l.note}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    {!isEditing && <button onClick={() => startEditNote(l)} className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg" title="Add/edit note"><Pencil size={14}/></button>}
                    <button onClick={() => handleDeleteLog(l)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg" title="Delete this history entry"><Trash2 size={14}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;

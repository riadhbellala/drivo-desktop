import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { AdminLayout, StatCard } from '../components/AdminLayout';
import { Users, UserCheck, UserX, Search } from 'lucide-react';
import { API_URL } from '../config';

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setCustomers(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (id, current) => {
    try {
      setTogglingId(id);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/customers/${id}/disable`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ isDisabled: !current }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const updated = await res.json();
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, is_disabled: updated.is_disabled } : c));
    } catch (e) { alert(e.message); }
    finally { setTogglingId(null); }
  };

  const filtered = customers.filter(c =>
    `${c.full_name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const active = customers.filter(c => !c.is_disabled).length;
  const disabled = customers.filter(c => c.is_disabled).length;

  const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const avatarGradient = (i) => {
    const gradients = [
      'from-[#5B4FE9] to-[#E8542E]',
      'from-[#10b981] to-[#0ea5e9]',
      'from-[#f59e0b] to-[#ef4444]',
      'from-[#8b5cf6] to-[#ec4899]',
    ];
    return gradients[i % gradients.length];
  };

  return (
    <AdminLayout title="Customers" subtitle={`${customers.length} registered customers`}>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total" value={customers.length} icon={Users} accentColor="#5B4FE9" bg="#F0EDFF" />
        <StatCard label="Active" value={active} icon={UserCheck} accentColor="#10b981" bg="#d1fae5" />
        <StatCard label="Disabled" value={disabled} icon={UserX} accentColor="#ef4444" bg="#fee2e2" />
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 focus:border-[#5B4FE9] transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-slate-400 text-sm">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8F7FF] border-b border-slate-100">
                  {['Customer', 'Phone', 'Status', 'Joined', 'Action'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-[#F8F7FF] transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(i)} flex items-center justify-center text-white text-[12px] font-bold font-display shrink-0`}>
                          {initials(c.full_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0B0D10]">{c.full_name || '—'}</p>
                          <p className="text-[11px] text-slate-400">ID: {c.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-5 py-4 text-slate-500">{c.phone || '—'}</td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        c.is_disabled
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.is_disabled ? 'bg-red-400' : 'bg-emerald-500'}`} />
                        {c.is_disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    {/* Joined */}
                    <td className="px-5 py-4 text-slate-500">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    {/* Toggle */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleStatus(c.id, c.is_disabled)}
                        disabled={togglingId === c.id}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 ${
                          c.is_disabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {togglingId === c.id ? '…' : c.is_disabled ? 'Enable' : 'Disable'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminCustomers;

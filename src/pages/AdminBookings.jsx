import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { AdminLayout, StatCard, StatusBadge } from '../components/AdminLayout';
import {
import { API_URL } from '../config';
  CalendarCheck, Clock, CheckCircle2, XCircle,
  Search, PlusCircle,
} from 'lucide-react';

const STATUS_FLOW = {
  pending:   [{ label: 'Approve', next: 'approved', color: '#10b981' }, { label: 'Reject', next: 'rejected', color: '#ef4444' }],
  approved:  [{ label: 'Mark Active', next: 'active', color: '#5B4FE9' }],
  active:    [{ label: 'Complete', next: 'completed', color: '#8b5cf6' }],
  completed: [],
  rejected:  [],
  cancelled: [],
};

function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/bookings/admin/all`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setBookings(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, next) => {
    try {
      setUpdatingId(id);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/bookings/admin/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ newStatus: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: data.status || next } : b));
    } catch (e) { alert(e.message); }
    finally { setUpdatingId(null); }
  };

  const statuses = ['all', 'pending', 'approved', 'active', 'completed', 'rejected', 'cancelled'];

  const filtered = bookings.filter(b => {
    const matchSearch = `${b.profiles?.full_name || ''} ${b.vehicles?.brand || ''} ${b.vehicles?.model || ''}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'active').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  return (
    <AdminLayout
      title="Bookings"
      subtitle={`${bookings.length} total reservations`}
      action={
        <Link
          to="/admin/bookings/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#5B4FE9] text-white rounded-xl text-[12px] font-bold hover:bg-[#4B3FD9] transition-colors shadow-sm"
        >
          <PlusCircle size={13} /> New Booking
        </Link>
      }
    >

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={counts.total} icon={CalendarCheck} accentColor="#5B4FE9" bg="#F0EDFF" />
        <StatCard label="Active" value={counts.active} icon={CheckCircle2} accentColor="#10b981" bg="#d1fae5" />
        <StatCard label="Pending" value={counts.pending} icon={Clock} accentColor="#f59e0b" bg="#fef9c3" />
        <StatCard label="Completed" value={counts.completed} icon={XCircle} accentColor="#8b5cf6" bg="#ede9fe" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, vehicle…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 focus:border-[#5B4FE9] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold capitalize transition-all ${
                filterStatus === s
                  ? 'bg-[#5B4FE9] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-[#5B4FE9]/40 hover:text-[#5B4FE9]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-slate-400 text-sm">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F8F7FF] border-b border-slate-100">
                  {['Customer', 'Vehicle', 'Dates', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((b, i) => {
                  const actions = STATUS_FLOW[b.status] || [];
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-[#F8F7FF] transition-colors"
                    >
                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5B4FE9]/20 to-[#E8542E]/20 flex items-center justify-center text-[12px] font-bold text-[#5B4FE9] font-display shrink-0">
                            {(b.profiles?.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0B0D10]">{b.profiles?.full_name || b.walkin_name || '—'}</p>
                            <p className="text-[11px] text-slate-400">
                              {b.customer_id ? `ID: ${b.customer_id.substring(0, 8)}` : (b.walkin_phone || 'Walk-in')}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Vehicle */}
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {b.vehicles?.brand} {b.vehicles?.model}
                      </td>
                      {/* Dates */}
                      <td className="px-5 py-4 text-slate-500">
                        <p>{new Date(b.start_date).toLocaleDateString()}</p>
                        <p className="text-slate-400">→ {new Date(b.end_date).toLocaleDateString()}</p>
                      </td>
                      {/* Total */}
                      <td className="px-5 py-4 font-display font-bold text-[15px] text-[#0B0D10]">
                        ${Number(b.total_price || 0).toLocaleString()}
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={b.status} />
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {actions.map(({ label, next, color }) => (
                            <button
                              key={next}
                              onClick={() => updateStatus(b.id, next)}
                              disabled={updatingId === b.id}
                              className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold disabled:opacity-40 transition-opacity hover:opacity-90"
                              style={{ backgroundColor: color }}
                            >
                              {updatingId === b.id ? '…' : label}
                            </button>
                          ))}
                          {actions.length === 0 && (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminBookings;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { AdminLayout, StatCard, StatusBadge } from '../components/AdminLayout';
import { Car, CheckCircle2, Clock, PlusCircle, Pencil, Trash2, Search } from 'lucide-react';
import { API_URL } from '../config';

function AdminVehiclesList() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/vehicles/mine`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      setVehicles(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      setDeletingId(id);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      setVehicles(v => v.filter(x => x.id !== id));
    } catch (err) { alert(err.message); }
    finally { setDeletingId(null); }
  };

  const getImage = (v) =>
    v.images?.[0]?.storage_path
      ? supabase.storage.from('vehicle-images').getPublicUrl(v.images[0].storage_path).data.publicUrl
      : '/images/hero_sports.png';

  const filtered = vehicles.filter(v =>
    `${v.brand} ${v.model} ${v.category}`.toLowerCase().includes(search.toLowerCase())
  );

  const available = vehicles.filter(v => v.status === 'available').length;
  const rented = vehicles.filter(v => v.status === 'rented').length;

  return (
    <AdminLayout
      title="Vehicles"
      subtitle={`${vehicles.length} total vehicles in fleet`}
      action={
        <Link
          to="/admin/vehicles/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#5B4FE9] text-white rounded-xl text-[12px] font-bold hover:bg-[#4B3FD9] transition-colors shadow-sm"
        >
          <PlusCircle size={13} /> Add Vehicle
        </Link>
      }
    >
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Fleet" value={vehicles.length} icon={Car} accentColor="#5B4FE9" bg="#F0EDFF" />
        <StatCard label="Available" value={available} icon={CheckCircle2} accentColor="#10b981" bg="#d1fae5" />
        <StatCard label="Rented Out" value={rented} icon={Clock} accentColor="#f59e0b" bg="#fef9c3" />
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by brand, model, category…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 focus:border-[#5B4FE9] transition-all"
        />
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-center py-10 text-red-500 text-sm">{error}</p>}

      {/* Cards grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-slate-400 text-sm bg-white rounded-[20px] border border-slate-100">
              No vehicles found.
            </div>
          ) : filtered.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              {/* Image */}
              <div className="h-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
                <img
                  src={getImage(v)}
                  alt={`${v.brand} ${v.model}`}
                  className="w-[85%] h-[85%] object-contain mix-blend-multiply drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 right-3">
                  <StatusBadge status={v.status} />
                </span>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold capitalize">{v.category} · {v.year}</p>
                  <h3 className="font-display font-bold text-[17px] text-[#0B0D10] mt-0.5">{v.brand} {v.model}</h3>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span>⚙ {v.transmission || '—'}</span>
                  <span>👥 {v.seats || '—'} seats</span>
                  <span>⛽ {v.fuel_type || '—'}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Daily Rate</p>
                    <p className="font-display font-bold text-[18px] text-[#0B0D10]">${v.daily_price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/vehicles/${v.id}/edit`}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-[#5B4FE9] hover:text-white hover:border-transparent transition-all"
                    >
                      <Pencil size={13} />
                    </Link>
                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={deletingId === v.id}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white hover:border-transparent transition-all disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminVehiclesList;

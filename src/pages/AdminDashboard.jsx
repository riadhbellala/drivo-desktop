import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { AdminLayout, StatCard, StatusBadge } from '../components/AdminLayout';
import { API_URL } from '../config';
import {
  CircleDollarSign, Car, CalendarCheck, Users,
  ChevronRight, TrendingUp, PlusCircle, Zap,
} from 'lucide-react';

/* Mini bar chart styled like the mockup */
function MockupBarChart({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end justify-between h-[120px] w-full pt-4">
      {values.map((v, i) => {
        const isHighest = v === max;
        const h = Math.max((v / max) * 100, 15);
        return (
          <div key={i} className="flex flex-col items-center gap-2 w-10">
            {isHighest && (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                74%
              </span>
            )}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className={`w-full rounded-full origin-bottom ${
                isHighest ? 'bg-[#5EC28B]' : (i % 2 === 0 ? 'bg-[#1A6340]' : 'bg-slate-200 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]')
              }`}
              style={{ height: `${h}%` }}
            />
            <span className="text-[11px] font-medium text-slate-400 mt-1">
              {['S','M','T','W','T','F','S'][i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = false;
    const load = async (session) => {
      if (loaded) return; // prevent double-loading
      loaded = true;
      try {
        setLoading(true);
        if (!session) {
          console.warn('[Dashboard] No session available');
          setLoading(false);
          return;
        }
        const h = { Authorization: `Bearer ${session.access_token}` };

        const [sRes, bRes, vRes] = await Promise.all([
          fetch(`${API_URL}/dashboard`, { headers: h }),
          fetch(`${API_URL}/bookings/admin/all`, { headers: h }),
          fetch(`${API_URL}/vehicles/mine`, { headers: h }),
        ]);

        if (sRes.ok) {
          setStats(await sRes.json());
        } else {
          console.error('[Dashboard] Stats fetch failed:', sRes.status, await sRes.text());
        }
        if (bRes.ok) {
          setBookings(await bRes.json());
        } else {
          console.error('[Dashboard] Bookings fetch failed:', bRes.status, await bRes.text());
        }
        if (vRes.ok) {
          setVehicles(await vRes.json());
        } else {
          console.error('[Dashboard] Vehicles fetch failed:', vRes.status, await vRes.text());
        }
      } catch (e) {
        console.error('[Dashboard] Load error:', e);
      } finally {
        setLoading(false);
      }
    };

    // Use onAuthStateChange to reliably get the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const spark = [30, 45, 74, 85, 40, 35, 45]; // 7 days
  const recentBookings = bookings.slice(0, 5);
  
  // Sort approved/active bookings by start_date ascending to find the next upcoming one
  const upcomingBookings = [...bookings]
    .filter(b => b.status === 'approved' || b.status === 'active')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const nextBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;
  
  // Extract unique customers from bookings for the team widget
  const recentCustomers = [];
  const seenIds = new Set();
  for (const b of bookings) {
    if (!seenIds.has(b.customer_id)) {
      seenIds.add(b.customer_id);
      recentCustomers.push(b);
    }
    if (recentCustomers.length >= 4) break;
  }

  const getImage = (v) =>
    v.images?.[0]?.storage_path
      ? supabase.storage.from('vehicle-images').getPublicUrl(v.images[0].storage_path).data.publicUrl
      : '/images/hero_sports.png';

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Manage your fleet, bookings, and customers."
      action={
        <NavLink
          to="/admin/vehicles/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1A6340] text-white rounded-full text-[13px] font-bold hover:bg-[#134D31] transition-colors"
        >
          <PlusCircle size={14} />
          Add Vehicle
        </NavLink>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-72">
          <div className="w-10 h-10 border-4 border-[#1A6340] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Active Rentals" value={stats?.activeRentals ?? 0} isPrimary={true} trend={12} />
            <StatCard label="Total Revenue" value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`} isPrimary={false} trend={5} />
            <StatCard label="Monthly Bookings" value={stats?.monthlyBookings ?? 0} isPrimary={false} trend={8} />
            <StatCard label="Total Customers" value={stats?.newCustomers ?? 0} isPrimary={false} trend={3} />
          </div>

          {/* ── WIDGETS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (Spans 8) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
               
               {/* Analytics + Reminders Row */}
               <div className="grid grid-cols-1 md:grid-cols-8 gap-6">
                  {/* Analytics */}
                  <div className="md:col-span-5 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <h3 className="font-display font-medium text-[16px] text-[#0B0D10]">Booking Analytics</h3>
                    <MockupBarChart values={spark} />
                  </div>
                  
                  {/* Reminders / Next Booking */}
                  <div className="md:col-span-3 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="font-display font-medium text-[16px] text-[#0B0D10] mb-4">Reminders</h3>
                    {nextBooking ? (
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="font-display font-bold text-[18px] leading-tight text-[#1A6340]">
                          {nextBooking.vehicles?.brand} {nextBooking.vehicles?.model}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-2 font-medium">
                          Client : {nextBooking.profiles?.full_name || 'A customer'}
                        </p>
                        <p className="text-[12px] text-slate-400 mt-1 font-medium">
                          Date : {new Date(nextBooking.start_date).toLocaleDateString()}
                        </p>
                        <NavLink to="/admin/bookings" className="mt-6 w-full py-3 bg-[#1A6340] text-white rounded-xl text-[13px] font-bold hover:bg-[#134D31] flex justify-center items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                          View Bookings
                        </NavLink>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
                        No upcoming bookings
                      </div>
                    )}
                  </div>
               </div>
               
               {/* Customers + Progress Row */}
               <div className="grid grid-cols-1 md:grid-cols-8 gap-6">
                  {/* Team Collaboration -> Recent Customers */}
                  <div className="md:col-span-5 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-display font-medium text-[16px] text-[#0B0D10]">Recent Customers</h3>
                    </div>
                    <div className="space-y-4">
                      {recentCustomers.map((c, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A6340]/20 to-[#5EC28B]/20 flex items-center justify-center text-[13px] font-bold text-[#1A6340]">
                              {(c.profiles?.full_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#0B0D10]">{c.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-[11px] text-slate-400">Rented <span className="font-semibold text-slate-600">{c.vehicles?.brand} {c.vehicles?.model}</span></p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            c.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            c.status === 'active' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Project Progress -> Fleet Progress */}
                  <div className="md:col-span-3 bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                    <h3 className="font-display font-medium text-[16px] text-[#0B0D10]">Fleet Progress</h3>
                    <div className="flex-1 flex flex-col items-center justify-center relative py-4">
                       <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90">
                         {/* Background circle */}
                         <path
                           d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                           fill="none" stroke="#f1f5f9" strokeWidth="6" strokeDasharray="60, 100"
                         />
                         {/* Foreground circle */}
                         <path
                           d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                           fill="none" stroke="#1A6340" strokeWidth="6" strokeDasharray={`${stats?.totalCars ? ((stats.rentedCars / stats.totalCars) * 60) : 0}, 100`}
                           strokeLinecap="round"
                         />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                         <span className="font-display font-bold text-[28px] text-[#0B0D10] leading-none">
                           {stats?.totalCars ? Math.round((stats.rentedCars / stats.totalCars) * 100) : 0}%
                         </span>
                         <span className="text-[11px] text-slate-400 font-medium mt-1">Fleet Rented</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1A6340]"></span><span className="text-[10px] font-medium text-slate-500">Rented</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#134D31]"></span><span className="text-[10px] font-medium text-slate-500">Available</span></div>
                      <div className="flex items-center gap-1.5 text-slate-300"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg><span className="text-[10px] font-medium text-slate-500">Filters</span></div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Right Column (Spans 4) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
               
               {/* Recent Bookings List */}
               <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="font-display font-medium text-[16px] text-[#0B0D10]">Recent Bookings</h3>
                   <NavLink to="/admin/bookings/new" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-full text-[11px] font-bold text-slate-600 hover:bg-slate-50">
                     <PlusCircle size={12} /> New
                   </NavLink>
                 </div>
                 
                 <div className="flex-1 space-y-5">
                   {recentBookings.map((b, i) => (
                     <div key={i} className="flex items-start gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                         i % 3 === 0 ? 'bg-blue-50 text-blue-500' :
                         i % 3 === 1 ? 'bg-amber-50 text-amber-500' :
                         'bg-purple-50 text-purple-500'
                       }`}>
                         <Car size={14} />
                       </div>
                       <div className="flex-1">
                         <p className="text-[13px] font-bold text-[#0B0D10] leading-none">{b.vehicles?.brand} {b.vehicles?.model}</p>
                         <p className="text-[10px] text-slate-400 mt-1">Due date: {new Date(b.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Removed Time Tracker */}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminDashboard;

import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import carLogo from '../assets/carlogo.png';
import NotificationBell from './NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import {
  LayoutDashboard, Car, CalendarCheck, Users, LogOut,
  PlusCircle, Menu, X, ChevronRight, TrendingUp,
  ArrowLeft,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   SHARED STATUS BADGE
═══════════════════════════════════════════════ */
export function StatusBadge({ status }) {
  const cfg = {
    active:    { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    approved:  { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    pending:   { bg: '#fef9c3', text: '#854d0e', dot: '#f59e0b' },
    completed: { bg: '#ede9fe', text: '#4c1d95', dot: '#8b5cf6' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    rejected:  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    available: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    rented:    { bg: '#fef9c3', text: '#854d0e', dot: '#f59e0b' },
    disabled:  { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  };
  const s = cfg[status?.toLowerCase()] || { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   SIDEBAR NAV ITEM
═══════════════════════════════════════════════ */
function SideItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-6 py-3 rounded-none text-[14px] font-medium transition-all group ${
          isActive
            ? 'text-[#0B0D10] font-bold'
            : 'text-[#64748b] hover:text-slate-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#1A6340] rounded-r-full" />
          )}
          <Icon size={18} className={isActive ? 'text-[#1A6340]' : 'text-[#94a3b8] group-hover:text-slate-600'} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ═══════════════════════════════════════════════
   ADMIN LAYOUT SHELL  (Sidebar + top bar)
═══════════════════════════════════════════════ */
export function AdminLayout({ children, title, subtitle, action }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [agencyName, setAgencyName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
      if (p?.full_name) setAdminName(p.full_name);

      try {
        const res = await fetch(`${API_URL}/agencies/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const agency = await res.json();
          setAgencyName(agency.name || '');
        }
      } catch (err) {
        console.error('[AdminLayout] Failed to fetch agency:', err);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/admin/customers', label: 'Customers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-body">

      {/* ── SIDEBAR ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed left-0 top-0 bottom-0 z-30 w-[240px] bg-[#F8F9FA] flex flex-col"
          >
            {/* Brand */}
            <div className="px-6 py-6 pb-8">
              <Link to="/" className="flex items-center gap-3 group">
                <img src={carLogo} alt="DriveEase Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
                <span className="font-display font-bold text-xl tracking-tight text-[#0B0D10]">{agencyName || 'DriveEase'}</span>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto pt-2">
              <p className="px-6 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-body">Menu</p>
              
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-6 py-3 rounded-none text-[14px] font-medium transition-all group ${
                    isActive ? 'text-[#0B0D10] font-bold' : 'text-[#64748b] hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#1A6340] rounded-r-full" />}
                    <LayoutDashboard size={18} className={isActive ? 'text-[#1A6340]' : 'text-[#94a3b8]'} />
                    <span>Dashboard</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/admin/vehicles"
                className={({ isActive }) =>
                  `relative flex items-center justify-between px-6 py-3 rounded-none text-[14px] font-medium transition-all group ${
                    isActive ? 'text-[#0B0D10] font-bold' : 'text-[#64748b] hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#1A6340] rounded-r-full" />}
                    <div className="flex items-center gap-3">
                      <Car size={18} className={isActive ? 'text-[#1A6340]' : 'text-[#94a3b8]'} />
                      <span>Vehicles</span>
                    </div>
                    <span className="bg-[#1A6340] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">12+</span>
                  </>
                )}
              </NavLink>

              <SideItem to="/admin/bookings" label="Bookings" icon={CalendarCheck} />
              <SideItem to="/admin/customers" label="Customers" icon={Users} />

              <p className="px-6 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-8 mb-2 font-body">General</p>
              <SideItem to="/admin/settings" label="Settings" icon={PlusCircle} />
              
              <button
                onClick={handleLogout}
                className="w-full relative flex items-center gap-3 px-6 py-3 rounded-none text-[14px] font-medium text-[#64748b] hover:text-slate-800 transition-all group"
              >
                <LogOut size={18} className="text-[#94a3b8] group-hover:text-slate-600" />
                <span>Logout</span>
              </button>
            </nav>

          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN ── */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 240 : 0 }}
      >
        {/* Top Bar (Search + Profile) */}
        <header className="px-8 py-5 flex items-center justify-end">

          <div className="flex items-center gap-4">
            <NotificationBell />
            
            <div className="flex items-center gap-3 ml-2">
              <div className="text-right">
                <p className="text-[13px] font-bold text-[#0B0D10]">{adminName}</p>
                <p className="text-[11px] text-slate-400">{adminName.toLowerCase().replace(' ', '')}@mail.com</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8542E] to-[#5B4FE9] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {adminName[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Content Header (Title + Action Buttons) */}
        <div className="px-8 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="font-display font-medium text-[32px] text-[#0B0D10] leading-tight tracking-tight">{title}</h1>
            {subtitle && <p className="text-[13px] text-slate-400 font-body mt-1">{subtitle}</p>}
          </div>
          {action && (
            <div className="flex items-center gap-3">
              {action}
            </div>
          )}
        </div>

        {/* Content Body */}
        <main className="flex-1 px-8 pb-8 pt-4 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STAT CARD (shared)
═══════════════════════════════════════════════ */
export function StatCard({ label, value, isPrimary, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-[24px] p-6 flex flex-col justify-between ${
        isPrimary 
          ? 'bg-[#1A6340] text-white shadow-lg shadow-[#1A6340]/20' 
          : 'bg-white text-[#0B0D10] shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <p className={`text-[15px] font-medium ${isPrimary ? 'text-white' : 'text-[#0B0D10]'}`}>
          {label}
        </p>
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
          isPrimary ? 'border-white/20 bg-white text-[#1A6340]' : 'border-slate-200 bg-white text-slate-800'
        }`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </div>
      </div>
      
      <div className="mt-8 mb-4">
        <p className="font-display font-medium text-[44px] tracking-tight leading-none">{value}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`w-6 h-4 rounded flex items-center justify-center ${isPrimary ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
          <span className="text-[10px] font-bold">6^</span>
        </div>
        <span className={`text-[11px] ${isPrimary ? 'text-white/80' : 'text-slate-400'}`}>Increased from last month</span>
      </div>
    </motion.div>
  );
}

export default AdminLayout;

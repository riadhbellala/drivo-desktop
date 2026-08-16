import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function RequireAdmin({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'agency_owner' || profile?.role === 'agency_staff') {
        setIsAdmin(true);
      }

      setLoading(false);
    };

    checkAdmin();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Verifying permissions...</div>;
  }

  // Desktop app is admin-only — redirect non-admins back to login
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function RequireAuth({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
        } else if (event === 'SIGNED_IN') {
          setSession(session);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

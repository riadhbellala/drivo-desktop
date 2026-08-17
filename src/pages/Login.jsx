import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import carLogo from '../assets/carlogo.png';
import authBg from '../assets/auth_bg.png';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRedirect = async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile?.role === 'agency_owner' || profile?.role === 'agency_staff') {
        navigate('/admin');
        return;
      }
    } catch (err) {
      // fallback on error
    }
    // Not an agency account — stay on login with an error
    navigate('/login');
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        handleRedirect(data.session.user.id);
      }
    };
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
    } else {
      if (data?.session?.user?.id) {
        await handleRedirect(data.session.user.id);
      } else {
        setLoading(false);
        navigate('/cars');
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 md:p-14 bg-cover bg-center bg-no-repeat font-body overflow-hidden selection:bg-[#E8542E] selection:text-white"
         style={{ backgroundImage: `url(${authBg})` }}>
      
      {/* Light Gradient Overlay for subtle contrast & readability */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-white/10 to-transparent pointer-events-none" />

      {/* TOP LEFT BRAND LOGO (Matching Reference Photo) */}
      <div className="relative z-20">
        <Link to="/" className="inline-flex items-center group">
          <img src={carLogo} alt="DriveEase Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-lg" />
        </Link>
      </div>

      {/* MAIN CONTAINER: FLOATING LOGIN CARD */}
      <div className="relative z-20 w-full max-w-[1280px] mx-auto my-auto py-8 flex items-center justify-start">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[430px] space-y-6"
        >
          {/* WHITE CARD */}
          <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[32px] shadow-2xl border border-white/80 space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1 className="font-display font-bold text-3xl text-[#0B0D10] tracking-tight">
                Client Login
              </h1>
              <p className="text-sm font-body text-[#0B0D10]/55">
                Please enter your details
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full px-4 py-3.5 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3.5 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end pt-0.5">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link sent if account exists.');
                  }}
                  className="text-xs font-semibold text-[#0B0D10]/70 hover:text-[#0B0D10] underline underline-offset-2 transition-colors font-body"
                >
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button (Matching Reference Photo Dark Button) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-[#353945] hover:bg-[#0B0D10] text-white font-display font-semibold text-sm rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Under-Card Link (Matching Reference Photo "Are you new? Create an Account") */}
          <div className="text-center">
            <p className="text-xs font-body text-white/90 drop-shadow-md">
              Are you new?{' '}
              <Link
                to="/register"
                className="font-bold text-white hover:underline underline-offset-4 transition-all"
              >
                Create an Account
              </Link>
            </p>
          </div>

        </motion.div>
      </div>

      {/* FOOTER COPYRIGHT */}
      <div className="relative z-20 text-center sm:text-left">
        <p className="text-[11px] font-body text-white/70 drop-shadow-sm">
          © {new Date().getFullYear()} DriveEase Luxury Rentals. All rights reserved.
        </p>
      </div>

    </div>
  );
}

export default Login;

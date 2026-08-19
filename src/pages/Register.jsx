import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import carLogo from '../assets/logo.webp';
import authBg from '../assets/auth_bg.png';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [agencySlug, setAgencySlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isRetryMode, setIsRetryMode] = useState(false);
  
  const navigate = useNavigate();

  // Auto-generate slug
  useEffect(() => {
    if (!slugEdited && !isRetryMode) {
      setAgencySlug(
        agencyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  }, [agencyName, slugEdited, isRetryMode]);

  const handleSlugChange = (e) => {
    setSlugEdited(true);
    setAgencySlug(e.target.value);
  };

  const registerAgency = async (token) => {
    try {
      const res = await fetch(`${API_URL}/agencies/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agency_name: agencyName,
          agency_slug: agencySlug
        })
      });

      if (res.ok) {
        navigate('/admin');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to register agency.');
        setIsRetryMode(true);
      }
    } catch (err) {
      setError('Network error connecting to backend.');
      setIsRetryMode(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (isRetryMode) {
      // Just retry the agency registration
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session lost. Please log in again.');
        setLoading(false);
        return;
      }
      await registerAgency(session.access_token);
      setLoading(false);
      return;
    }

    // Normal sign up
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccessMsg("Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    await registerAgency(data.session.access_token);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 md:p-14 bg-cover bg-center bg-no-repeat font-body overflow-hidden selection:bg-[#E8542E] selection:text-white"
         style={{ backgroundImage: `url(${authBg})` }}>
      
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-white/10 to-transparent pointer-events-none" />

      <div className="relative z-20">
        <Link to="/" className="inline-flex items-center group">
          <img src={carLogo} alt="Drivo Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-lg" />
        </Link>
      </div>

      <div className="relative z-20 w-full max-w-[1280px] mx-auto my-auto py-8 flex items-center justify-start">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[460px] space-y-6"
        >
          <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-[32px] shadow-2xl border border-white/80 space-y-6">
            
            <div className="text-center space-y-1.5">
              <h1 className="font-display font-bold text-3xl text-[#0B0D10] tracking-tight">
                {isRetryMode ? 'Complete Setup' : 'Agency Registration'}
              </h1>
              <p className="text-sm font-body text-[#0B0D10]/55">
                {isRetryMode ? 'Please provide a unique agency slug' : 'Create your agency account'}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-xl text-center"
              >
                {successMsg}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isRetryMode && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      className="w-full px-4 py-3 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">Agency Name</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Rentals"
                  className="w-full px-4 py-3 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#0B0D10]/70 font-body">Agency Slug (URL)</label>
                <input
                  type="text"
                  required
                  placeholder="acme-rentals"
                  className="w-full px-4 py-3 border border-[#D8D4C8] rounded-xl text-sm font-body text-[#0B0D10] bg-white focus:outline-none focus:border-[#0B0D10] focus:ring-1 focus:ring-[#0B0D10] transition-all placeholder:text-[#0B0D10]/30 shadow-sm"
                  value={agencySlug}
                  onChange={handleSlugChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !!successMsg}
                className="w-full py-3.5 px-6 bg-[#353945] hover:bg-[#0B0D10] text-white font-display font-semibold text-sm rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 mt-4"
              >
                {loading ? 'Processing...' : (isRetryMode ? 'Retry Registration' : 'Register Agency')}
              </button>
            </form>
          </div>

          {!isRetryMode && (
            <div className="text-center">
              <p className="text-xs font-body text-white/90 drop-shadow-md">
                Already have an agency?{' '}
                <Link
                  to="/login"
                  className="font-bold text-white hover:underline underline-offset-4 transition-all"
                >
                  Log In
                </Link>
              </p>
            </div>
          )}

        </motion.div>
      </div>

      <div className="relative z-20 text-center sm:text-left">
        <p className="text-[11px] font-body text-white/70 drop-shadow-sm">
          © {new Date().getFullYear()} Drivo Luxury Rentals. All rights reserved.
        </p>
      </div>

    </div>
  );
}

export default Register;

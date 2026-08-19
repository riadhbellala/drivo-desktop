import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabaseClient';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

function Banner({ type, message, onDismiss }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium mb-6 ${
        isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onDismiss} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
    </motion.div>
  );
}

function SettingsField({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-bold text-[#0B0D10]/70">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function AdminSettings() {
  const [agency, setAgency]         = useState(null);
  const [session, setSession]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toggling, setToggling]     = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [banner, setBanner]         = useState({ type: '', message: '' });

  // Editable fields
  const [agencyName, setAgencyName]   = useState('');
  const [agencySlug, setAgencySlug]   = useState('');
  const [fullName, setFullName]       = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    let loaded = false;
    const init = async (sess) => {
      if (loaded) return;
      loaded = true;
      setSession(sess);
      if (!sess) { setLoading(false); setFetchError('No active session.'); return; }

      try {
        setLoading(true);
        const [agRes, userRes] = await Promise.all([
          fetch(`${API_URL}/agencies/me`, { headers: { Authorization: `Bearer ${sess.access_token}` } }),
          supabase.auth.getUser(),
        ]);

        if (agRes.ok) {
          const data = await agRes.json();
          setAgency(data);
          setAgencyName(data.name || '');
          setAgencySlug(data.slug || '');
        } else {
          const err = await agRes.json();
          setFetchError(err.error || 'Failed to fetch agency settings.');
        }

        const profile = userRes.data?.user;
        if (profile) {
          setFullName(profile.user_metadata?.full_name || '');
        }
      } catch {
        setFetchError('Network error connecting to backend.');
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => init(sess));
    return () => subscription.unsubscribe();
  }, []);

  // Auto-suggest slug from agency name while untouched
  useEffect(() => {
    if (!slugTouched) {
      setAgencySlug(agencyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    }
  }, [agencyName, slugTouched]);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  const handleSaveAgency = async (e) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/agencies/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: agencyName, slug: agencySlug }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgency(data);
        showBanner('success', 'Agency information updated successfully.');
      } else {
        showBanner('error', data.error || 'Failed to update agency information.');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (error) throw error;
      showBanner('success', 'Profile name updated successfully.');
    } catch (err) {
      showBanner('error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWebsite = async () => {
    if (!session || !agency) return;
    setToggling(true);
    const newVal = !agency.website_enabled;
    try {
      const res = await fetch(`${API_URL}/agencies/website`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ enabled: newVal }),
      });
      const data = await res.json();
      if (res.ok) {
        setAgency(data);
        showBanner('success', `Marketplace visibility ${newVal ? 'enabled' : 'disabled'}.`);
      } else {
        showBanner('error', data.error || 'Failed to update visibility.');
      }
    } catch {
      showBanner('error', 'Network error. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1A6340]/30 focus:border-[#1A6340] transition-colors";

  return (
    <AdminLayout
      title="Settings"
      subtitle="Manage your agency profile and preferences."
    >
      <div className="max-w-[800px] w-full mt-2 space-y-6">
        <Banner type={banner.type} message={banner.message} onDismiss={() => setBanner({ type: '', message: '' })} />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-[#1A6340] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{fetchError}</div>
        ) : (
          <>
            {/* ── Profile Section ── */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
              <h2 className="font-display font-medium text-[18px] text-[#0B0D10] mb-6">Personal Profile</h2>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <SettingsField label="Full Name" hint="This is your display name inside the app.">
                  <input
                    type="text"
                    className={inputClass}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </SettingsField>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1A6340] text-white rounded-full text-[13px] font-bold hover:bg-[#134D31] transition-colors disabled:opacity-60"
                  >
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Agency Section ── */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
              <h2 className="font-display font-medium text-[18px] text-[#0B0D10] mb-6">Agency Information</h2>
              <form onSubmit={handleSaveAgency} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SettingsField label="Agency Name" hint="The public name of your rental business.">
                    <input
                      type="text"
                      className={inputClass}
                      value={agencyName}
                      onChange={e => setAgencyName(e.target.value)}
                      placeholder="My Agency"
                      required
                    />
                  </SettingsField>

                  <SettingsField label="URL Slug" hint="Your unique marketplace URL identifier.">
                    <div className="flex items-center w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#1A6340]/30 focus-within:border-[#1A6340] transition-colors">
                      <span className="text-slate-400 text-sm shrink-0">drivo.com/</span>
                      <input
                        type="text"
                        className="flex-1 text-sm text-slate-800 font-medium focus:outline-none bg-transparent"
                        value={agencySlug}
                        onChange={e => { setAgencySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugTouched(true); }}
                        placeholder="my-agency"
                        required
                      />
                    </div>
                  </SettingsField>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1A6340] text-white rounded-full text-[13px] font-bold hover:bg-[#134D31] transition-colors disabled:opacity-60"
                  >
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Save Agency'}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Marketplace Toggle ── */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
              <h2 className="font-display font-medium text-[18px] text-[#0B0D10] mb-2">Marketplace Visibility</h2>
              <p className="text-[13px] text-slate-500 mb-6">
                When enabled, your vehicles are visible on the public Drivo marketplace and customers can make bookings.
              </p>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[14px] font-bold text-[#0B0D10]">
                    {agency?.website_enabled ? 'Your agency is live on Drivo' : 'Your agency is currently hidden'}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {agency?.website_enabled ? 'Customers can browse and book your vehicles.' : 'Your vehicles are not visible to the public.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleWebsite}
                  disabled={toggling}
                  className={`relative flex items-center gap-3 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all disabled:opacity-60 ${
                    agency?.website_enabled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-[#1A6340] text-white hover:bg-[#134D31]'
                  }`}
                >
                  <div className={`w-8 h-4 rounded-full transition-colors ${agency?.website_enabled ? 'bg-red-400' : 'bg-emerald-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full mt-0.5 transition-transform ${agency?.website_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  {toggling ? 'Updating…' : agency?.website_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;

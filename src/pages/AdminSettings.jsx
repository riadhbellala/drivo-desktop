import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabaseClient';
import { API_URL } from '../config';

function AdminSettings() {
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let loaded = false;
    const fetchAgency = async (session) => {
      if (loaded) return;
      loaded = true;
      try {
        setLoading(true);
        if (!session) {
          setError('No session active.');
          return;
        }

        const res = await fetch(`${API_URL}/agencies/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setAgency(data);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to fetch agency settings.');
        }
      } catch (err) {
        setError('Network error connecting to backend.');
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchAgency(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AdminLayout
      title="Settings"
      subtitle="Manage your agency profile and preferences."
    >
      <div className="max-w-[800px] w-full mt-2 space-y-6">
        <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
          <h2 className="font-display font-medium text-[18px] text-[#0B0D10] mb-6">Agency Information</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#1A6340] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
              {error}
            </div>
          ) : agency ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Agency Name */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-[#0B0D10]/70">Agency Name</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium">
                    {agency.name}
                  </div>
                  <p className="text-[11px] text-slate-400">The public name of your rental business.</p>
                </div>

                {/* Agency Slug */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-[#0B0D10]/70">URL Slug</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium flex items-center">
                    <span className="text-slate-400 mr-1">drivo.com/</span>
                    <span>{agency.slug}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Your unique marketplace URL identifier.</p>
                </div>
              </div>

              {/* Website Enabled Toggle (Read-only representation) */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-[#0B0D10]">Marketplace Visibility</h3>
                  <p className="text-[12px] text-slate-500 mt-1">
                    When enabled, your vehicles are visible on the public Drivo marketplace.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[12px] font-bold ${agency.website_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {agency.website_enabled ? 'Active' : 'Hidden'}
                  </span>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${agency.website_enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${agency.website_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <p className="text-slate-500">No agency data found.</p>
          )}
        </div>

        <p className="text-[12px] text-slate-400 font-medium text-center">
          Additional settings and preferences will be available in future updates.
        </p>
      </div>
    </AdminLayout>
  );
}

export default AdminSettings;

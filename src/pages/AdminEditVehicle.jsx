import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AdminLayout } from '../components/AdminLayout';
import { UploadCloud, CheckCircle2, AlertCircle, Save, Car, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';

const initialForm = {
  brand: '',
  model: '',
  year: '',
  registration_number: '',
  category: '',
  transmission: 'automatic',
  fuel_type: 'petrol',
  seats: '',
  daily_price: '',
  status: 'available',
  description: '',
};

const InputField = ({ label, name, type = 'text', required = true, value, onChange, ...props }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-body">
      {label} {required && <span className="text-[#E8542E]">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#5B4FE9] focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none"
      {...props}
    />
  </div>
);

const SelectField = ({ label, name, options, required = true, value, onChange }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-body">
      {label} {required && <span className="text-[#E8542E]">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#5B4FE9] focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all text-sm font-medium text-slate-700 outline-none appearance-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

function AdminEditVehicle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/vehicles/${id}`);
        if (!res.ok) throw new Error('Failed to fetch vehicle details');
        const data = await res.json();
        
        setFormData({
          brand: data.brand || '',
          model: data.model || '',
          year: data.year || '',
          registration_number: data.registration_number || '',
          category: data.category || '',
          transmission: data.transmission || 'automatic',
          fuel_type: data.fuel_type || 'petrol',
          seats: data.seats || '',
          daily_price: data.daily_price || '',
          status: data.status || 'available',
          description: data.description || '',
        });

        if (data.images && Array.isArray(data.images)) {
          setExistingImages(data.images);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError(null);
    setUploadStatus('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in first.');
      }

      const payload = {
        ...formData,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
        seats: formData.seats ? parseInt(formData.seats, 10) : undefined,
        daily_price: formData.daily_price ? parseFloat(formData.daily_price) : undefined,
      };

      // 1. Update vehicle details
      const response = await fetch(`${API_URL}/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resData.error || `Error ${response.status}: ${response.statusText}`);
      }

      // 2. Upload new images if selected
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          setUploadStatus(`Uploading image ${i + 1} of ${imageFiles.length}...`);

          const storagePath = `${id}/${Date.now()}_${file.name}`;
          const { data: storageData, error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(storagePath, file, { upsert: true });

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Register in backend
          const imgResponse = await fetch(`${API_URL}/vehicles/${id}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              storage_path: storageData.path,
              sort_order: existingImages.length + i,
            }),
          });

          if (!imgResponse.ok) {
            const imgResData = await imgResponse.json().catch(() => ({}));
            throw new Error(imgResData.error || `Failed to record image metadata for ${file.name}`);
          }
        }
      }

      setMessage('Vehicle updated successfully!');
      setTimeout(() => navigate('/admin/vehicles'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '/images/hero_sports.png';
    return supabase.storage.from('vehicle-images').getPublicUrl(path).data.publicUrl;
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Vehicle" subtitle="Loading vehicle information...">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-[#5B4FE9] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-400 font-body">Fetching details...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Edit ${formData.brand} ${formData.model}`.trim() || 'Edit Vehicle'}
      subtitle="Update specifications, status, pricing, or media for this car"
      action={
        <button
          onClick={() => navigate('/admin/vehicles')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Fleet
        </button>
      }
    >
      <div className="max-w-4xl">
        
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700">
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold">{message}</p>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Main Info Box */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-lg text-[#0B0D10]">Vehicle Details</h2>
                <p className="text-[12px] text-slate-400 font-body mt-1">Modify specs, status, and pricing.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#5B4FE9]/10 text-[#5B4FE9] flex items-center justify-center">
                <Car size={20} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField label="Brand" name="brand" placeholder="e.g. Porsche" value={formData.brand} onChange={handleChange} />
              <InputField label="Model" name="model" placeholder="e.g. 911 Carrera" value={formData.model} onChange={handleChange} />
              <InputField label="Year" name="year" type="number" placeholder="e.g. 2024" value={formData.year} onChange={handleChange} />
              <InputField label="Category" name="category" placeholder="e.g. Sports" value={formData.category} onChange={handleChange} />
              
              <SelectField 
                label="Transmission" 
                name="transmission" 
                value={formData.transmission}
                onChange={handleChange}
                options={[
                  { value: 'automatic', label: 'Automatic' },
                  { value: 'manual', label: 'Manual' }
                ]} 
              />
              
              <SelectField 
                label="Fuel Type" 
                name="fuel_type" 
                value={formData.fuel_type}
                onChange={handleChange}
                options={[
                  { value: 'petrol', label: 'Petrol' },
                  { value: 'diesel', label: 'Diesel' },
                  { value: 'electric', label: 'Electric' },
                  { value: 'hybrid', label: 'Hybrid' }
                ]} 
              />

              <InputField label="Seats" name="seats" type="number" placeholder="e.g. 2" value={formData.seats} onChange={handleChange} />
              <InputField label="Registration Number" name="registration_number" placeholder="e.g. DXB-12345" value={formData.registration_number} onChange={handleChange} />

              <SelectField 
                label="Status" 
                name="status" 
                value={formData.status}
                onChange={handleChange}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'rented', label: 'Rented' },
                  { value: 'maintenance', label: 'Maintenance' }
                ]} 
              />

              <InputField label="Daily Price (USD)" name="daily_price" type="number" step="0.01" placeholder="e.g. 450.00" value={formData.daily_price} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-body">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#5B4FE9] focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none resize-none"
                placeholder="Briefly describe the vehicle's features..."
              />
            </div>
          </div>

          {/* Media Box */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="font-display font-bold text-lg text-[#0B0D10]">Vehicle Gallery</h2>
              <p className="text-[12px] text-slate-400 font-body mt-1">Current images and upload options.</p>
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 font-body">Current Images</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {existingImages.map((img, index) => (
                    <div key={img.id || index} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                      <img
                        src={getImageUrl(img.storage_path)}
                        alt={`Vehicle preview ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                        Image {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drag and Drop area for new images */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-body">Add More Images</p>
              <div className="relative border-2 border-dashed border-slate-200 rounded-[20px] bg-slate-50 hover:bg-slate-100 hover:border-[#5B4FE9]/50 transition-colors group p-8 flex flex-col items-center justify-center text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform text-[#5B4FE9]">
                  <UploadCloud size={22} />
                </div>
                <h3 className="font-bold text-slate-700 text-sm mb-1">Click or drag images to upload</h3>
                <p className="text-xs text-slate-400 font-body">PNG, JPG up to 10MB each</p>
                
                {imageFiles.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 w-full">
                    <p className="text-xs font-bold text-[#5B4FE9]">{imageFiles.length} new image(s) selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/vehicles')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white bg-[#5B4FE9] hover:bg-[#4B3FD9] hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {uploadStatus || 'Saving Changes...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default AdminEditVehicle;

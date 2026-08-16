import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { UploadCloud, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { motion } from 'framer-motion';

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

function AdminAddVehicle() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

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
    setLoading(true);
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

      // Step 1: Create vehicle row
      const response = await fetch('http://localhost:4000/vehicles', {
        method: 'POST',
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

      const vehicleId = resData.id;

      // Step 2: Upload images if any
      if (imageFiles.length > 0 && vehicleId) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          setUploadStatus(`Uploading image ${i + 1} of ${imageFiles.length}...`);

          const storagePath = `${vehicleId}/${file.name}`;
          const { data: storageData, error: uploadError } = await supabase.storage
            .from('vehicle-images')
            .upload(storagePath, file, { upsert: true });

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }

          // Step 3: Register image in backend API
          const imgResponse = await fetch(`http://localhost:4000/vehicles/${vehicleId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              storage_path: storageData.path,
              sort_order: i,
            }),
          });

          if (!imgResponse.ok) {
            const imgResData = await imgResponse.json().catch(() => ({}));
            throw new Error(imgResData.error || `Failed to record image metadata for ${file.name}`);
          }
        }
      }

      setMessage('Vehicle and images added successfully!');
      setTimeout(() => navigate('/admin/vehicles'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  return (
    <AdminLayout title="Add Vehicle" subtitle="Expand your fleet with a new premium car">
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
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="font-display font-bold text-lg text-[#0B0D10]">Vehicle Details</h2>
              <p className="text-[12px] text-slate-400 font-body mt-1">Enter the primary specifications and information.</p>
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
            </div>

            <div className="pt-2">
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
              <h2 className="font-display font-bold text-lg text-[#0B0D10]">Media</h2>
              <p className="text-[12px] text-slate-400 font-body mt-1">Upload high-quality images of the car.</p>
            </div>

            <div className="relative border-2 border-dashed border-slate-200 rounded-[20px] bg-slate-50 hover:bg-slate-100 hover:border-[#5B4FE9]/50 transition-colors group p-10 flex flex-col items-center justify-center text-center cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform text-[#5B4FE9]">
                <UploadCloud size={24} />
              </div>
              <h3 className="font-bold text-slate-700 text-sm mb-1">Click or drag images to upload</h3>
              <p className="text-xs text-slate-400 font-body">PNG, JPG up to 10MB each</p>
              
              {imageFiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 w-full">
                  <p className="text-xs font-bold text-[#5B4FE9]">{imageFiles.length} file(s) selected</p>
                </div>
              )}
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
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white bg-[#5B4FE9] hover:bg-[#4B3FD9] hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {uploadStatus || 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Vehicle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default AdminAddVehicle;

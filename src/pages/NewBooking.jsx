import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { AdminLayout, StatusBadge } from '../components/AdminLayout';
import { motion } from 'framer-motion';
import {
  Car, Calendar, User, UserPlus, Search, CheckCircle2,
  AlertCircle, ArrowLeft, DollarSign,
} from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];

function calcDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function customerPayload(customer) {
  if (!customer) return null;
  if (customer.id.startsWith('user_')) {
    return { customer_id: customer.id.replace('user_', '') };
  }
  if (customer.id.startsWith('walkin_')) {
    return { walkin_name: customer.full_name, walkin_phone: customer.phone };
  }
  return null;
}

const InputField = ({ label, required = true, ...props }) => (
  <div>
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-body">
      {label} {required && <span className="text-[#E8542E]">*</span>}
    </label>
    <input
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#5B4FE9] focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none"
      {...props}
    />
  </div>
);

function NewBooking() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [customerMode, setCustomerMode] = useState('existing');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = { Authorization: `Bearer ${session.access_token}` };
        const [vehiclesRes, customersRes] = await Promise.all([
          fetch('http://localhost:4000/vehicles/mine', { headers }),
          fetch('http://localhost:4000/customers', { headers }),
        ]);

        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
        if (customersRes.ok) setCustomers(await customersRes.json());
      } catch (e) {
        console.error(e);
        setError('Failed to load form data. Please refresh and try again.');
      } finally {
        setVehiclesLoading(false);
        setCustomersLoading(false);
      }
    };
    load();
  }, []);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

  const filteredVehicles = useMemo(() =>
    vehicles.filter(v =>
      `${v.brand} ${v.model} ${v.daily_price}`.toLowerCase().includes(vehicleSearch.toLowerCase())
    ),
    [vehicles, vehicleSearch]
  );

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      `${c.full_name} ${c.phone}`.toLowerCase().includes(customerSearch.toLowerCase())
    ),
    [customers, customerSearch]
  );

  const days = calcDays(startDate, endDate);
  const estimatedTotal = selectedVehicle && days > 0
    ? Number(selectedVehicle.daily_price) * days
    : 0;

  const endDateMin = startDate
    ? (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })()
    : todayStr();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedVehicleId) {
      setError('Please select a vehicle.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }
    if (days < 1) {
      setError('End date must be after start date.');
      return;
    }

    let payload = { vehicle_id: selectedVehicleId, start_date: startDate, end_date: endDate };

    if (customerMode === 'existing') {
      if (!selectedCustomer) {
        setError('Please select a customer from the list.');
        return;
      }
      const customerFields = customerPayload(selectedCustomer);
      if (!customerFields) {
        setError('Invalid customer selection.');
        return;
      }
      payload = { ...payload, ...customerFields };
    } else {
      if (!walkinName.trim()) {
        setError('Walk-in name is required.');
        return;
      }
      payload = { ...payload, walkin_name: walkinName.trim(), walkin_phone: walkinPhone.trim() };
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated.');

      const res = await fetch('http://localhost:4000/bookings/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        setSuccess(`Booking created successfully! Total: $${Number(data.total_price || 0).toLocaleString()}`);
        setTimeout(() => navigate('/admin/bookings'), 2500);
        return;
      }

      if (res.status === 409) {
        setError(data.error || 'This vehicle is already booked for the selected dates.');
        return;
      }

      setError(data.error || 'Something went wrong. Please try again.');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="New Booking" subtitle="Create a reservation for a customer">
      <div className="max-w-3xl">
        <Link
          to="/admin/bookings"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-[#5B4FE9] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Bookings
        </Link>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700"
          >
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600"
          >
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Vehicle selection */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-[#5B4FE9]" />
                <h2 className="font-display font-bold text-lg text-[#0B0D10]">Vehicle</h2>
              </div>
              <p className="text-[12px] text-slate-400 font-body mt-1">Select a vehicle from your fleet.</p>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={vehicleSearch}
                onChange={e => setVehicleSearch(e.target.value)}
                placeholder="Search by brand, model, price…"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 focus:border-[#5B4FE9] transition-all"
              />
            </div>

            {vehiclesLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No vehicles found.</p>
            ) : (
              <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                {filteredVehicles.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                      selectedVehicleId === v.id
                        ? 'border-[#5B4FE9] bg-[#F0EDFF] ring-2 ring-[#5B4FE9]/20'
                        : 'border-slate-200 bg-slate-50 hover:border-[#5B4FE9]/40 hover:bg-white'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-[#0B0D10] text-sm">
                        {v.brand} {v.model}
                      </p>
                      <p className="text-[12px] text-slate-400 font-data mt-0.5">
                        ${Number(v.daily_price).toLocaleString()} / day
                      </p>
                    </div>
                    <StatusBadge status={v.status} />
                  </button>
                ))}
              </div>
            )}

            {selectedVehicle && (
              <div className="flex items-center gap-3 p-4 bg-[#F8F7FF] rounded-xl border border-[#5B4FE9]/20">
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Selected</p>
                  <p className="font-display font-bold text-[#0B0D10]">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </p>
                </div>
                <StatusBadge status={selectedVehicle.status} />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#5B4FE9]" />
                <h2 className="font-display font-bold text-lg text-[#0B0D10]">Dates</h2>
              </div>
              <p className="text-[12px] text-slate-400 font-body mt-1">Choose the rental period.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                label="Start Date"
                type="date"
                value={startDate}
                min={todayStr()}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value >= endDate) setEndDate('');
                }}
                required
              />
              <InputField
                label="End Date"
                type="date"
                value={endDate}
                min={endDateMin}
                onChange={e => setEndDate(e.target.value)}
                disabled={!startDate}
                required
              />
            </div>

            {days > 0 && selectedVehicle && (
              <div className="flex items-center justify-between p-4 bg-[#F8F7FF] rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <DollarSign size={16} className="text-[#5B4FE9]" />
                  <span className="text-sm font-body">
                    {days} day{days !== 1 ? 's' : ''} × ${Number(selectedVehicle.daily_price).toLocaleString()}/day
                  </span>
                </div>
                <p className="font-display font-bold text-xl text-[#0B0D10]">
                  ${estimatedTotal.toLocaleString()}
                </p>
              </div>
            )}
            {startDate && endDate && days < 1 && (
              <p className="text-xs text-red-500 font-medium">End date must be after start date.</p>
            )}
            <p className="text-[11px] text-slate-400 font-body">Estimated total — final price is calculated by the server on submit.</p>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <User size={18} className="text-[#5B4FE9]" />
                <h2 className="font-display font-bold text-lg text-[#0B0D10]">Customer</h2>
              </div>
              <p className="text-[12px] text-slate-400 font-body mt-1">Identify the customer for this booking.</p>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setCustomerMode('existing'); setWalkinName(''); setWalkinPhone(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                  customerMode === 'existing'
                    ? 'bg-white text-[#0B0D10] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User size={14} /> Existing Customer
              </button>
              <button
                type="button"
                onClick={() => { setCustomerMode('walkin'); setSelectedCustomer(null); setCustomerSearch(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                  customerMode === 'walkin'
                    ? 'bg-white text-[#0B0D10] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus size={14} /> New / Walk-in
              </button>
            </div>

            {customerMode === 'existing' ? (
              <>
                <div className="relative">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 focus:border-[#5B4FE9] transition-all"
                  />
                </div>

                {customersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No customers found.</p>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                          selectedCustomer?.id === c.id
                            ? 'border-[#5B4FE9] bg-[#F0EDFF] ring-2 ring-[#5B4FE9]/20'
                            : 'border-slate-200 bg-slate-50 hover:border-[#5B4FE9]/40 hover:bg-white'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-[#0B0D10] text-sm">{c.full_name}</p>
                          <p className="text-[12px] text-slate-400 font-data">{c.phone}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {c.id.startsWith('user_') ? 'Registered' : 'Walk-in'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-4 bg-[#F8F7FF] rounded-xl border border-[#5B4FE9]/20">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Selected</p>
                    <p className="font-display font-bold text-[#0B0D10]">{selectedCustomer.full_name}</p>
                    <p className="text-[12px] text-slate-400 font-data mt-0.5">{selectedCustomer.phone}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField
                  label="Name"
                  value={walkinName}
                  onChange={e => setWalkinName(e.target.value)}
                  placeholder="Customer full name"
                  required
                />
                <InputField
                  label="Phone"
                  value={walkinPhone}
                  onChange={e => setWalkinPhone(e.target.value)}
                  placeholder="Phone number"
                  required={false}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/bookings')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!success}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white bg-[#5B4FE9] hover:bg-[#4B3FD9] hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Create Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default NewBooking;

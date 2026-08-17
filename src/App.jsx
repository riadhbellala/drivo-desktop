import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';

import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import AdminVehiclesList from './pages/AdminVehiclesList';
import AdminAddVehicle from './pages/AdminAddVehicle';
import AdminEditVehicle from './pages/AdminEditVehicle';
import AdminBookings from './pages/AdminBookings';
import NewBooking from './pages/NewBooking';
import AdminCustomers from './pages/AdminCustomers';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: login only */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* All admin routes require auth + agency role */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/vehicles" element={<AdminVehiclesList />} />
            <Route path="/admin/vehicles/new" element={<AdminAddVehicle />} />
            <Route path="/admin/vehicles/:id/edit" element={<AdminEditVehicle />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/bookings/new" element={<NewBooking />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
          </Route>
        </Route>

        {/* Default: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

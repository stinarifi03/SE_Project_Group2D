import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/citizen/Login'
import Register from './pages/citizen/Register'
import SubmitReport from './pages/citizen/SubmitReport'
import MyReports from './pages/citizen/MyReports'
import Dashboard from './pages/staff/Dashboard'
import AdminPanel from './pages/admin/AdminPanel'
import PublicTrack from './pages/citizen/PublicTrack'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/track" element={<PublicTrack />} />

        <Route path="/submit" element={
          <ProtectedRoute allowedRoles={['citizen', 'staff', 'admin']}>
            <SubmitReport />
          </ProtectedRoute>
        } />
        <Route path="/my-reports" element={
          <ProtectedRoute allowedRoles={['citizen', 'staff', 'admin']}>
            <MyReports />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['staff', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
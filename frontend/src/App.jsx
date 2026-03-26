import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<div>Login Page</div>} />
        <Route path="/register" element={<div>Register Page</div>} />
        <Route path="/track" element={<div>Public Tracking</div>} />

        {/* Citizen routes */}
        <Route path="/submit" element={<div>Submit Report</div>} />
        <Route path="/my-reports" element={<div>My Reports</div>} />

        {/* Staff routes */}
        <Route path="/dashboard" element={<div>Staff Dashboard</div>} />

        {/* Admin routes */}
        <Route path="/admin" element={<div>Admin Panel</div>} />
      </Routes>
    </BrowserRouter>
  )
}

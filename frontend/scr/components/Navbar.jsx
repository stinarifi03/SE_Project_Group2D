import { Link, useNavigate } from 'react-router-dom'

export default function Navbar({ role }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  return (
    <nav style={{ padding: '10px', background: '#333', color: '#fff' }}>
      <Link to="/" style={{ color: '#fff', marginRight: '15px' }}>Home</Link>

      {role === 'citizen' && (
        <>
          <Link to="/submit" style={{ color: '#fff', marginRight: '15px' }}>Submit Report</Link>
          <Link to="/my-reports" style={{ color: '#fff', marginRight: '15px' }}>My Reports</Link>
        </>
      )}

      {role === 'staff' && (
        <Link to="/dashboard" style={{ color: '#fff', marginRight: '15px' }}>Dashboard</Link>
      )}

      {role === 'admin' && (
        <Link to="/admin" style={{ color: '#fff', marginRight: '15px' }}>Admin Panel</Link>
      )}

      <button onClick={handleLogout} style={{ float: 'right', cursor: 'pointer' }}>
        Logout
      </button>
    </nav>
  )
}
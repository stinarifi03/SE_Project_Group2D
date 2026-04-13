import { useEffect, useMemo, useState } from 'react'
import {
  getStats,
  createStaff,
  getAllStaff,
  getCategories,
  addCategory,
  deleteCategory,
  getUsers,
  disableUser,
  resetUserPassword,
  getTrends,
  exportCsv,
  exportPdf,
  getErrorMessage,
  logout,
} from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/useToast'

export default function AdminPanel() {
  const [stats, setStats] = useState(null)
  const [staff, setStaff] = useState([])
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [trends, setTrends] = useState([])
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', department: '', jurisdiction: '' })
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [exportMonth, setExportMonth] = useState('')
  const navigate = useNavigate()
  const name = localStorage.getItem('name')
  const { showToast } = useToast()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, staffRes, catsRes, usersRes, trendsRes] = await Promise.all([
        getStats(),
        getAllStaff(),
        getCategories(),
        getUsers(),
        getTrends(days),
      ])
      setStats(statsRes.data)
      setStaff(staffRes.data)
      setCategories(catsRes.data)
      setUsers(usersRes.data)
      setTrends(trendsRes.data)
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load admin data.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const trendBars = useMemo(() => {
    const grouped = {}
    trends.forEach((t) => {
      grouped[t.day] = (grouped[t.day] || 0) + t.count
    })
    const entries = Object.entries(grouped)
    const maxVal = Math.max(...entries.map(([, v]) => v), 1)
    return entries.slice(-12).map(([day, count]) => ({ day, count, height: `${(count / maxVal) * 100}%` }))
  }, [trends])

  const handleAddStaff = async (e) => {
    e.preventDefault()
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      showToast('Name, email and password are required', 'error')
      return
    }
    try {
      await createStaff(newStaff)
      showToast('Staff member added', 'success')
      setNewStaff({ name: '', email: '', password: '', department: '', jurisdiction: '' })
      await fetchAll()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to add staff'), 'error')
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) {
      showToast('Category name is required', 'error')
      return
    }
    try {
      await addCategory(newCategory)
      setNewCategory('')
      await fetchAll()
      showToast('Category added', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to add category'), 'error')
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id)
      await fetchAll()
      showToast('Category deleted', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete category'), 'error')
    }
  }

  const handleDisableUser = async (id) => {
    try {
      await disableUser(id)
      await fetchAll()
      showToast('User disabled', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to disable user'), 'error')
    }
  }

  const handleResetPassword = async (id) => {
    try {
      const res = await resetUserPassword(id)
      showToast(`Temporary password: ${res.data.temporary_password}`, 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to reset password'), 'error')
    }
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = async () => {
    try {
      const res = await exportCsv(exportMonth || undefined)
      downloadBlob(res.data, `reports_${exportMonth || 'all'}.csv`)
      showToast('CSV exported', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'CSV export failed'), 'error')
    }
  }

  const handleExportPdf = async () => {
    try {
      const res = await exportPdf(exportMonth || undefined)
      downloadBlob(res.data, `reports_${exportMonth || 'all'}.pdf`)
      showToast('PDF exported', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'PDF export failed'), 'error')
    }
  }

  const statCards = stats ? [
    { label: 'Total Reports', value: stats.total_reports },
    { label: 'Submitted', value: stats.submitted },
    { label: 'Under Review', value: stats.under_review },
    { label: 'In Progress', value: stats.in_progress },
    { label: 'Resolved', value: stats.resolved },
    { label: 'Citizens', value: stats.total_citizens },
    { label: 'Staff', value: stats.total_staff },
  ] : []

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-badge">👨‍💼</span>
            <div>
              <div className="brand-title">Admin Panel</div>
              <p className="brand-subtitle">Welcome, {name || 'Administrator'}</p>
            </div>
          </div>

          <div className="actions">
            <button onClick={() => navigate('/dashboard')} className="btn btn-soft">Staff Dashboard</button>
            <button
              onClick={async () => {
                await logout()
                navigate('/')
              }}
              className="btn btn-danger"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <h2 className="title" style={{ fontSize: '1.45rem' }}>System Statistics</h2>
          {loading ? (
            <p className="muted" style={{ marginTop: '.55rem' }}>Loading stats...</p>
          ) : (
            <div className="stats-grid admin" style={{ marginTop: '.9rem', marginBottom: '1rem' }}>
              {statCards.map((card) => (
                <div key={card.label} className="stat-card">
                  <div className="stat-value" style={{ color: '#0f5de8' }}>{card.value}</div>
                  <div className="muted" style={{ fontSize: '.82rem' }}>{card.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <div className="row" style={{ marginBottom: '.6rem' }}>
              <h3 style={{ margin: 0 }}>Trend Analytics</h3>
              <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: '130px' }}>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '.45rem', height: '170px', alignItems: 'end' }}>
              {trendBars.map((b) => (
                <div key={b.day} style={{ display: 'grid', justifyItems: 'center', gap: '.3rem' }}>
                  <div style={{ width: '100%', height: b.height, borderRadius: '.45rem', background: 'linear-gradient(180deg, #00a2ff, #1060ff)' }} />
                  <span className="muted" style={{ fontSize: '.66rem' }}>{b.day.slice(5)}</span>
                </div>
              ))}
              {trendBars.length === 0 && <p className="muted">No trend data available.</p>}
            </div>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Manage Staff Accounts</h3>
            <form onSubmit={handleAddStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto', gap: '.55rem' }}>
              <input type="text" placeholder="Full Name" value={newStaff.name} className="input" onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
              <input type="email" placeholder="Email" value={newStaff.email} className="input" onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
              <input type="password" placeholder="Password" value={newStaff.password} className="input" onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
              <input type="text" placeholder="Department" value={newStaff.department} className="input" onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })} />
              <input type="text" placeholder="Jurisdiction (comma separated)" value={newStaff.jurisdiction} className="input" onChange={(e) => setNewStaff({ ...newStaff, jurisdiction: e.target.value })} />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>

            <table style={{ width: '100%', marginTop: '.9rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="muted" style={{ textAlign: 'left' }}>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Name</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Email</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Department</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Jurisdiction</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}><strong>{s.name}</strong></td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{s.email}</td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{s.department || '-'}</td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{s.jurisdiction || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Manage Categories</h3>
            <form onSubmit={handleAddCategory} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.55rem' }}>
              <input type="text" placeholder="New category name" value={newCategory} className="input" onChange={(e) => setNewCategory(e.target.value)} />
              <button type="submit" className="btn btn-primary">Add Category</button>
            </form>
            <div style={{ marginTop: '.85rem', display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <span key={cat.id} className="pill">
                  {cat.name}
                  <button onClick={() => handleDeleteCategory(cat.id)} style={{ border: 'none', background: 'transparent', color: '#c93f46', fontWeight: 800, cursor: 'pointer' }}>✕</button>
                </span>
              ))}
            </div>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>User Management</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="muted" style={{ textAlign: 'left' }}>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Name</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Email</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Role</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Status</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{u.name}</td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{u.email}</td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{u.role}</td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <span className={`badge ${u.is_active ? 'resolved' : 'submitted'}`}>
                        {u.is_active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <div className="controls">
                        {u.is_active && <button className="btn btn-soft" onClick={() => handleDisableUser(u.id)}>Disable</button>}
                        <button className="btn btn-primary" onClick={() => handleResetPassword(u.id)}>Reset Password</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel panel-pad">
            <h3 style={{ marginTop: 0 }}>Monthly Export</h3>
            <div className="controls">
              <input type="month" className="input" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} style={{ width: '200px' }} />
              <button className="btn btn-primary" onClick={handleExportCsv}>Export CSV</button>
              <button className="btn btn-soft" onClick={handleExportPdf}>Export PDF</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

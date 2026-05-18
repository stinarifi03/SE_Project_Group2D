import { useEffect, useMemo, useState } from 'react'
import {
  getStats,
  createStaff,
  getAllStaff,
  updateStaff,
  deleteStaff,
  getCategories,
  addCategory,
  deleteCategory,
  updateCategoryDepartment,
  getDepartments,
  addDepartment,
  deleteDepartment,
  getUsers,
  disableUser,
  enableUser,
  resetUserPassword,
  getTrends,
  exportCsv,
  exportPdf,
  getAllReports,
  updateStatus,
  cancelReport,
  assignDepartment,
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
  const [departments, setDepartments] = useState([])
  const [trends, setTrends] = useState([])
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', department: '', jurisdiction: '' })
  const [newCategory, setNewCategory] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [exportMonth, setExportMonth] = useState('')
  const [tempPassword, setTempPassword] = useState(null)
  const [copied, setCopied] = useState(false)
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [editingStaff, setEditingStaff] = useState(null)
  const [editStaffForm, setEditStaffForm] = useState({ name: '', email: '', department: '', jurisdiction: '' })
  const [reports, setReports] = useState([])
  const [reportFilter, setReportFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const navigate = useNavigate()
  const name = localStorage.getItem('name')
  const { showToast } = useToast()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [statsRes, staffRes, catsRes, deptsRes, usersRes, trendsRes, reportsRes] = await Promise.all([
        getStats(),
        getAllStaff(),
        getCategories(),
        getDepartments(),
        getUsers(),
        getTrends(days),
        getAllReports({ per_page: 200 }),
      ])
      setStats(statsRes.data)
      setStaff(staffRes.data)
      setCategories(catsRes.data)
      setDepartments(deptsRes.data)
      setUsers(usersRes.data)
      setTrends(trendsRes.data)
      setReports(reportsRes.data.items || [])
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
    const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
    const maxVal = Math.max(...entries.map(([, v]) => v), 1)
    return entries.slice(-12).map(([day, count]) => ({
      day,
      count,
      heightPx: Math.max(Math.round((count / maxVal) * 140), 4),
    }))
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

  const openEditStaff = (s) => {
    setEditingStaff(s)
    setEditStaffForm({ name: s.name, email: s.email, department: s.department || '', jurisdiction: s.jurisdiction || '' })
  }

  const handleEditStaffSave = async () => {
    if (!editingStaff) return
    try {
      await updateStaff(editingStaff.id, editStaffForm)
      showToast('Staff member updated', 'success')
      setEditingStaff(null)
      await fetchAll()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update staff'), 'error')
    }
  }

  const handleDeleteStaff = async (id, staffName) => {
    if (!window.confirm(`Delete staff account for "${staffName}"? This cannot be undone.`)) return
    try {
      await deleteStaff(id)
      showToast('Staff member deleted', 'success')
      await fetchAll()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete staff'), 'error')
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

  const handleDeleteCategory = async (id, catName) => {
    if (!window.confirm(`Delete category "${catName}"? This cannot be undone.`)) return
    try {
      await deleteCategory(id)
      await fetchAll()
      showToast('Category deleted', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete category'), 'error')
    }
  }

  const handleCategoryDepartment = async (id, department) => {
    try {
      await updateCategoryDepartment(id, department)
      await fetchAll()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update category'), 'error')
    }
  }

  const handleAddDepartment = async (e) => {
    e.preventDefault()
    if (!newDepartment.trim()) {
      showToast('Department name is required', 'error')
      return
    }
    try {
      await addDepartment(newDepartment)
      setNewDepartment('')
      await fetchAll()
      showToast('Department added', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to add department'), 'error')
    }
  }

  const handleDeleteDepartment = async (id, deptName) => {
    if (!window.confirm(`Delete department "${deptName}"? This cannot be undone.`)) return
    try {
      await deleteDepartment(id)
      await fetchAll()
      showToast('Department deleted', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete department'), 'error')
    }
  }

  const handleDisableUser = async (id, userName) => {
    if (!window.confirm(`Disable account for "${userName}"? They will not be able to log in.`)) return
    try {
      await disableUser(id)
      await fetchAll()
      showToast('User disabled', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to disable user'), 'error')
    }
  }

  const handleEnableUser = async (id) => {
    try {
      await enableUser(id)
      await fetchAll()
      showToast('User enabled', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to enable user'), 'error')
    }
  }

  const handleResetPassword = async (id) => {
    try {
      const res = await resetUserPassword(id)
      setTempPassword(res.data.temporary_password)
      setCopied(false)
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to reset password'), 'error')
    }
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus(id, status)
      showToast('Status updated', 'success')
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      if (selectedReport?.id === id) setSelectedReport(prev => ({ ...prev, status }))
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update status'), 'error')
    }
  }

  const handleCancelReport = async (id) => {
    if (!window.confirm('Cancel this report?')) return
    try {
      await cancelReport(id)
      showToast('Report cancelled', 'success')
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
      if (selectedReport?.id === id) setSelectedReport(prev => ({ ...prev, status: 'cancelled' }))
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to cancel report'), 'error')
    }
  }

  const handleAssignDept = async (id, department) => {
    try {
      await assignDepartment(id, { department })
      showToast('Department assigned', 'success')
      setReports(prev => prev.map(r => r.id === id ? { ...r, department } : r))
      if (selectedReport?.id === id) setSelectedReport(prev => ({ ...prev, department }))
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to assign department'), 'error')
    }
  }

  const filteredUsers = userRoleFilter === 'all' ? users : users.filter(u => u.role === userRoleFilter)
  const filteredReports = reportFilter === 'all' ? reports : reports.filter(r => r.status === reportFilter)

  const STATUS_OPTIONS = ['submitted', 'under review', 'in progress', 'resolved', 'cancelled']
  const STATUS_LABELS = { 'submitted': 'Submitted', 'under review': 'Under Review', 'in progress': 'In Progress', 'resolved': 'Resolved', 'cancelled': 'Cancelled' }

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

          {/* Temp password modal */}
          {tempPassword && (
            <div className="modal" onClick={() => setTempPassword(null)}>
              <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <h2 className="title" style={{ fontSize: '1.2rem', marginBottom: '.5rem' }}>Temporary Password</h2>
                <p className="subtitle" style={{ marginBottom: '.8rem' }}>
                  Share this with the user. They should change it after logging in.
                </p>
                <div style={{
                  background: '#f0f6ff',
                  border: '1px solid #c5d9f5',
                  borderRadius: '.75rem',
                  padding: '.75rem 1rem',
                  fontFamily: 'monospace',
                  fontSize: '1.05rem',
                  letterSpacing: '.03em',
                  wordBreak: 'break-all',
                  marginBottom: '.75rem'
                }}>
                  {tempPassword}
                </div>
                <div className="controls">
                  <button className="btn btn-primary" onClick={handleCopyPassword}>
                    {copied ? '✓ Copied' : 'Copy to clipboard'}
                  </button>
                  <button className="btn btn-soft" onClick={() => setTempPassword(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit staff modal */}
          {editingStaff && (
            <div className="modal" onClick={() => setEditingStaff(null)}>
              <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="row" style={{ marginBottom: '.7rem' }}>
                  <h2 className="title" style={{ fontSize: '1.2rem' }}>Edit Staff — {editingStaff.name}</h2>
                  <button className="btn btn-soft" style={{ padding: '.45rem .7rem' }} onClick={() => setEditingStaff(null)}>Close</button>
                </div>
                <div style={{ display: 'grid', gap: '.55rem' }}>
                  <div className="field">
                    <label className="label">Full Name</label>
                    <input className="input" value={editStaffForm.name} onChange={e => setEditStaffForm({ ...editStaffForm, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={editStaffForm.email} onChange={e => setEditStaffForm({ ...editStaffForm, email: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label">Department</label>
                    <select className="select" value={editStaffForm.department} onChange={e => setEditStaffForm({ ...editStaffForm, department: e.target.value })}>
                      <option value="">No department</option>
                      {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Jurisdiction (areas this staff covers)</label>
                    <input className="input" value={editStaffForm.jurisdiction} placeholder="e.g. Downtown, Riverside" onChange={e => setEditStaffForm({ ...editStaffForm, jurisdiction: e.target.value })} />
                    <p className="muted" style={{ fontSize: '.78rem', marginTop: '.3rem' }}>
                      Comma-separated list of city zones. This staff member will only see reports from these areas.
                    </p>
                  </div>
                </div>
                <div className="controls" style={{ marginTop: '.85rem' }}>
                  <button className="btn btn-primary" onClick={handleEditStaffSave}>Save Changes</button>
                  <button className="btn btn-soft" onClick={() => setEditingStaff(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Report detail modal */}
          {selectedReport && (
            <div className="modal" onClick={() => setSelectedReport(null)}>
              <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="row" style={{ marginBottom: '.7rem' }}>
                  <h2 className="title" style={{ fontSize: '1.2rem' }}>Report #{selectedReport.id}</h2>
                  <button className="btn btn-soft" style={{ padding: '.45rem .7rem' }} onClick={() => setSelectedReport(null)}>Close</button>
                </div>
                <p style={{ margin: '0 0 .4rem', fontWeight: 600 }}>{selectedReport.title}</p>
                <p className="muted" style={{ fontSize: '.85rem', margin: '0 0 .75rem' }}>{selectedReport.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.45rem .9rem', fontSize: '.85rem', marginBottom: '.9rem' }}>
                  <div><span className="muted">Category:</span> {selectedReport.category || '—'}</div>
                  <div><span className="muted">Status:</span> <span className={`badge ${selectedReport.status?.replace(/ /g, '-')}`}>{STATUS_LABELS[selectedReport.status] || selectedReport.status}</span></div>
                  <div><span className="muted">Department:</span> {selectedReport.department || '—'}</div>
                  <div><span className="muted">Location:</span> {selectedReport.latitude && selectedReport.longitude ? `${parseFloat(selectedReport.latitude).toFixed(4)}, ${parseFloat(selectedReport.longitude).toFixed(4)}` : '—'}</div>
                  <div><span className="muted">Submitted by:</span> {selectedReport.citizen_name || `User #${selectedReport.citizen_id}` || '—'}</div>
                  <div><span className="muted">Date:</span> {selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleDateString() : '—'}</div>
                </div>
                <div className="field" style={{ marginBottom: '.6rem' }}>
                  <label className="label">Assign Department</label>
                  <select className="select" value={selectedReport.department || ''} onChange={e => handleAssignDept(selectedReport.id, e.target.value)}>
                    <option value="">No department</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: '.75rem' }}>
                  <label className="label">Change Status</label>
                  <select className="select" value={selectedReport.status || ''} onChange={e => handleStatusChange(selectedReport.id, e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                {!['cancelled', 'resolved'].includes(selectedReport.status) && (
                  <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => handleCancelReport(selectedReport.id)}>
                    Cancel Report
                  </button>
                )}
              </div>
            </div>
          )}

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
            <div className="row" style={{ marginBottom: '.9rem' }}>
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
                  <div style={{ width: '100%', height: `${b.heightPx}px`, borderRadius: '.45rem', background: 'linear-gradient(180deg, #00a2ff, #1060ff)' }} />
                  <span className="muted" style={{ fontSize: '.66rem' }}>{b.day.slice(5)}</span>
                </div>
              ))}
              {trendBars.length === 0 && <p className="muted" style={{ gridColumn: '1/-1' }}>No trend data available.</p>}
            </div>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <div className="row" style={{ marginBottom: '.75rem' }}>
              <h3 style={{ margin: 0 }}>Manage Reports</h3>
              <div className="controls">
                {['all', 'submitted', 'under review', 'in progress', 'resolved', 'cancelled'].map((f) => {
                  const count = f === 'all' ? reports.length : reports.filter(r => r.status === f).length
                  return (
                    <button
                      key={f}
                      className={`btn ${reportFilter === f ? 'btn-primary' : 'btn-soft'}`}
                      style={{ fontSize: '.78rem', padding: '.3rem .6rem' }}
                      onClick={() => setReportFilter(f)}
                    >
                      {f === 'all' ? `All (${count})` : `${STATUS_LABELS[f]} (${count})`}
                    </button>
                  )
                })}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="muted" style={{ textAlign: 'left' }}>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>ID</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Title</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Category</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Status</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Department</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Submitted by</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }} className="muted">#{r.id}</td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{r.title}</strong></td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }} className="muted">{r.category || '—'}</td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <span className={`badge ${r.status?.replace(/ /g, '-')}`}>{STATUS_LABELS[r.status] || r.status}</span>
                    </td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }} className="muted">{r.department || '—'}</td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }} className="muted">{r.citizen_name || '—'}</td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <div className="controls">
                        <button className="btn btn-soft" style={{ fontSize: '.8rem' }} onClick={() => setSelectedReport(r)}>View</button>
                        {!['cancelled', 'resolved'].includes(r.status) && (
                          <button className="btn btn-soft" style={{ fontSize: '.8rem', color: '#c93f46' }} onClick={() => handleCancelReport(r.id)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr><td colSpan={7} className="muted" style={{ padding: '.85rem 0', textAlign: 'center' }}>No reports found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Manage Staff Accounts</h3>
            <form onSubmit={handleAddStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto', gap: '.55rem' }}>
              <input type="text" placeholder="Full Name" value={newStaff.name} className="input" onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
              <input type="email" placeholder="Email" value={newStaff.email} className="input" onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
              <input type="password" placeholder="Password" value={newStaff.password} className="input" onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
              <select className="select" value={newStaff.department} onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}>
                <option value="">No department</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <input type="text" placeholder="Jurisdiction (e.g. Downtown, Riverside)" value={newStaff.jurisdiction} className="input" onChange={(e) => setNewStaff({ ...newStaff, jurisdiction: e.target.value })} />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>

            <table style={{ width: '100%', marginTop: '.9rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="muted" style={{ textAlign: 'left' }}>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Name</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Email</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Department</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Jurisdiction</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}><strong>{s.name}</strong></td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{s.email}</td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{s.department || '-'}</td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{s.jurisdiction || '-'}</td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <div className="controls">
                        <button className="btn btn-soft" onClick={() => openEditStaff(s)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => handleDeleteStaff(s.id, s.name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ padding: '.85rem 0', textAlign: 'center' }}>No staff accounts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Manage Categories</h3>
            <p className="muted" style={{ fontSize: '.82rem', marginBottom: '.75rem' }}>
              Assign each category to a department so staff only see relevant reports.
            </p>
            <form onSubmit={handleAddCategory} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.55rem', marginBottom: '.9rem' }}>
              <input type="text" placeholder="New category name" value={newCategory} className="input" onChange={(e) => setNewCategory(e.target.value)} />
              <button type="submit" className="btn btn-primary">Add Category</button>
            </form>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="muted" style={{ textAlign: 'left' }}>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Category</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}>Department</th>
                  <th style={{ paddingBottom: '.5rem', borderBottom: '1px solid #e7eef9' }}></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }}>{cat.name}</td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <select
                        className="select"
                        style={{ width: '170px' }}
                        value={cat.department || ''}
                        onChange={(e) => handleCategoryDepartment(cat.id, e.target.value)}
                      >
                        <option value="">No department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '.5rem 0', borderBottom: '1px solid #eef3fb', textAlign: 'right' }}>
                      <button
                        className="btn btn-soft"
                        style={{ color: '#c93f46', fontSize: '.8rem' }}
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={3} className="muted" style={{ padding: '.85rem 0', textAlign: 'center' }}>No categories yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Manage Departments</h3>
            <form onSubmit={handleAddDepartment} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.55rem' }}>
              <input type="text" placeholder="New department name" value={newDepartment} className="input" onChange={(e) => setNewDepartment(e.target.value)} />
              <button type="submit" className="btn btn-primary">Add Department</button>
            </form>
            <div style={{ marginTop: '.85rem', display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
              {departments.map((dept) => (
                <span key={dept.id} className="pill">
                  {dept.name}
                  <button
                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                    style={{ border: 'none', background: 'transparent', color: '#c93f46', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="panel panel-pad" style={{ marginBottom: '1rem' }}>
            <div className="row" style={{ marginBottom: '.75rem' }}>
              <h3 style={{ margin: 0 }}>User Management</h3>
              <div className="controls">
                {['all', 'citizen', 'staff', 'admin'].map((role) => (
                  <button
                    key={role}
                    className={`btn ${userRoleFilter === role ? 'btn-primary' : 'btn-soft'}`}
                    style={{ textTransform: 'capitalize' }}
                    onClick={() => setUserRoleFilter(role)}
                  >
                    {role === 'all' ? `All (${users.length})` : `${role.charAt(0).toUpperCase() + role.slice(1)} (${users.filter(u => u.role === role).length})`}
                  </button>
                ))}
              </div>
            </div>
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
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{u.name}</td>
                    <td className="muted" style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>{u.email}</td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb', textTransform: 'capitalize' }}>{u.role}</td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <span className={`badge ${u.is_active ? 'resolved' : 'submitted'}`}>
                        {u.is_active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '.58rem 0', borderBottom: '1px solid #eef3fb' }}>
                      <div className="controls">
                        {u.is_active
                          ? <button className="btn btn-soft" onClick={() => handleDisableUser(u.id, u.name)}>Disable</button>
                          : <button className="btn btn-primary" onClick={() => handleEnableUser(u.id)}>Enable</button>
                        }
                        <button className="btn btn-soft" onClick={() => handleResetPassword(u.id)}>Reset Password</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ padding: '.85rem 0', textAlign: 'center' }}>No users in this category.</td></tr>
                )}
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

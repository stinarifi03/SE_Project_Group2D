import { useEffect, useState } from 'react'
import {
  getAllReports,
  updateStatus,
  assignDepartment,
  getCategories,
  getReportActivity,
  uploadReportImage,
  getErrorMessage,
  logout,
} from '../../services/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/useToast'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const departments = ['Roads', 'Electricity', 'Sanitation', 'Parks', 'Other']
const statuses = ['submitted', 'under review', 'in progress', 'resolved']

export default function Dashboard() {
  const [reports, setReports] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list')
  const [selectedReport, setSelectedReport] = useState(null)
  const [activities, setActivities] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [meta, setMeta] = useState({ page: 1, page_size: 20, pages: 1, total: 0 })
  const navigate = useNavigate()
  const name = localStorage.getItem('name')
  const { showToast } = useToast()

  const loadReports = async (page = 1) => {
    setLoading(true)
    try {
      const res = await getAllReports({
        page,
        page_size: meta.page_size,
        status: filterStatus,
        category: filterCategory,
        search,
      })
      setReports(res.data.items)
      setMeta(res.data.meta)
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load reports.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const catsRes = await getCategories()
        setCategories(catsRes.data)
      } catch {
        showToast('Failed to load categories', 'error')
      }
      await loadReports(1)
    }
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports(1)
    }, 320)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCategory, search])

  const refreshCurrentPage = async () => {
    await loadReports(meta.page)
  }

  const openReport = async (report) => {
    setSelectedReport(report)
    setImageFile(null)
    try {
      const res = await getReportActivity(report.id)
      setActivities(res.data)
    } catch {
      setActivities([])
    }
  }

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateStatus(id, newStatus)
      showToast('Status updated', 'success')
      await refreshCurrentPage()
      if (selectedReport && selectedReport.id === id) {
        const activityRes = await getReportActivity(id)
        setActivities(activityRes.data)
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update status.'), 'error')
    }
  }

  const handleDepartmentAssign = async (id, department) => {
    try {
      await assignDepartment(id, { department })
      showToast('Department assigned', 'success')
      await refreshCurrentPage()
      if (selectedReport && selectedReport.id === id) {
        const activityRes = await getReportActivity(id)
        setActivities(activityRes.data)
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to assign department.'), 'error')
    }
  }

  const handleUploadAfterImage = async () => {
    if (!selectedReport || !imageFile) return
    try {
      await uploadReportImage(selectedReport.id, imageFile, 'after')
      showToast('After image uploaded', 'success')
      setImageFile(null)
      const activityRes = await getReportActivity(selectedReport.id)
      setActivities(activityRes.data)
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to upload image'), 'error')
    }
  }

  const statusClass = (status) => {
    if (status === 'under review') return 'badge under-review'
    if (status === 'in progress') return 'badge in-progress'
    if (status === 'resolved') return 'badge resolved'
    return 'badge submitted'
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-badge">🏛️</span>
            <div>
              <div className="brand-title">Staff Dashboard</div>
              <p className="brand-subtitle">Welcome, {name || 'Staff member'}</p>
            </div>
          </div>

          <div className="actions">
            <button onClick={() => setView('list')} className={`btn ${view === 'list' ? 'btn-primary' : 'btn-soft'}`}>List</button>
            <button onClick={() => setView('map')} className={`btn ${view === 'map' ? 'btn-primary' : 'btn-soft'}`}>Map</button>
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
          <div className="stats-grid">
            {statuses.map((s) => (
              <div key={s} className="stat-card">
                <div className="stat-value" style={{ color: '#0f5de8' }}>
                  {reports.filter((r) => r.status === s).length}
                </div>
                <div className="muted" style={{ textTransform: 'capitalize', fontSize: '.82rem' }}>{s}</div>
              </div>
            ))}
          </div>

          <div className="toolbar" style={{ marginTop: '1rem' }}>
            <input
              type="text"
              placeholder="Search by title or description"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name.toLowerCase()}>{cat.name}</option>
              ))}
            </select>
            <span className="pill" style={{ alignSelf: 'center' }}>
              {meta.total} total
            </span>
          </div>

          {view === 'list' && (
            <div className="list">
              {loading && <p className="muted" style={{ textAlign: 'center' }}>Loading reports...</p>}
              {!loading && reports.length === 0 && (
                <div className="panel panel-pad" style={{ textAlign: 'center' }}>
                  <p className="subtitle">No reports match your filters.</p>
                </div>
              )}
              {!loading && reports.map((report) => (
                <article key={report.id} className="report" onClick={() => openReport(report)}>
                  <div className="row">
                    <h3 style={{ margin: 0 }}>{report.title}</h3>
                    <span className={statusClass(report.status)}>{report.status}</span>
                  </div>
                  <p className="muted" style={{ marginTop: '.45rem' }}>{report.description}</p>
                  <div className="meta">
                    <span>📁 {report.category}</span>
                    <span>📍 {parseFloat(report.latitude).toFixed(4)}, {parseFloat(report.longitude).toFixed(4)}</span>
                    <span>🏢 {report.department || 'Unassigned'}</span>
                    <span>⏱️ {report.is_overdue ? 'Overdue' : 'Within SLA'}</span>
                  </div>

                  <div className="controls" onClick={(e) => e.stopPropagation()}>
                    <select
                      defaultValue={report.status}
                      onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                      className="select"
                      style={{ width: '170px' }}
                    >
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      defaultValue={report.department || ''}
                      onChange={(e) => handleDepartmentAssign(report.id, e.target.value)}
                      className="select"
                      style={{ width: '190px' }}
                    >
                      <option value="">Assign Department</option>
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </article>
              ))}

              <div className="controls" style={{ justifyContent: 'space-between', marginTop: '.5rem' }}>
                <button className="btn btn-soft" disabled={meta.page <= 1} onClick={() => loadReports(meta.page - 1)}>
                  Previous
                </button>
                <span className="pill">Page {meta.page} of {meta.pages}</span>
                <button className="btn btn-soft" disabled={meta.page >= meta.pages} onClick={() => loadReports(meta.page + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}

          {view === 'map' && (
            <div className="map-wrap map-lg">
              <MapContainer center={[41.3275, 19.8187]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                {reports.map((report) => (
                  report.latitude && report.longitude && (
                    <Marker key={report.id} position={[parseFloat(report.latitude), parseFloat(report.longitude)]}>
                      <Popup>
                        <strong>{report.title}</strong>
                        <br />
                        {report.category}
                        <br />
                        <span className="capitalize">{report.status}</span>
                        <br />
                        {report.department || 'Unassigned'}
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      </section>

      {selectedReport && (
        <div className="modal" onClick={() => setSelectedReport(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: '.7rem' }}>
              <h2 className="title" style={{ fontSize: '1.3rem' }}>{selectedReport.title}</h2>
              <button onClick={() => setSelectedReport(null)} className="btn btn-soft" style={{ padding: '.45rem .7rem' }}>
                Close
              </button>
            </div>

            <span className={statusClass(selectedReport.status)}>{selectedReport.status}</span>
            <div style={{ marginTop: '.75rem', display: 'grid', gap: '.45rem', fontSize: '.92rem' }}>
              <p><strong>Description:</strong> {selectedReport.description}</p>
              <p><strong>Category:</strong> {selectedReport.category}</p>
              <p><strong>Department:</strong> {selectedReport.department || 'Unassigned'}</p>
              <p><strong>SLA:</strong> {selectedReport.sla_hours ? `${selectedReport.sla_hours}h` : 'n/a'} ({selectedReport.is_overdue ? 'Overdue' : 'Within SLA'})</p>
            </div>

            <div className="panel panel-pad" style={{ marginTop: '.8rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '.4rem' }}>Upload after image</h3>
              <div className="controls">
                <input type="file" accept="image/*" className="input" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ maxWidth: '240px' }} />
                <button className="btn btn-primary" onClick={handleUploadAfterImage} disabled={!imageFile}>Upload</button>
              </div>
            </div>

            <div className="panel panel-pad" style={{ marginTop: '.8rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '.4rem' }}>Activity Feed</h3>
              <div className="list">
                {activities.map((a) => (
                  <div key={a.id} className="report" style={{ cursor: 'default' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{a.action}</p>
                    <p className="muted" style={{ margin: '.2rem 0 0' }}>{a.detail || 'No details'}</p>
                    <p className="muted" style={{ margin: '.2rem 0 0', fontSize: '.78rem' }}>{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {activities.length === 0 && <p className="muted">No activity yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

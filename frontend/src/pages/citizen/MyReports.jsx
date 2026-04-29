import { useEffect, useState } from 'react'
import {
  getMyReports,
  getNotifications,
  editReport,
  cancelReport,
  getReportActivity,
  uploadReportImage,
  getPublicReport,
  getErrorMessage,
  logout,
} from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/useToast'

export default function MyReports() {
  const [reports, setReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [activities, setActivities] = useState([])
  const [images, setImages] = useState([])
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '' })
  const [editing, setEditing] = useState(false)
  const [uploadStage, setUploadStage] = useState('before')
  const [imageFile, setImageFile] = useState(null)
  const navigate = useNavigate()
  const name = localStorage.getItem('name')
  const { showToast } = useToast()

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [reportsRes, notifRes] = await Promise.all([
          getMyReports(), getNotifications()
        ])
        setReports(reportsRes.data)
        setNotifications(notifRes.data)
      } catch {
        showToast('Failed to load data.', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [showToast])

  const openReport = async (report) => {
    setSelectedReport(report)
    setEditForm({
      title: report.title,
      description: report.description,
      category: report.category,
    })
    setEditing(false)
    setImageFile(null)
    try {
      const [activityRes, publicRes] = await Promise.all([
        getReportActivity(report.id),
        getPublicReport(report.id),
      ])
      setActivities(activityRes.data)
      setImages(publicRes.data.images || [])
    } catch {
      setActivities([])
      setImages([])
    }
  }

  const refreshReports = async () => {
    const reportsRes = await getMyReports()
    setReports(reportsRes.data)
    if (selectedReport) {
      const fresh = reportsRes.data.find((r) => r.id === selectedReport.id)
      if (fresh) setSelectedReport(fresh)
    }
  }

  const handleEditSave = async () => {
    if (!selectedReport) return
    try {
      await editReport(selectedReport.id, editForm)
      showToast('Report updated', 'success')
      setEditing(false)
      await refreshReports()
      const activityRes = await getReportActivity(selectedReport.id)
      setActivities(activityRes.data)
      const publicRes = await getPublicReport(selectedReport.id)
      setImages(publicRes.data.images || [])
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update report'), 'error')
    }
  }

  const handleCancelReport = async (reportId) => {
    try {
      await cancelReport(reportId)
      showToast('Report cancelled', 'success')
      await refreshReports()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to cancel report'), 'error')
    }
  }

  const handleUploadImage = async () => {
    if (!selectedReport || !imageFile) return
    try {
      await uploadReportImage(selectedReport.id, imageFile, uploadStage)
      showToast('Image uploaded', 'success')
      setImageFile(null)
      const activityRes = await getReportActivity(selectedReport.id)
      setActivities(activityRes.data)
      const publicRes = await getPublicReport(selectedReport.id)
      setImages(publicRes.data.images || [])
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to upload image'), 'error')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

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
            <span className="brand-badge">🏙️</span>
            <div>
              <div className="brand-title">My Reports</div>
              <p className="brand-subtitle">Welcome, {name || 'Citizen'}</p>
            </div>
          </div>

          <div className="actions" style={{ position: 'relative' }}>
            <button onClick={() => navigate('/submit')} className="btn btn-primary">+ New Report</button>
            <button onClick={() => setShowNotifications(!showNotifications)} className="btn btn-soft" style={{ position: 'relative' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '.7rem',
                  color: '#fff',
                  background: '#f1585c'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-box">
                <div style={{ padding: '.8rem', fontWeight: 800 }}>🔔 Notifications</div>
                {notifications.length === 0 ? (
                  <p className="notification-item muted">No notifications yet.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="notification-item" style={{ background: !n.is_read ? '#eff6ff' : '#fff' }}>
                      <p style={{ margin: 0 }}>{n.message}</p>
                      <p className="muted" style={{ margin: '.35rem 0 0', fontSize: '.75rem' }}>
                        {new Date(n.sent_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

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
        <div className="container" style={{ maxWidth: '920px' }}>
          {loading && <p className="muted" style={{ textAlign: 'center' }}>Loading your reports...</p>}

          {!loading && reports.length === 0 && (
            <div className="panel panel-pad" style={{ textAlign: 'center' }}>
              <p className="subtitle" style={{ fontSize: '1rem' }}>You have not submitted any reports yet.</p>
              <button onClick={() => navigate('/submit')} className="btn btn-primary" style={{ marginTop: '.85rem' }}>
                Submit your first report
              </button>
            </div>
          )}

          {!loading && (
            <div className="list">
              {reports.map(report => (
                <article key={report.id} className="report" onClick={() => openReport(report)}>
                  <div className="row">
                    <h3 style={{ margin: 0 }}>{report.title}</h3>
                    <span className={statusClass(report.status)}>{report.status}</span>
                  </div>
                  <p className="muted" style={{ marginTop: '.45rem' }}>{report.description}</p>
                  <div className="meta">
                    <span>📁 {report.category}</span>
                    <span>📍 {parseFloat(report.latitude).toFixed(4)}, {parseFloat(report.longitude).toFixed(4)}</span>
                    <span>🕒 {new Date(report.created_at).toLocaleDateString()}</span>
                    <span>⏱️ {report.is_overdue ? 'Overdue' : 'Within SLA'}</span>
                  </div>

                  {report.status === 'submitted' && (
                    <div className="controls" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-soft" onClick={() => openReport(report)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => handleCancelReport(report.id)}>Cancel</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedReport && (
        <div className="modal" onClick={() => setSelectedReport(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: '.7rem' }}>
              <h2 className="title" style={{ fontSize: '1.3rem' }}>{selectedReport.title}</h2>
              <button onClick={() => setSelectedReport(null)} className="btn btn-soft" style={{ padding: '.45rem .7rem' }}>Close</button>
            </div>

            <span className={statusClass(selectedReport.status)}>{selectedReport.status}</span>

            <div style={{ margin: '.9rem 0' }}>
              <p className="label" style={{ marginBottom: '.42rem' }}>Progress</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                {['submitted', 'under review', 'in progress', 'resolved'].map((s, i) => {
                  const steps = ['submitted', 'under review', 'in progress', 'resolved']
                  const currentIndex = steps.indexOf(selectedReport.status)
                  const isActive = i <= currentIndex
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{
                        width: '.65rem',
                        height: '.65rem',
                        borderRadius: '999px',
                        background: isActive ? '#1060ff' : '#d4deef'
                      }} />
                      {i < 3 && (
                        <div style={{
                          height: '.25rem',
                          flex: 1,
                          borderRadius: '999px',
                          background: i < currentIndex ? '#1060ff' : '#d4deef'
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="muted" style={{ marginTop: '.35rem', fontSize: '.76rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Submitted</span>
                <span>Review</span>
                <span>Progress</span>
                <span>Resolved</span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '.45rem', fontSize: '.92rem' }}>
              {editing ? (
                <>
                  <div className="field">
                    <label className="label">Title</label>
                    <input className="input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label">Description</label>
                    <textarea className="textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label">Category</label>
                    <input className="input" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                  </div>
                  <div className="controls">
                    <button className="btn btn-primary" onClick={handleEditSave}>Save</button>
                    <button className="btn btn-soft" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <p><strong>Description:</strong> {selectedReport.description}</p>
                  <p><strong>Category:</strong> {selectedReport.category}</p>
                </>
              )}
              <p><strong>Location:</strong> {parseFloat(selectedReport.latitude).toFixed(6)}, {parseFloat(selectedReport.longitude).toFixed(6)}</p>
              <p><strong>Submitted:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
              <p><strong>SLA:</strong> {selectedReport.sla_hours ? `${selectedReport.sla_hours}h` : 'n/a'} ({selectedReport.is_overdue ? 'Overdue' : 'Within SLA'})</p>
            </div>

            {!editing && selectedReport.status === 'submitted' && (
              <div className="controls" style={{ marginTop: '.6rem' }}>
                <button className="btn btn-soft" onClick={() => setEditing(true)}>Edit report</button>
                <button className="btn btn-danger" onClick={() => handleCancelReport(selectedReport.id)}>Cancel report</button>
              </div>
            )}

            <div className="panel panel-pad" style={{ marginTop: '.8rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '.4rem' }}>Upload image</h3>
              <div className="controls">
                <select className="select" value={uploadStage} onChange={(e) => setUploadStage(e.target.value)} style={{ width: '150px' }}>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
                <input type="file" accept="image/*" className="input" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ maxWidth: '220px' }} />
                <button className="btn btn-primary" onClick={handleUploadImage} disabled={!imageFile}>Upload</button>
              </div>
            </div>

            <div className="panel panel-pad" style={{ marginTop: '.8rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '.4rem' }}>Images</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '.5rem' }}>
                {images.map((img) => (
                  <div key={img.id}>
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${img.image_url}`}
                      alt={img.stage}
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '.55rem', border: '1px solid #dce8f8' }}
                    />
                    <p className="muted" style={{ margin: '.25rem 0 0', fontSize: '.75rem' }}>
                      {img.stage}
                    </p>
                  </div>
                ))}
                {images.length === 0 && <p className="muted">No images uploaded yet.</p>}
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

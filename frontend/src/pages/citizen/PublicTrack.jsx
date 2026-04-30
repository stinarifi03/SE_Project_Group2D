import { useState } from 'react'
import { getPublicReport, getErrorMessage } from '../../services/api'
import { useToast } from '../../components/useToast'

export default function PublicTrack() {
  const [reportId, setReportId] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!reportId.trim()) return
    setLoading(true)
    try {
      const res = await getPublicReport(reportId.trim())
      setReport(res.data)
    } catch (err) {
      showToast(getErrorMessage(err, 'Report not found'), 'error')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="panel panel-pad">
            <h1 className="title" style={{ fontSize: '1.6rem' }}>Public Report Tracking</h1>
            <p className="subtitle">Track progress for any report by ID.</p>

            <form onSubmit={handleSearch} className="toolbar" style={{ marginTop: '.9rem', gridTemplateColumns: '1fr auto' }}>
              <input
                className="input"
                value={reportId}
                placeholder="Enter report ID"
                onChange={(e) => setReportId(e.target.value)}
              />
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Loading...' : 'Track'}
              </button>
            </form>

            {report && (
              <div className="panel panel-pad" style={{ marginTop: '.9rem' }}>
                <div className="row">
                  <h2 style={{ margin: 0 }}>{report.title}</h2>
                  <span className={`badge ${
                    report.status === 'resolved' ? 'resolved' :
                    report.status === 'in progress' ? 'in-progress' :
                    report.status === 'under review' ? 'under-review' : 'submitted'
                  }`}>
                    {report.status}
                  </span>
                </div>
                <p className="muted" style={{ marginTop: '.4rem' }}>{report.description}</p>
                <div className="meta">
                  <span>Category: {report.category}</span>
                  <span>Department: {report.department || 'Unassigned'}</span>
                  <span>Location: {report.latitude}, {report.longitude}</span>
                  <span>SLA: {report.sla_hours ? `${report.sla_hours}h` : 'n/a'}</span>
                  <span>{report.is_overdue ? 'Overdue' : 'Within SLA'}</span>
                </div>

                <h3 style={{ marginBottom: '.35rem', marginTop: '.9rem' }}>Activity Feed</h3>
                <div className="list">
                  {(report.activity || []).map((a) => (
                    <div key={a.id} className="report" style={{ cursor: 'default' }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{a.action}</p>
                      <p className="muted" style={{ margin: '.25rem 0 0' }}>{a.detail || 'No details'}</p>
                      <p className="muted" style={{ margin: '.25rem 0 0', fontSize: '.8rem' }}>
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <h3 style={{ marginBottom: '.35rem', marginTop: '.9rem' }}>Images</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '.6rem' }}>
                  {(report.images || []).map((img) => (
                    <div key={img.id} className="panel panel-pad" style={{ padding: '.5rem' }}>
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}${img.image_url}`}
                        alt={img.stage}
                        style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '.6rem' }}
                      />
                      <p className="muted" style={{ marginTop: '.35rem', fontSize: '.8rem' }}>
                        {img.stage} - {new Date(img.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {(!report.images || report.images.length === 0) && (
                    <p className="muted">No images uploaded yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

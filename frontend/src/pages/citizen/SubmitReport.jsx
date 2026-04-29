import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { submitReport, getCategories, uploadReportImage, getErrorMessage, logout } from '../../services/api'
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

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) { onSelect(e.latlng) }
  })
  return null
}

export default function SubmitReport() {
  const [form, setForm] = useState({ title: '', description: '', category: '' })
  const [position, setPosition] = useState(null)
  const [beforeImage, setBeforeImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const navigate = useNavigate()
  const name = localStorage.getItem('name')
  const { showToast } = useToast()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getCategories()
        setCategories(res.data)
      } catch {
        showToast('Failed to load categories', 'error')
      }
    }
    fetchCategories()
  }, [showToast])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!position) {
      showToast('Please click on the map to select a location.', 'error')
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const res = await submitReport({
        ...form,
        latitude: position.lat,
        longitude: position.lng
      })

      if (beforeImage) {
        await uploadReportImage(res.data.id, beforeImage, 'before')
      }

      showToast('Report submitted successfully!', 'success')
      navigate('/my-reports')
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to submit report. Try again.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-badge">🏙️</span>
            <div>
              <div className="brand-title">Report an Issue</div>
              <p className="brand-subtitle">Welcome, {name || 'Citizen'}</p>
            </div>
          </div>
          <div className="actions">
            <button onClick={() => navigate('/my-reports')} className="btn btn-soft">My Reports</button>
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
          <div className="panel panel-pad" style={{ maxWidth: '860px', margin: '0 auto' }}>
            <h2 className="title" style={{ fontSize: '1.55rem' }}>Submit new report</h2>
            <p className="subtitle">Describe the issue clearly and pin its exact location on the map.</p>

            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="field">
                <label className="label">Issue title</label>
                <input type="text" name="title" placeholder="Streetlight broken near central park" className="input" onChange={handleChange} required />
              </div>

              <div className="field">
                <label className="label">Category</label>
                <select name="category" className="select" onChange={handleChange} required>
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name.toLowerCase()}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">Description</label>
                <textarea name="description" placeholder="Describe what happened, how severe it is, and any useful context." className="textarea" onChange={handleChange} required />
              </div>

              <div className="field">
                <label className="label">Before image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={(e) => setBeforeImage(e.target.files?.[0] || null)}
                />
              </div>

              <p className="muted" style={{ margin: '.35rem 0 .6rem' }}>📍 Click on the map to pin the issue location</p>

              <div className="map-wrap map-sm" style={{ marginBottom: '.85rem' }}>
                <MapContainer center={[41.3275, 19.8187]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© OpenStreetMap contributors'
                  />
                  <LocationPicker onSelect={setPosition} />
                  {position && <Marker position={position} />}
                </MapContainer>
              </div>

              {position && (
                <p className="pill" style={{ background: '#daf9ed', color: '#0c7a4f' }}>
                  ✅ Location selected: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '.95rem' }}>
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

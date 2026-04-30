import { useState } from 'react'
import { register, getErrorMessage } from '../../services/api'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../../components/useToast'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await register(form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      showToast('Account created successfully', 'success')
      navigate('/submit')
    } catch (err) {
      showToast(getErrorMessage(err, 'Registration failed. Try again.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split-auth page">
      <section className="auth-left">
        <div>
          <div className="brand" style={{ marginBottom: '3rem' }}>
            <span className="brand-badge">🏙️</span>
            <div>
              <div className="brand-title">UrbanTrack</div>
              <p className="brand-subtitle" style={{ color: 'rgba(255,255,255,0.85)' }}>Create your citizen account</p>
            </div>
          </div>

          <h1 className="title" style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.15rem)', lineHeight: 1.1 }}>
            Join thousands
            <br />
            making their
            <br />
            city better.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.92)', maxWidth: '38ch' }}>
            Create your free account and start reporting issues in your neighborhood today.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '.5rem' }}>
          {[
            '✅ Free to use, always',
            '📍 Pin issues directly on the map',
            '🔔 Get notified when your issue is resolved',
          ].map(item => (
            <div key={item} className="feature-chip" style={{ maxWidth: '430px' }}>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-card">
          <div className="brand" style={{ marginBottom: '1rem' }}>
            <span className="brand-badge">🏙️</span>
            <div>
              <div className="brand-title">UrbanTrack</div>
              <p className="brand-subtitle">Create account</p>
            </div>
          </div>

          <h2 className="title" style={{ fontSize: '1.7rem' }}>Create account</h2>
          <p className="subtitle">Join your community and start making a difference.</p>

          <form onSubmit={handleRegister} style={{ marginTop: '1rem' }}>
            <div className="field">
              <label className="label">Full Name</label>
              <input type="text" name="name" placeholder="John Doe" className="input" onChange={handleChange} required />
            </div>

            <div className="field">
              <label className="label">Email address</label>
              <input type="email" name="email" placeholder="you@example.com" className="input" onChange={handleChange} required />
            </div>

            <div className="field">
              <label className="label">Password</label>
              <input type="password" name="password" placeholder="Create a secure password" className="input" onChange={handleChange} required />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '.25rem' }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="subtitle" style={{ marginTop: '.95rem', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/" style={{ color: '#0a52de', fontWeight: 800 }}>Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
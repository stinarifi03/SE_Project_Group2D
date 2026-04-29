import { useState } from 'react'
import { login, getErrorMessage } from '../../services/api'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../../components/useToast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await login({ email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('refresh_token', res.data.refresh_token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      showToast('Signed in successfully', 'success')
      if (res.data.role === 'admin') navigate('/admin')
      else if (res.data.role === 'staff') navigate('/dashboard')
      else navigate('/submit')
    } catch (err) {
      showToast(getErrorMessage(err, 'Invalid credentials. Try again.'), 'error')
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
              <p className="brand-subtitle" style={{ color: 'rgba(255,255,255,0.85)' }}>Citizen reporting portal</p>
            </div>
          </div>

          <h1 className="title" style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 1.1 }}>
            Fix your city,
            <br />
            one report
            <br />
            at a time.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.92)', maxWidth: '35ch' }}>
            Report infrastructure issues directly to your municipality. Track progress in real time.
          </p>
        </div>

        <div className="feature-grid">
          {[
            { icon: '📍', label: 'Geo-tagged Reports' },
            { icon: '🔔', label: 'Live Notifications' },
            { icon: '✅', label: 'Track Resolution' },
          ].map(item => (
            <div key={item.label} className="feature-chip">
              <div style={{ fontSize: '1.25rem', marginBottom: '.35rem' }}>{item.icon}</div>
              <div>{item.label}</div>
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
              <p className="brand-subtitle">Welcome back</p>
            </div>
          </div>

          <h2 className="title" style={{ fontSize: '1.7rem' }}>Sign in</h2>
          <p className="subtitle">Use your email and password to continue.</p>

          <form onSubmit={handleLogin} style={{ marginTop: '1rem' }}>
            <div className="field">
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Enter password"
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '.25rem' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="subtitle" style={{ marginTop: '.95rem', textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#0a52de', fontWeight: 800 }}>Create one</Link>
          </p>
          <p className="subtitle" style={{ marginTop: '.35rem', textAlign: 'center' }}>
            Want to track a report publicly?{' '}
            <Link to="/track" style={{ color: '#0a52de', fontWeight: 800 }}>Track by ID</Link>
          </p>

          <div className="panel panel-pad" style={{ marginTop: '1rem' }}>
            <p className="label" style={{ marginBottom: '.45rem' }}>Demo accounts</p>
            <div className="muted" style={{ fontSize: '.82rem', display: 'grid', gap: '.3rem' }}>
              <p>👤 Citizen: your registered email</p>
              <p>🏛️ Staff: staff@urban.com / password123</p>
              <p>👨‍💼 Admin: admin@urban.com / password123</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
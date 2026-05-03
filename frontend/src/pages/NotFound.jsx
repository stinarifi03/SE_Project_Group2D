import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</div>
        <h1 className="title" style={{ fontSize: '1.6rem', marginBottom: '.5rem' }}>Page not found</h1>
        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>Go home</Link>
      </div>
    </div>
  )
}

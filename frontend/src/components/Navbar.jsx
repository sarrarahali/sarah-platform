import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { token, logout } = useAuth()

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      <Link to="/dashboard" style={{
        color: '#1a1a2e',
        textDecoration: 'none',
        fontSize: '1.2rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{
          background: '#7c3aed',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: '700'
        }}>ND</span>
        NexusDeploy
      </Link>
      <div>
        {token ? (
          <button onClick={logout} style={{
            background: 'transparent',
            border: '1px solid #e2e8f0',
            color: '#666',
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            Déconnexion
          </button>
        ) : (
          <Link to="/login" style={{ color: '#7c3aed' }}>Connexion</Link>
        )}
      </div>
    </nav>
  )
}

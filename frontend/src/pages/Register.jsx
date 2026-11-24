import { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { API_BASE_URL } from '../config'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email, password
      })
      navigate('/login')
    } catch (err) {
      setError('Email deja utilise')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f7fa'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{
            background: '#7c3aed',
            color: 'white',
            padding: '4px 16px',
            borderRadius: '8px',
            fontSize: '1.5rem',
            fontWeight: '700'
          }}>S</span>
          <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', color: '#1a1a2e' }}>Inscription</h2>
          <p style={{ color: '#888', marginTop: '0.5rem' }}>Creez votre compte Sarah Platform</p>
        </div>

        {error && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fc8181',
            color: '#e53e3e',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#555', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: '#555', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" style={{
            width: '100%',
            background: loading ? '#5b21b6' : '#7c3aed',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            {loading ? 'Creation...' : 'S inscrire'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#888', fontSize: '0.9rem' }}>
          Deja un compte ?{' '}
          <Link to="/login" style={{ color: '#7c3aed' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

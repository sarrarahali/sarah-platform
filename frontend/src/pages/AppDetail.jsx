import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'

export default function AppDetail() {
  const [app, setApp] = useState(null)
  const [logs, setLogs] = useState('')
  const [stats, setStats] = useState(null)
  const [deployments, setDeployments] = useState([])
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const logsRef = useRef(null)

  useEffect(() => {
    if (!token) navigate('/login')
    fetchApp()
    fetchStats()
    fetchDeployments()
    const interval = setInterval(fetchStats, 5000)
    streamLogs()
    return () => clearInterval(interval)
  }, [])

  const fetchApp = async () => {
    const res = await axios.get('http://localhost:3000/api/apps', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const found = res.data.apps.find(a => a.id === parseInt(id))
    setApp(found)
  }

  const fetchStats = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/monitor/${id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(res.data)
    } catch (err) {}
  }

  const fetchDeployments = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/deployments/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDeployments(res.data.deployments)
    } catch (err) {}
  }

  const streamLogs = () => {
    const es = new EventSource(
      `http://localhost:3000/api/monitor/${id}/logs?token=${token}`
    )
    es.onmessage = (e) => {
      setLogs(prev => prev + e.data + '\n')
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight
      }
    }
    return () => es.close()
  }

  const statusColor = (status) => {
    if (status === 'success') return { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' }
    if (status === 'failed') return { bg: '#fff5f5', color: '#e53e3e', border: '#fc8181' }
    return { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>

      <button onClick={() => navigate('/dashboard')} style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        color: '#555',
        padding: '0.4rem 1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}>
        Retour
      </button>

      {app && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: app.status === 'running' ? '#22c55e' : '#ccc'
            }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a2e' }}>{app.name}</h1>
            <span style={{
              background: app.status === 'running' ? '#f0fdf4' : '#f8fafc',
              color: app.status === 'running' ? '#16a34a' : '#888',
              border: `1px solid ${app.status === 'running' ? '#86efac' : '#e2e8f0'}`,
              padding: '2px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem'
            }}>
              {app.status}
            </span>
          </div>
          {app.url && (
            <a href={app.url} target="_blank" rel="noreferrer" style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              color: '#7c3aed',
              fontSize: '0.9rem'
            }}>
              {app.url} ↗
            </a>
          )}
        </div>
      )}

      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>CPU</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
              {stats.cpu}
            </div>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Memoire</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
              {stats.memory}
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#555', marginBottom: '1rem' }}>
          Historique des deployements
        </h3>
        {deployments.length === 0 && (
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Aucun deploiement</p>
        )}
        {deployments.map(d => {
  const s = statusColor(d.status)
  return ( 
    <div key={d.id} style={{
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      marginBottom: '0.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            {d.status}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#555' }}>
            {d.image_name || 'Build en cours'}
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
          {new Date(d.created_at).toLocaleString()}
        </span>
      </div>
      {d.status === 'failed' && d.logs && (
  <div style={{
    marginTop: '0.75rem',
    background: '#fff5f5',
    border: '1px solid #fc8181',
    padding: '1rem',
    borderRadius: '8px',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem'
    }}>
      <span style={{ fontSize: '1rem' }}>❌</span>
      <strong style={{ color: '#e53e3e', fontSize: '0.9rem' }}>
        Echec du deploiement
      </strong>
    </div>
    <p style={{
      color: '#c53030',
      fontSize: '0.85rem',
      margin: 0,
      lineHeight: '1.5'
    }}>
      {d.logs}
    </p>
  </div>
)}
    </div>
  )
})}
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#f8fafc'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '0.85rem', color: '#555' }}>Logs en temps reel</span>
        </div>
        <div ref={logsRef} style={{
          background: '#1e1e2e',
          padding: '1rem 1.5rem',
          height: '400px',
          overflowY: 'scroll',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          lineHeight: '1.6'
        }}>
          <pre style={{ color: '#22c55e', margin: 0 }}>{logs || 'En attente des logs...'}</pre>
        </div>
      </div>
    </div>
  )
}

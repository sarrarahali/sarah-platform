import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'

export default function AppDetail() {
  const [app, setApp] = useState(null)
  const [logs, setLogs] = useState('')
  const [stats, setStats] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState({ text: '', type: 'info' })
  const [envVars, setEnvVars] = useState({})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [envSaving, setEnvSaving] = useState(false)
  const [structure, setStructure] = useState(null)
  const { token } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const logsRef = useRef(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchApp()
    fetchStats()
    fetchDeployments()
    fetchEnv()
    fetchStructure()
    const statsInterval = setInterval(fetchStats, 5000)
    const cleanupLogs = streamLogs()

    return () => {
      clearInterval(statsInterval)
      if (cleanupLogs) cleanupLogs()
    }
  }, [id, token])

  const fetchApp = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/apps/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApp(res.data.app)
      if (res.data.app?.structure) {
        setStructure(typeof res.data.app.structure === 'string' ? JSON.parse(res.data.app.structure) : res.data.app.structure)
      }
    } catch (err) {
      try {
        const resAll = await axios.get('http://localhost:3000/api/apps', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const found = resAll.data.apps?.find(a => a.id === parseInt(id))
        if (found) {
          setApp(found)
          if (found.structure) {
            setStructure(typeof found.structure === 'string' ? JSON.parse(found.structure) : found.structure)
          }
        }
      } catch (e) {}
    }
  }

  const fetchEnv = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/apps/${id}/env`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEnvVars(res.data.env || {})
    } catch (e) {}
  }

  const fetchStructure = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/apps/${id}/structure`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.structure) {
        setStructure(typeof res.data.structure === 'string' ? JSON.parse(res.data.structure) : res.data.structure)
      }
    } catch (e) {}
  }

  const handleSaveEnv = async (updatedEnv) => {
    setEnvSaving(true)
    try {
      const res = await axios.post(
        `http://localhost:3000/api/apps/${id}/env`,
        { env: updatedEnv },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setEnvVars(res.data.env || updatedEnv)
      setActionMessage({ text: 'Variables d\'environnement enregistrées ! Cliquez sur Redémarrer pour appliquer.', type: 'success' })
    } catch (err) {
      setActionMessage({ text: 'Erreur lors de la sauvegarde des variables d\'environnement', type: 'error' })
    } finally {
      setEnvSaving(false)
      setTimeout(() => setActionMessage({ text: '', type: 'info' }), 4000)
    }
  }

  const handleAddEnv = (e) => {
    e.preventDefault()
    if (!newKey.trim()) return
    const key = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const updated = { ...envVars, [key]: newValue }
    setNewKey('')
    setNewValue('')
    handleSaveEnv(updated)
  }

  const handleDeleteEnv = (keyToDelete) => {
    const updated = { ...envVars }
    delete updated[keyToDelete]
    handleSaveEnv(updated)
  }

  const fetchStats = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/monitor/${id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(res.data)
    } catch (err) {
      setStats(null)
    }
  }

  const fetchDeployments = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/deployments/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDeployments(res.data.deployments || [])
    } catch (err) {}
  }

  const streamLogs = () => {
    if (!token || !id) return
    const es = new EventSource(
      `http://localhost:3000/api/monitor/${id}/logs?token=${token}`
    )
    es.onmessage = (e) => {
      setLogs(prev => prev + e.data + '\n')
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight
      }
    }
    es.onerror = () => {
      // Silently close on error or when connection terminates
      es.close()
    }
    return () => es.close()
  }

  const handleAction = async (action) => {
    setActionLoading(true)
    setActionMessage({ text: '', type: 'info' })
    try {
      const res = await axios.post(
        `http://localhost:3000/api/apps/${id}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setActionMessage({ text: res.data.message || 'Action exécutée avec succès', type: 'success' })
      await fetchApp()
      await fetchStats()
    } catch (err) {
      const errMsg = err.response?.data?.error || `Erreur lors de l'action ${action}`
      setActionMessage({ text: errMsg, type: 'error' })
    } finally {
      setActionLoading(false)
      setTimeout(() => setActionMessage({ text: '', type: 'info' }), 4000)
    }
  }

  const statusColor = (status) => {
    if (status === 'success' || status === 'running') return { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' }
    if (status === 'failed') return { bg: '#fff5f5', color: '#e53e3e', border: '#fc8181' }
    if (status === 'stopped') return { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' }
    return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
  }

  const appStatus = app?.status || 'unknown'
  const isRunning = appStatus === 'running'

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
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'pointer'
      }}>
        ← Retour au Dashboard
      </button>

      {actionMessage.text && (
        <div style={{
          padding: '0.8rem 1.2rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          border: `1px solid ${actionMessage.type === 'error' ? '#fc8181' : '#86efac'}`,
          background: actionMessage.type === 'error' ? '#fff5f5' : '#f0fdf4',
          color: actionMessage.type === 'error' ? '#c53030' : '#16a34a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage({ text: '', type: 'info' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {app && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isRunning ? '#22c55e' : (appStatus === 'stopped' ? '#f59e0b' : '#ef4444')
              }} />
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>{app.name}</h1>
              <span style={{
                background: statusColor(appStatus).bg,
                color: statusColor(appStatus).color,
                border: `1px solid ${statusColor(appStatus).border}`,
                padding: '3px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {appStatus.toUpperCase()}
              </span>
            </div>

            {/* Container Lifecycle Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isRunning ? (
                <>
                  <button
                    onClick={() => handleAction('restart')}
                    disabled={actionLoading}
                    style={{
                      background: '#ede9fe',
                      border: '1px solid #ddd6fe',
                      color: '#6d28d9',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🔄 Redémarrer
                  </button>
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading}
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      color: '#e11d48',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ⏹ Arrêter
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleAction('start')}
                  disabled={actionLoading}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#16a34a',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  ▶ Démarrer
                </button>
              )}
            </div>
          </div>

          {app.url && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>URL d'accès :</span>
              <a href={app.url} target="_blank" rel="noreferrer" style={{
                color: '#7c3aed',
                fontSize: '0.9rem',
                fontWeight: '600',
                textDecoration: 'none'
              }}>
                {app.url} ↗
              </a>
            </div>
          )}

          {/* Tech Stack Detection */}
          {structure && (
            <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600' }}>
                STRUCTURE & TECHNOLOGIES DÉTECTÉES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', color: '#334155' }}>
                  📦 Type : <strong>{structure.type || 'Standard'}</strong>
                </span>
                {structure.frontend?.framework && (
                  <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', color: '#1d4ed8' }}>
                    ⚛️ Frontend : <strong>{structure.frontend.framework}</strong>
                  </span>
                )}
                {structure.backend?.framework && (
                  <span style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', color: '#7e22ce' }}>
                    ⚡ Backend : <strong>{structure.backend.framework}</strong>
                  </span>
                )}
                {structure.database?.type && (
                  <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', color: '#15803d' }}>
                    🗄 Base de données : <strong>{structure.database.type}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Environment Variables Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>
              Variables d'environnement (.env)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Injectées dans le conteneur Docker lors du démarrage et redémarrage
            </p>
          </div>
        </div>

        {/* Form to add new env var */}
        <form onSubmit={handleAddEnv} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="CLÉ (ex: API_KEY)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            style={{
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              flex: '1 1 180px'
            }}
          />
          <input
            type="text"
            placeholder="VALEUR"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            style={{
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              flex: '2 1 240px'
            }}
          />
          <button
            type="submit"
            disabled={envSaving || !newKey.trim()}
            style={{
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: (!newKey.trim() || envSaving) ? 'not-allowed' : 'pointer'
            }}
          >
            {envSaving ? 'Ajout...' : '+ Ajouter'}
          </button>
        </form>

        {/* Existing Env Vars Table */}
        {Object.keys(envVars).length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
            Aucune variable d'environnement personnalisée configurée.
          </p>
        ) : (
          <div style={{ borderRadius: '8px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.8rem', color: '#475569', fontWeight: '600' }}>Variable</th>
                  <th style={{ padding: '0.6rem 0.8rem', color: '#475569', fontWeight: '600' }}>Valeur</th>
                  <th style={{ padding: '0.6rem 0.8rem', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(envVars).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace', fontWeight: '600', color: '#0f172a' }}>{k}</td>
                    <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace', color: '#475569' }}>{v}</td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteEnv(k)}
                        title="Supprimer"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Utilisation CPU</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
              {stats.cpu || '0%'}
            </div>
          </div>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Utilisation Mémoire</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
              {stats.memory || '0 MB'}
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
          Historique des déploiements
        </h3>
        {deployments.length === 0 && (
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Aucun déploiement enregistré</p>
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
                      Échec du déploiement
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
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#22c55e' : '#94a3b8' }} />
            <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: '500' }}>Logs en direct (streaming)</span>
          </div>
          <button
            onClick={() => setLogs('')}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            Effacer
          </button>
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
          <pre style={{ color: '#22c55e', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {logs || (isRunning ? 'En attente de nouveaux logs...' : 'Conteneur arrêté ou aucun log disponible.')}
          </pre>
        </div>
      </div>
    </div>
  )
}

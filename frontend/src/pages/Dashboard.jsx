import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Dashboard() {
  const [apps, setApps] = useState([])
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [gitUrl, setGitUrl] = useState('')
  const [gitName, setGitName] = useState('')
  const [gitLoading, setGitLoading] = useState(false)
  const [gitError, setGitError] = useState('')
  const { token } = useAuth()
  const navigate = useNavigate()

  const fetchApps = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/apps', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setApps(res.data.apps)
    } catch (err) {}
  }

  useEffect(() => {
    if (!token) navigate('/login')
    else fetchApps()
  }, [token])

  const createApp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post(
        'http://localhost:3000/api/apps',
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const appId = res.data.app.id
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        await axios.post(
          `http://localhost:3000/api/apps/${appId}/upload`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
      setName('')
      setFile(null)
      fetchApps()
    } catch (err) {
      alert('Erreur lors de la creation')
    }
    setLoading(false)
  }

  const deployFromGit = async (e) => {
    e.preventDefault()
    if (!gitUrl || !gitName) return
    setGitLoading(true)
    setGitError('')
    try {
      const res = await axios.post(
        'http://localhost:3000/api/apps',
        { name: gitName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const appId = res.data.app.id
      const gitRes = await axios.post(
        `http://localhost:3000/api/apps/${appId}/git`,
        { repoUrl: gitUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setGitUrl('')
      setGitName('')
      fetchApps()
      alert('Clone git en cours, actualise dans 2 minutes !')
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur : verifiez que le repo est public et que l URL est correcte'
      setGitError(msg)
      fetchApps()
    }
    setGitLoading(false)
  }

  const deleteApp = async (id) => {
    await axios.delete(`http://localhost:3000/api/apps/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchApps()
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1a1a2e' }}>Dashboard</h1>
        <p style={{ color: '#888', marginTop: '0.3rem' }}>
          Gerez vos applications deployees
        </p>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
          Deployer via ZIP
        </h2>
        <form onSubmit={createApp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Nom de l application"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
            required
          />
          <label style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            color: file ? '#7c3aed' : '#888',
            fontSize: '0.9rem',
            whiteSpace: 'nowrap'
          }}>
            {file ? file.name : 'Choisir un ZIP'}
            <input
              type="file"
              accept=".zip"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
          <button type="submit" style={{
            background: loading ? '#5b21b6' : '#7c3aed',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}>
            {loading ? 'Deploiement...' : 'Creer et deployer'}
          </button>
        </form>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
          Deployer depuis GitHub
        </h2>
        {gitError && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fc8181',
            color: '#e53e3e',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {gitError}
          </div>
        )}
        <form onSubmit={deployFromGit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Nom de l application"
            value={gitName}
            onChange={e => setGitName(e.target.value)}
            style={{ flex: 1, minWidth: '150px' }}
            required
          />
          <input
            type="text"
            placeholder="https://github.com/user/repo"
            value={gitUrl}
            onChange={e => setGitUrl(e.target.value)}
            style={{ flex: 2, minWidth: '200px' }}
            required
          />
          <button type="submit" style={{
            background: gitLoading ? '#374151' : '#1a1a2e',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}>
            {gitLoading ? 'Clonage...' : 'Cloner et deployer'}
          </button>
        </form>
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#666', marginBottom: '1rem' }}>
        Mes applications ({apps.length})
      </h2>

      {apps.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#aaa',
          border: '1px dashed #e2e8f0',
          borderRadius: '16px',
          background: '#ffffff'
        }}>
          Aucune application deployee
        </div>
      )}

      {apps.map(app => (
        <div key={app.id} style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.2rem 1.5rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: app.status === 'running' ? '#22c55e' : app.status === 'failed' ? '#ef4444' : '#ccc'
            }} />
            <div>
              <strong style={{ fontSize: '1rem', color: '#1a1a2e' }}>{app.name}</strong>
              <div style={{ fontSize: '0.8rem', color: app.status === 'failed' ? '#ef4444' : '#888', marginTop: '2px' }}>
                {app.status === 'running' ? 'En cours execution' : app.status === 'failed' ? 'Echec du deploiement' : app.status}
              </div>
            </div>
            {app.url && (
              <a href={app.url} target="_blank" rel="noreferrer" style={{
                fontSize: '0.8rem',
                color: '#7c3aed',
                background: '#f3f0ff',
                padding: '2px 10px',
                borderRadius: '20px',
                border: '1px solid #c4b5fd'
              }}>
                {app.url}
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to={`/app/${app.id}`} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#555',
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}>
              Details
            </Link>
            <button onClick={() => deleteApp(app.id)} style={{
              background: '#fff5f5',
              border: '1px solid #fc8181',
              color: '#e53e3e',
              padding: '0.4rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}>
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
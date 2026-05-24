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
  const { token, logout } = useAuth()
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
    const interval = setInterval(fetchApps, 10000)
    return () => clearInterval(interval)
  }, [token])

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const running = apps.filter(a => a.status === 'running').length
  const failed = apps.filter(a => a.status === 'failed').length

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
      alert('Error creating app')
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
      await axios.post(
        `http://localhost:3000/api/apps/${appId}/git`,
        { repoUrl: gitUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setGitUrl('')
      setGitName('')
      fetchApps()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error: check that the repo is public'
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

  const statusColor = (status) => {
    if (status === 'running') return '#22c55e'
    if (status === 'failed') return '#e53e3e'
    if (status === 'building') return '#f59e0b'
    return '#ccc'
  }

  const badgeStyle = (status) => {
    const base = { fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }
    if (status === 'running') return { ...base, background: '#f0fdf4', color: '#16a34a' }
    if (status === 'failed') return { ...base, background: '#fff5f5', color: '#e53e3e' }
    if (status === 'building') return { ...base, background: '#fffbeb', color: '#d97706' }
    return { ...base, background: '#f5f5f5', color: '#888' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8' }}>

      {/* Navbar */}
      <nav style={{
        background: '#fff',
        borderBottom: '0.5px solid #e5e7eb',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '50px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px', height: '26px', background: '#7c3aed',
            borderRadius: '6px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: '500'
          }}>S</div>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#111' }}>Sarah Platform</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {token ? JSON.parse(atob(token.split('.')[1])).email : ''}
          </span>
          <div style={{ width: '0.5px', height: '14px', background: '#e5e7eb' }} />
          <button onClick={logout} style={{
            fontSize: '12px', color: '#555', border: '0.5px solid #e5e7eb',
            padding: '4px 12px', borderRadius: '6px', background: '#fff', cursor: 'pointer'
          }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total apps', value: apps.length, color: '#111' },
            { label: 'Running', value: running, color: '#16a34a' },
            { label: 'Failed', value: failed, color: '#e53e3e' }
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', border: '0.5px solid #e5e7eb',
              borderRadius: '10px', padding: '14px 16px'
            }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '500', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Deploy section */}
        <div style={{
          background: '#fff', border: '0.5px solid #e5e7eb',
          borderRadius: '12px', padding: '16px', marginBottom: '20px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '10px' }}>
            Deploy via ZIP
          </div>
          <form onSubmit={createApp} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="App name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                flex: 1, minWidth: '150px', height: '34px',
                border: '0.5px solid #e5e7eb', borderRadius: '7px',
                padding: '0 10px', fontSize: '12px', background: '#fff'
              }}
              required
            />
            <label style={{
              height: '34px', display: 'flex', alignItems: 'center',
              padding: '0 12px', border: '0.5px solid #e5e7eb',
              borderRadius: '7px', cursor: 'pointer', fontSize: '12px',
              color: file ? '#7c3aed' : '#888', background: '#fafafa',
              whiteSpace: 'nowrap'
            }}>
              {file ? file.name : 'Choose ZIP file'}
              <input type="file" accept=".zip" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            <button type="submit" style={{
              height: '34px', background: loading ? '#5b21b6' : '#7c3aed',
              color: '#fff', border: 'none', borderRadius: '7px',
              padding: '0 16px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              {loading ? 'Deploying...' : 'Deploy'}
            </button>
          </form>

          <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '10px' }}>
            Deploy from GitHub
          </div>
          {gitError && (
            <div style={{
              background: '#fff5f5', border: '0.5px solid #fca5a5',
              borderRadius: '7px', padding: '8px 12px', marginBottom: '10px',
              fontSize: '12px', color: '#e53e3e'
            }}>
              {gitError}
            </div>
          )}
          <form onSubmit={deployFromGit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="App name"
              value={gitName}
              onChange={e => setGitName(e.target.value)}
              style={{
                width: '140px', height: '34px',
                border: '0.5px solid #e5e7eb', borderRadius: '7px',
                padding: '0 10px', fontSize: '12px', background: '#fff'
              }}
              required
            />
            <input
              type="text"
              placeholder="https://github.com/user/repo"
              value={gitUrl}
              onChange={e => setGitUrl(e.target.value)}
              style={{
                flex: 1, minWidth: '200px', height: '34px',
                border: '0.5px solid #e5e7eb', borderRadius: '7px',
                padding: '0 10px', fontSize: '12px', background: '#fff'
              }}
              required
            />
            <button type="submit" style={{
              height: '34px', background: gitLoading ? '#333' : '#111',
              color: '#fff', border: 'none', borderRadius: '7px',
              padding: '0 16px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              {gitLoading ? 'Cloning...' : 'Clone & deploy'}
            </button>
          </form>
        </div>

        {/* Apps list */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>
            My applications ({apps.length})
          </span>
        </div>

        {apps.length === 0 && (
          <div style={{
            background: '#fff', border: '0.5px dashed #e5e7eb',
            borderRadius: '12px', padding: '40px',
            textAlign: 'center', color: '#aaa', fontSize: '13px'
          }}>
            No applications deployed yet
          </div>
        )}

        {apps.map(app => (
          <div key={app.id} style={{
            background: '#fff',
            border: '0.5px solid #e5e7eb',
            borderLeft: `3px solid ${statusColor(app.status)}`,
            borderRadius: '0 10px 10px 0',
            padding: '12px 16px',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{app.name}</span>
                <span style={badgeStyle(app.status)}>{app.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <Link to={`/app/${app.id}`} style={{
                  fontSize: '11px', border: '0.5px solid #e5e7eb',
                  borderRadius: '5px', padding: '3px 10px',
                  background: '#fff', color: '#555', textDecoration: 'none'
                }}>Details</Link>
                <button onClick={() => deleteApp(app.id)} style={{
                  fontSize: '11px', border: '0.5px solid #fca5a5',
                  borderRadius: '5px', padding: '3px 10px',
                  background: '#fff', color: '#e53e3e', cursor: 'pointer'
                }}>Delete</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#7c3aed' }}>
                  {app.url}
                </a>
              )}
              {app.url && <div style={{ width: '0.5px', height: '10px', background: '#e5e7eb' }} />}
              <span style={{ fontSize: '11px', color: '#aaa' }}>
                {app.status === 'building' ? 'Build in progress...' :
                 app.status === 'created' ? 'Not deployed yet' :
                 `deployed ${timeAgo(app.created_at)}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

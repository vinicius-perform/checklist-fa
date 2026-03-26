import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import LZString from 'lz-string'

// Components
import Header from './components/Header'
import UserBar from './components/UserBar'
import Stepper from './components/Stepper'
import ProjectCard from './components/ProjectCard'
import Login from './components/Login'
import StepClient from './components/StepClient'
import StepNotepad from './components/StepNotepad'
import StepResponsible from './components/StepResponsible'
import StepFinal from './components/StepFinal'

function App() {
  const [view, setView] = useState('home') // 'home', 'login', 'wizard'
  const [step, setStep] = useState(1)
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [isSharedView, setIsSharedView] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [shortId, setShortId] = useState(null)
  const [sharingLoading, setSharingLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  
  const [clientData, setClientData] = useState({ name: '' })
  const [notepadContent, setNotepadContent] = useState('')
  const [taskGroups, setTaskGroups] = useState([])

  const autoSaveTimerRef = useRef(null)

  // Use function declarations for all major logic to avoid TDZ issues
  function applySharedPayload(payload) {
    try {
      let decoded
      const decompressed = LZString.decompressFromEncodedURIComponent(payload)
      if (decompressed) {
        decoded = JSON.parse(decompressed)
      } else {
        decoded = JSON.parse(decodeURIComponent(escape(atob(payload))))
      }

      const name = decoded.n || decoded.name
      const groups = (decoded.g || decoded.groups || []).map(group => ({
        id: Date.now() + Math.random(),
        theme: group.t || group.theme,
        items: (group.i || group.items || []).map(item => ({
          id: Date.now() + Math.random(),
          text: item.x || item.text,
          responsible: item.r || item.responsible,
          completed: item.c !== undefined ? !!item.c : (!!item.completed)
        }))
      }))

      setClientData({ name })
      setTaskGroups(groups)
      setIsSharedView(true)
      setView('wizard')
      setStep(4)
    } catch (e) {
      console.error('Erro ao decodificar payload compartilhado', e)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sId = params.get('s')
    const shareData = params.get('share')

    if (sId) {
      ;(async () => {
        try {
          const res = await fetch(`/api/load/${sId}`)
          if (res.ok) {
            const { payload } = await res.json()
            applySharedPayload(payload)
            setShortId(sId)
          } else {
            alert('Link expirado ou inválido.')
          }
        } catch (e) {
          console.error('Erro ao carregar link curto', e)
        }
      })()
      return
    }

    if (shareData) {
      applySharedPayload(shareData)
      return
    }

    const savedProjects = localStorage.getItem('checklist-fa-projects')
    if (savedProjects) setProjects(JSON.parse(savedProjects))

    const savedUser = localStorage.getItem('checklist-fa-user')
    if (savedUser) setUser(JSON.parse(savedUser))
  }, [])

  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('checklist-fa-projects', JSON.stringify(projects))
    }
  }, [projects])

  useEffect(() => {
    if (!shortId || isSharedView || taskGroups.length === 0) return

    setIsSyncing(true)
    clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const compactData = {
          n: clientData.name,
          g: taskGroups.map(g => ({
            t: g.theme,
            i: g.items.map(t => ({
              x: t.text,
              r: t.responsible,
              c: t.completed ? 1 : 0
            }))
          }))
        }
        const payload = LZString.compressToEncodedURIComponent(JSON.stringify(compactData))
        await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload, id: shortId })
        })
      } catch (_) {}
      setIsSyncing(false)
    }, 1500)

    return () => clearTimeout(autoSaveTimerRef.current)
  }, [taskGroups, clientData.name, shortId])

  async function handleLogin(e) {
    if (e) e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        localStorage.setItem('checklist-fa-user', JSON.stringify(data.user))
        localStorage.setItem('checklist-fa-token', data.token)
        setView('home')
      } else {
        setLoginError('Credenciais inválidas.')
      }
    } catch (e) {
      setLoginError('Erro ao conectar com o servidor.')
    }
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('checklist-fa-user')
    localStorage.removeItem('checklist-fa-token')
    setView('home')
  }

  function startNewProject() {
    if (!user) {
      setView('login')
      return
    }
    setActiveProjectId(Date.now())
    setClientData({ name: '' })
    setNotepadContent('')
    setTaskGroups([])
    setStep(1)
    setView('wizard')
  }

  function loadProject(project) {
    setActiveProjectId(project.id)
    setClientData({ name: project.name })
    setNotepadContent(project.notepad || '')
    setTaskGroups(project.groups || [])
    setStep(4)
    setView('wizard')
  }

  function deleteProject(e, id) {
    e.stopPropagation()
    if (confirm('Excluir este projeto permanentemente?')) {
      setProjects(projects.filter(p => p.id !== id))
    }
  }

  function saveCurrentProject() {
    if (isSharedView) return

    const updatedProject = {
      id: activeProjectId,
      name: clientData.name,
      notepad: notepadContent,
      groups: taskGroups,
      lastUpdate: new Date().toISOString()
    }

    setProjects(prev => {
      const exists = prev.find(p => p.id === activeProjectId)
      if (exists) return prev.map(p => p.id === activeProjectId ? updatedProject : p)
      return [updatedProject, ...prev]
    })
  }

  useEffect(() => {
    if (view === 'wizard' && activeProjectId) saveCurrentProject()
  }, [taskGroups, clientData, step])

  function handleGenerateCheckpoints() {
    const lines = notepadContent.split('\n').filter(line => line.trim() !== '')
    const groups = []
    let currentGroup = null

    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('-')) {
        if (!currentGroup) {
          currentGroup = { id: Date.now() + Math.random(), theme: 'Geral', items: [] }
          groups.push(currentGroup)
        }
        currentGroup.items.push({
          id: Date.now() + Math.random(),
          text: trimmed.substring(1).trim(),
          responsible: '',
          completed: false
        })
      } else {
        currentGroup = {
          id: Date.now() + Math.random(),
          theme: trimmed,
          items: []
        }
        groups.push(currentGroup)
      }
    })

    setTaskGroups(groups.filter(g => g.items.length > 0))
    setStep(3)
  }

  function toggleTask(groupId, taskId) {
    if (!user && !isSharedView) {
      alert('Acesso Restrito: Apenas usuários logados podem marcar tarefas.')
      return
    }
    setTaskGroups(current => current.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task)
        }
      }
      return group
    }))
  }

  function calculateProgress(groups) {
    if (!groups || groups.length === 0) return 0
    let total = 0
    let completed = 0
    groups.forEach(g => {
      total += g.items.length
      completed += g.items.filter(i => i.completed).length
    })
    return total === 0 ? 0 : Math.round((completed / total) * 100)
  }

  async function generateShareLink() {
    setSharingLoading(true)
    try {
      const compactData = {
        n: clientData.name,
        g: taskGroups.map(g => ({
          t: g.theme,
          i: g.items.map(t => ({
            x: t.text,
            r: t.responsible,
            c: t.completed ? 1 : 0
          }))
        }))
      }
      const payload = LZString.compressToEncodedURIComponent(JSON.stringify(compactData))
      let shortUrl = null
      
      try {
        const res = await fetch('/api/shorten', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload })
        })
        if (res.ok) {
          const { id } = await res.json()
          shortUrl = `${window.location.origin}${window.location.pathname}?s=${id}`
          setShortId(id)
        }
      } catch (_) {}

      const finalUrl = shortUrl || `${window.location.origin}${window.location.pathname}?share=${payload}`
      await navigator.clipboard.writeText(finalUrl)
      alert(shortUrl ? '🔗 Link curto copiado!' : '📋 Link copiado (versão completa)!')
    } catch (err) {
      alert('Erro ao gerar link.')
    } finally {
      setSharingLoading(false)
    }
  }

  async function saveToRedis() {
    if (!shortId) return
    setSaveStatus('saving')
    try {
      const compactData = {
        n: clientData.name,
        g: taskGroups.map(g => ({
          t: g.theme,
          i: g.items.map(t => ({
            x: t.text,
            r: t.responsible,
            c: t.completed ? 1 : 0
          }))
        }))
      }
      const payload = LZString.compressToEncodedURIComponent(JSON.stringify(compactData))
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, id: shortId })
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
    } catch (_) {
      setSaveStatus('error')
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
  }

  return (
    <div className="container fade-in">
      <Header onClick={() => setView('home')} />
      <UserBar user={user} onLogout={handleLogout} />

      {view === 'home' && (
        <div className="home-screen fade-in">
          <div className="dashboard-header">
            <h2>Projetos em Andamento</h2>
            <button className="btn-primary" onClick={startNewProject}>+ Novo Projeto</button>
          </div>
          <div className="project-grid">
            <div className="project-card new-project-card" onClick={startNewProject}>
              <div className="new-icon">+</div>
              <span>Iniciar Novo Checklist</span>
            </div>
            {projects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onClick={loadProject} 
                onDelete={deleteProject} 
                calculateProgress={calculateProgress}
              />
            ))}
          </div>
        </div>
      )}

      {view === 'login' && (
        <Login 
          loginForm={loginForm} 
          setLoginForm={setLoginForm} 
          onSubmit={handleLogin} 
          onBack={() => setView('home')} 
          error={loginError} 
        />
      )}

      {view === 'wizard' && (
        <>
          {step === 4 && (
            <div className="global-progress-fixed">
              <div className="global-progress-fill" style={{ width: `${calculateProgress(taskGroups)}%` }}></div>
            </div>
          )}
          <Stepper 
            currentStep={step} 
            setStep={setStep} 
            clientName={clientData.name} 
            notepadContent={notepadContent} 
            taskGroups={taskGroups} 
          />
          <main className="main-content">
            <div className="glass-card">
              {step === 1 && (
                <StepClient 
                  clientData={clientData} 
                  setClientData={setClientData} 
                  onNext={() => setStep(2)} 
                  onCancel={() => setView('home')} 
                />
              )}
              {step === 2 && (
                <StepNotepad 
                  notepadContent={notepadContent} 
                  setNotepadContent={setNotepadContent} 
                  onNext={handleGenerateCheckpoints} 
                  onPrev={() => setStep(1)} 
                />
              )}
              {step === 3 && (
                <StepResponsible 
                  taskGroups={taskGroups} 
                  updateResponsible={(gid, tid, resp) => {
                    setTaskGroups(taskGroups.map(g => g.id === gid ? {
                      ...g,
                      items: g.items.map(t => t.id === tid ? { ...t, responsible: resp } : t)
                    } : g))
                  }} 
                  onNext={() => setStep(4)} 
                  onPrev={() => setStep(2)} 
                />
              )}
              {step === 4 && (
                <StepFinal 
                  clientData={clientData}
                  taskGroups={taskGroups}
                  user={user}
                  isSharedView={isSharedView}
                  isSyncing={isSyncing}
                  isEditingName={isEditingName}
                  setIsEditingName={setIsEditingName}
                  setClientName={(name) => setClientData({ ...clientData, name })}
                  toggleTask={toggleTask}
                  setTaskGroups={setTaskGroups}
                  generateShareLink={generateShareLink}
                  sharingLoading={sharingLoading}
                  shortId={shortId}
                  saveToRedis={saveToRedis}
                  saveStatus={saveStatus}
                  onPrev={() => setStep(3)}
                  onExit={() => {
                    if (isSharedView) window.location.href = window.location.origin + window.location.pathname
                    else setView('home')
                  }}
                />
              )}
            </div>
          </main>
        </>
      )}
    </div>
  )
}

export default App

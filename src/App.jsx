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

  const getHeaders = () => {
    const token = localStorage.getItem('checklist-fa-token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

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

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects', { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (e) {
      console.error('Erro ao buscar projetos', e)
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
            setClientData({ name: payload.name })
            setTaskGroups(payload.groups || [])
            setIsSharedView(true)
            setView('wizard')
            setStep(4)
            setActiveProjectId(sId)
          } else {
            alert('Checklist não encontrado.')
          }
        } catch (e) {
          console.error('Erro ao carregar checklist', e)
        }
      })()
      return
    }

    if (shareData) {
      applySharedPayload(shareData)
      return
    }

    const savedUser = localStorage.getItem('checklist-fa-user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchProjects()
      // Migração automática de dados locais para o Redis no primeiro acesso após login
      const migrateLocalData = async () => {
        const localProjectsStr = localStorage.getItem('checklist_fa_projects')
        if (localProjectsStr) {
          try {
            const localProjects = JSON.parse(localProjectsStr)
            console.log('Detectados projetos locais antigos para migração:', localProjects.length)
            
            for (const proj of localProjects) {
              await fetch('/api/projects', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ project: proj })
              })
            }
            
            // Após migrar tudo, busca novamente para atualizar a lista do estado
            fetchProjects()
            localStorage.removeItem('checklist_fa_projects') // Limpa o legado
            console.log('Migração concluída com sucesso.')
          } catch (e) {
            console.error('Erro na migração de dados locais:', e)
          }
        }
      }
      migrateLocalData()
    }
  }, [user])

  // Automatic background saving removed in favor of explicit save for Admin
  // and public check syncing.

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

  async function loadProject(project) {
    setActiveProjectId(project.id)
    setClientData({ name: project.name })
    setNotepadContent(project.notepad || '')
    setTaskGroups(project.groups || [])
    setStep(4)
    setView('wizard')
  }

  async function deleteProject(e, id) {
    e.stopPropagation()
    if (confirm('Excluir este projeto permanentemente?')) {
      try {
        const res = await fetch(`/api/projects?id=${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        })
        if (res.ok) {
          setProjects(projects.filter(p => p.id !== id))
        }
      } catch (e) {
        alert('Erro ao excluir projeto.')
      }
    }
  }

  async function saveCurrentProject() {
    if (isSharedView || !user) return

    setSaveStatus('saving')
    const updatedProject = {
      id: activeProjectId,
      name: clientData.name,
      notepad: notepadContent,
      groups: taskGroups,
      lastUpdate: new Date().toISOString()
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ project: updatedProject })
      })
      if (res.ok) {
        const data = await res.json()
        const savedProject = data.project
        setActiveProjectId(savedProject.id)
        setProjects(prev => {
          const exists = prev.find(p => p.id === savedProject.id)
          if (exists) return prev.map(p => p.id === savedProject.id ? savedProject : p)
          return [savedProject, ...prev]
        })
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
      }
    } catch (e) {
      setSaveStatus('error')
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  // Save projects only when they are essentially valid
  useEffect(() => {
    if (view === 'wizard' && user && taskGroups.length > 0 && step === 4) {
      saveCurrentProject()
    }
  }, [taskGroups, clientData.name])

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

  async function toggleTask(groupId, taskId) {
    // Current state toggle (Optimistic)
    let isCompleted = false
    setTaskGroups(current => current.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(task => {
            if (task.id === taskId) {
              isCompleted = !task.completed
              return { ...task, completed: isCompleted }
            }
            return task
          })
        }
      }
      return group
    }))

    // Sync to Redis
    try {
      setIsSyncing(true)
      await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: activeProjectId, 
          groupId, 
          taskId, 
          completed: isCompleted 
        })
      })
    } catch (e) {
      console.error('Erro ao sincronizar tarefa', e)
    } finally {
      setIsSyncing(false)
    }
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
    if (!activeProjectId) return
    const finalUrl = `${window.location.origin}${window.location.pathname}?s=${activeProjectId}`
    try {
      await navigator.clipboard.writeText(finalUrl)
      alert('🔗 Link de compartilhamento copiado!')
    } catch (err) {
      alert('Erro ao copiar link.')
    }
  }

  async function saveToRedis() {
    saveCurrentProject()
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

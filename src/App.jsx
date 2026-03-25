import React, { useState, useEffect } from 'react'
import './App.css'

const App = () => {
  const [view, setView] = useState('home') // 'home', 'wizard'
  const [step, setStep] = useState(1)
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [isSharedView, setIsSharedView] = useState(false)
  
  // Current project being edited/created
  const [clientData, setClientData] = useState({ name: '' })
  const [notepadContent, setNotepadContent] = useState('')
  const [taskGroups, setTaskGroups] = useState([])

  // Load projects from localStorage
  useEffect(() => {
    // Check for shared link
    const params = new URLSearchParams(window.location.search)
    const shareData = params.get('share')
    
    if (shareData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(shareData))))
        setClientData({ name: decoded.name })
        setTaskGroups(decoded.groups)
        setIsSharedView(true)
        setView('wizard')
        setStep(4)
        return
      } catch (e) {
        console.error("Erro ao decodificar link compartilhado", e)
      }
    }

    const savedProjects = localStorage.getItem('checklist-fa-projects')
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects))
    }
  }, [])

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('checklist-fa-projects', JSON.stringify(projects))
    }
  }, [projects])

  const startNewProject = () => {
    setActiveProjectId(Date.now())
    setClientData({ name: '' })
    setNotepadContent('')
    setTaskGroups([])
    setStep(1)
    setView('wizard')
  }

  const loadProject = (project) => {
    setActiveProjectId(project.id)
    setClientData({ name: project.name })
    setNotepadContent(project.notepad || '')
    setTaskGroups(project.groups || [])
    setStep(4) // Directly to checklist
    setView('wizard')
  }

  const deleteProject = (e, id) => {
    e.stopPropagation()
    if (confirm('Excluir este projeto permanentemente?')) {
      setProjects(projects.filter(p => p.id !== id))
    }
  }

  const saveCurrentProject = () => {
    if (isSharedView) return // Don't save shared projects to local list

    const updatedProject = {
      id: activeProjectId,
      name: clientData.name,
      notepad: notepadContent,
      groups: taskGroups,
      lastUpdate: new Date().toISOString()
    }

    setProjects(prev => {
      const exists = prev.find(p => p.id === activeProjectId)
      if (exists) {
        return prev.map(p => p.id === activeProjectId ? updatedProject : p)
      }
      return [updatedProject, ...prev]
    })
  }

  // Auto-save on specific actions
  useEffect(() => {
    if (view === 'wizard' && activeProjectId) {
      saveCurrentProject()
    }
  }, [taskGroups, clientData, step])

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const handleGenerateCheckpoints = () => {
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
    nextStep()
  }

  const updateResponsible = (groupId, taskId, responsible) => {
    setTaskGroups(taskGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(task => task.id === taskId ? { ...task, responsible } : task)
        }
      }
      return group
    }))
  }

  const toggleTask = (groupId, taskId) => {
    setTaskGroups(taskGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task)
        }
      }
      return group
    }))
  }

  const calculateProgress = (groups) => {
    if (!groups || groups.length === 0) return 0
    let total = 0
    let completed = 0
    groups.forEach(g => {
      total += g.items.length
      completed += g.items.filter(i => i.completed).length
    })
    return total === 0 ? 0 : Math.round((completed / total) * 100)
  }

  const generateShareLink = () => {
    const data = {
      name: clientData.name,
      groups: taskGroups
    }
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      alert('Link público copiado para a área de transferência!')
    }).catch(err => {
      console.error('Erro ao copiar link: ', err)
      alert('Não foi possível copiar o link. Tente manualmente: ' + url)
    })
  }

  const renderStepper = () => (
    <div className="stepper">
      {[1, 2, 3, 4].map(num => (
        <div key={num} className={`step-item ${step === num ? 'active' : ''} ${step > num ? 'completed' : ''}`}>
          <div className="step-dot">{step > num ? '✓' : num}</div>
          <span className="step-label">
            {num === 1 && 'Cliente'}
            {num === 2 && 'Atividades'}
            {num === 3 && 'Responsáveis'}
            {num === 4 && 'Checklist'}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="container fade-in">
      <header className="header" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
        <h1 className="title">Checklist <span className="gradient-text">FA</span></h1>
        <p className="subtitle">Gestão de tarefas com alta performance</p>
      </header>

      {view === 'home' ? (
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

            {projects.map(project => {
              const progress = calculateProgress(project.groups)
              return (
                <div key={project.id} className="project-card glass" onClick={() => loadProject(project)}>
                  <button className="delete-project" onClick={(e) => deleteProject(e, project.id)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                  <span className="card-title">{project.name}</span>
                  <span className="card-date">Atualizado em {new Date(project.lastUpdate).toLocaleDateString()}</span>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="progress-text">{progress}% Concluído</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {renderStepper()}
          <main className="main-content">
            <div className="glass-card glass">
              
              {/* STEP 1: CLIENT REGISTRATION */}
              {step === 1 && (
                <div className="form-card fade-in">
                  <div className="form-group">
                    <label>Nome do Cliente</label>
                    <input 
                      type="text" 
                      className="task-input" 
                      placeholder="Ex: Empresa ABC" 
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                    />
                  </div>
                  <div className="actions">
                    <button className="btn-secondary" onClick={() => setView('home')}>Voltar ao Início</button>
                    <button 
                      className="btn-primary" 
                      onClick={nextStep}
                      disabled={!clientData.name.trim()}
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: NOTEPAD ACTIVITIES */}
              {step === 2 && (
                <div className="form-card fade-in">
                  <div className="form-group">
                    <label>Bloco de Notas (Temas e Subtópicos com '-')</label>
                    <textarea 
                      className="notepad-textarea" 
                      placeholder="Onboarding&#10;- Reunião inicial&#10;- Configuração..." 
                      value={notepadContent}
                      onChange={(e) => setNotepadContent(e.target.value)}
                    />
                  </div>
                  <div className="actions">
                    <button className="btn-secondary" onClick={prevStep}>Voltar</button>
                    <button 
                      className="btn-primary" 
                      onClick={handleGenerateCheckpoints}
                      disabled={!notepadContent.trim()}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ASSIGN RESPONSIBLE */}
              {step === 3 && (
                <div className="form-card fade-in">
                  <div className="form-group">
                    <label>Definir Responsáveis</label>
                    <div className="assign-list">
                      {taskGroups.map(group => (
                        <div key={group.id} className="assign-group">
                          <span className="assign-theme-title">{group.theme}</span>
                          {group.items.map(task => (
                            <div key={task.id} className="assign-item">
                              <span className="assign-task-text">{task.text}</span>
                              <input 
                                type="text" 
                                placeholder="Responsável" 
                                className="responsible-input"
                                value={task.responsible}
                                onChange={(e) => updateResponsible(group.id, task.id, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="actions">
                    <button className="btn-secondary" onClick={prevStep}>Voltar</button>
                    <button className="btn-primary" onClick={nextStep}>Gerar Checklist</button>
                  </div>
                </div>
              )}

              {/* STEP 4: FINAL CHECKLIST */}
              {step === 4 && (
                <div className="fade-in">
                  <div className="checklist-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2>Checklist: {clientData.name}</h2>
                        <span className="client-tag">Visualização de Alta Performance</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isSharedView && (
                          <button className="btn-share" onClick={generateShareLink}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                              <polyline points="16 6 12 2 8 6"></polyline>
                              <line x1="12" y1="2" x2="12" y2="15"></line>
                            </svg>
                            Link Público
                          </button>
                        )}
                        <button className="btn-secondary" onClick={() => {
                          if (isSharedView) {
                            window.location.href = window.location.origin + window.location.pathname
                          } else {
                            setView('home')
                          }
                        }}>
                          {isSharedView ? 'Criar Meu Checklist' : 'Salvar e Sair'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="task-list">
                    {taskGroups.map(group => (
                      <div key={group.id} className="theme-group">
                        <div className="theme-header">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                          {group.theme}
                        </div>
                        <div className="subtask-list">
                          {group.items.map(task => (
                            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                              <div className="task-content" onClick={() => toggleTask(group.id, task.id)}>
                                <div className="checkbox">
                                  {task.completed && <div className="checked-icon" />}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span className="task-name">{task.text}</span>
                                  {task.responsible && (
                                    <span className="task-responsible">
                                      <span className="resp-label">Responsável:</span> {task.responsible}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="actions">
                    {!isSharedView && <button className="btn-secondary" onClick={prevStep}>Revisar Responsáveis</button>}
                    <button className="btn-primary" onClick={() => {
                      if (isSharedView) {
                        alert('Checklist visualizado com sucesso!')
                      } else {
                        setView('home')
                      }
                    }}>
                      {isSharedView ? 'Checklist Online' : 'Finalizar Sessão'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  )
}

export default App

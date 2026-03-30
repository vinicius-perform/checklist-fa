import React from 'react'

const StepFinal = ({ 
  clientData, 
  taskGroups, 
  user, 
  isSharedView, 
  isSyncing, 
  isEditingName, 
  setIsEditingName, 
  setClientName,
  toggleTask, 
  setTaskGroups,
  generateShareLink, 
  sharingLoading,
  shortId,
  saveToRedis,
  saveStatus,
  onPrev,
  onExit
}) => {
  const toggleGroup = (groupId, completed) => {
    if (!user && !isSharedView) return
    setTaskGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(task => ({ ...task, completed }))
        }
      }
      return group
    }))
  }

  return (
    <div className="fade-in">
      <div className="checklist-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="client-header-edit">
              {isEditingName ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text"
                    className="task-input-inline"
                    value={clientData.name}
                    onChange={(e) => setClientName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    autoFocus
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <h2 onClick={() => !isSharedView && setIsEditingName(true)} style={{ cursor: isSharedView ? 'default' : 'pointer' }}>
                    Checklist: {clientData.name}
                  </h2>
                  {!isSharedView && (
                    <svg onClick={() => setIsEditingName(true)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ cursor: 'pointer', opacity: 0.6 }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="client-tag">Visualização de Alta Performance</span>
              {!user && <span className="read-only-tag">Modo Somente Leitura</span>}
              {isSyncing && <span className="sync-indicator">Sincronizando...</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-share" onClick={generateShareLink} disabled={sharingLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
              {sharingLoading ? 'Encurtando...' : 'Link Público'}
            </button>
            {user && (
              <button
                className="btn-save"
                onClick={saveToRedis}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' && 'Salvando...'}
                {saveStatus === 'saved' && '✓ Salvo!'}
                {saveStatus === 'error' && '⚠ Erro'}
                {saveStatus === 'idle' && (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Salvar
                  </>
                )}
              </button>
            )}
            <button className="btn-secondary" onClick={onExit}>
              {isSharedView ? 'Criar Meu Checklist' : 'Salvar e Sair'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="task-list">
        {taskGroups.map(group => {
          const allCompleted = group.items.every(i => i.completed)
          return (
            <div key={group.id} className="theme-group">
              <div className="theme-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  {group.theme}
                </div>
                {(user || isSharedView) && (
                  <button 
                    className="btn-text-action" 
                    onClick={() => toggleGroup(group.id, !allCompleted)}
                    style={{ fontSize: '0.75rem', opacity: 0.7, background: 'none', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                  >
                    {allCompleted ? '[ Desmarcar tudo ]' : '[ Marcar tudo ]'}
                  </button>
                )}
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
          )
        })}
      </div>

      <div className="actions">
        {!isSharedView && <button className="btn-secondary" onClick={onPrev}>Revisar Responsáveis</button>}
        <button className="btn-primary" onClick={onExit}>
          {isSharedView ? 'Checklist Online' : 'Finalizar Sessão'}
        </button>
      </div>
    </div>
  )
}

export default StepFinal

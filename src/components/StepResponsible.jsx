import React from 'react'

const StepResponsible = ({ taskGroups, updateResponsible, onNext, onPrev }) => (
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
      <button className="btn-secondary" onClick={onPrev}>Voltar</button>
      <button className="btn-primary" onClick={onNext}>Gerar Checklist</button>
    </div>
  </div>
)

export default StepResponsible

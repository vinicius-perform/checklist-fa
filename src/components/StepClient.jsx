import React from 'react'

const StepClient = ({ clientData, setClientData, onNext, onCancel }) => (
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
      <button className="btn-secondary" onClick={onCancel}>Voltar ao Início</button>
      <button 
        className="btn-primary" 
        onClick={onNext}
        disabled={!clientData.name.trim()}
      >
        Próximo
      </button>
    </div>
  </div>
)

export default StepClient

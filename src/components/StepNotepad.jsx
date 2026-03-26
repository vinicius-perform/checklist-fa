import React from 'react'

const StepNotepad = ({ notepadContent, setNotepadContent, onNext, onPrev }) => (
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
      <button className="btn-secondary" onClick={onPrev}>Voltar</button>
      <button 
        className="btn-primary" 
        onClick={onNext}
        disabled={!notepadContent.trim()}
      >
        Continuar
      </button>
    </div>
  </div>
)

export default StepNotepad

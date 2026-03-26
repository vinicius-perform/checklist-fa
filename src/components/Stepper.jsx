import React from 'react'

const Stepper = ({ currentStep, setStep, clientName, notepadContent, taskGroups }) => {
  const isStepDisabled = (num) => {
    if (num === 1) return false
    if (num === 2) return !clientName.trim()
    if (num === 3) return !notepadContent.trim()
    if (num === 4) return taskGroups.length === 0
    return true
  }

  const steps = [
    { id: 1, label: 'Cliente' },
    { id: 2, label: 'Atividades' },
    { id: 3, label: 'Responsáveis' },
    { id: 4, label: 'Checklist' }
  ]

  return (
    <div className="stepper">
      {steps.map(({ id, label }) => (
        <div 
          key={id} 
          className={`step-item ${currentStep === id ? 'active' : ''} ${currentStep > id ? 'completed' : ''} ${isStepDisabled(id) ? 'disabled' : 'clickable'}`}
          onClick={() => !isStepDisabled(id) && setStep(id)}
        >
          <div className="step-dot">{currentStep > id ? '✓' : id}</div>
          <span className="step-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default Stepper

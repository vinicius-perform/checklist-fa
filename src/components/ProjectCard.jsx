import React from 'react'

const ProjectCard = ({ project, onClick, onDelete, calculateProgress }) => {
  const progress = calculateProgress(project.groups)
  
  return (
    <div className="project-card glass" onClick={() => onClick(project)}>
      <button className="delete-project" onClick={(e) => onDelete(e, project.id)}>
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
}

export default ProjectCard

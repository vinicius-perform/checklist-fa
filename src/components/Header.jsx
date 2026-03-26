import React from 'react'

const Header = ({ onClick }) => (
  <header className="header" onClick={onClick} style={{ cursor: 'pointer' }}>
    <h1 className="title">Checklist <span className="gradient-text">FA</span></h1>
    <p className="subtitle">Gestão de tarefas com alta performance</p>
  </header>
)

export default Header

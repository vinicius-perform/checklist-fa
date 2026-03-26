import React from 'react'

const UserBar = ({ user, onLogout }) => {
  if (!user) return null
  
  return (
    <div className="user-bar">
      <span>Olá, <strong>{user.username}</strong></span>
      <button className="btn-logout" onClick={onLogout}>Sair</button>
    </div>
  )
}

export default UserBar

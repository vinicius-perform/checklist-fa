import React from 'react'

const Login = ({ loginForm, setLoginForm, onSubmit, onBack, error }) => (
  <div className="login-screen fade-in">
    <div className="glass-card login-card">
      <h2>Acesso Restrito</h2>
      <p>Faça login para criar e gerenciar checklists.</p>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Usuário</label>
          <input 
            type="text" 
            className="task-input" 
            value={loginForm.username}
            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
            placeholder="Seu usuário"
            required
          />
        </div>
        <div className="form-group">
          <label>Senha</label>
          <input 
            type="password" 
            className="task-input" 
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            placeholder="Sua senha"
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="actions">
          <button type="button" className="btn-secondary" onClick={onBack}>Voltar</button>
          <button type="submit" className="btn-primary">Entrar</button>
        </div>
      </form>
    </div>
  </div>
)

export default Login

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Helper to simulate Vercel API functions in Vite dev server with in-memory fallback for Redis
const apiCache = {
  all_projects: []
}

const apiPlugin = () => ({
  name: 'api-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api')) {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`)
          const apiPath = url.pathname
          
          let filePath = ''
          let query = {}

          if (apiPath.startsWith('/api/load/')) {
            const id = apiPath.split('/').pop()
            filePath = path.join(__dirname, 'api', 'load', '[id].js')
            query = { id }
          } else {
            filePath = path.join(__dirname, apiPath + '.js')
          }

          if (fs.existsSync(filePath)) {
            const module = await server.ssrLoadModule(filePath)
            const body = await new Promise((resolve) => {
              let b = ''
              req.on('data', chunk => b += chunk)
              req.on('end', () => {
                try { resolve(JSON.parse(b)) } catch { resolve({}) }
              })
            })

            // Mock Redis for the handler's execution
            // We'll wrap the handler to provide a mock Redis object if it's imported
            const mockRes = {
              status: (code) => { res.statusCode = code; return mockRes },
              json: (data) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return mockRes
              },
              setHeader: (name, value) => { res.setHeader(name, value); return mockRes },
              end: (data) => { res.end(data); return mockRes }
            }

            const mockReq = {
              method: req.method,
              body,
              query: { ...Object.fromEntries(url.searchParams), ...query },
              headers: req.headers
            }

            // Since it's hard to inject Redis dependency into Vercel handlers which use Redis.fromEnv()
            // we will provide a global mock in the process object if necessary, or just rely on the plugin
            // to catch errors and return mock data if the handler fails due to missing keys.
            try {
              await module.default(mockReq, mockRes)
            } catch (err) {
              console.warn('Backend handler failed (probably Redis), falling back to mock storage')
              // Simple mock implementation of the projects and check logic for verification
              if (apiPath === '/api/login') {
                const { username, password } = mockReq.body
                if (username === 'admin' && (password === 'admin123' || password === process.env.ADMIN_PASSWORD)) {
                  return mockRes.status(200).json({ user: { username: 'Admin FA' }, token: btoa('admin:mock') })
                }
                return mockRes.status(401).json({ error: 'Inválido' })
              }
              if (apiPath === '/api/projects') {
                if (mockReq.method === 'GET') {
                  const projects = apiCache.all_projects.map(id => apiCache[`proj:${id}`]).filter(Boolean)
                  return mockRes.json({ projects })
                }
                if (mockReq.method === 'POST') {
                  const { project } = mockReq.body
                  const id = project.id || Math.random().toString(36).substr(2, 7)
                  apiCache[`proj:${id}`] = { ...project, id }
                  if (!apiCache.all_projects.includes(id)) apiCache.all_projects.push(id)
                  return mockRes.json({ project: apiCache[`proj:${id}`] })
                }
              }
              if (apiPath === '/api/check') {
                const { projectId, groupId, taskId, completed } = mockReq.body
                const p = apiCache[`proj:${projectId}`]
                if (p) {
                   p.groups = p.groups.map(g => g.id === groupId ? {
                     ...g, items: g.items.map(i => i.id === taskId ? { ...i, completed } : i)
                   } : g)
                   return mockRes.json({ success: true })
                }
              }
              if (apiPath.startsWith('/api/load/')) {
                const id = mockReq.query.id
                const p = apiCache[`proj:${id}`]
                if (p) return mockRes.json({ payload: p })
              }
              throw err
            }
            return
          }
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Internal server error' }))
          return
        }
      }
      next()
    })
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    port: 5174
  }
})

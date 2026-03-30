import { dbGet, dbSet, dbDel } from './_utils.js'

function nanoid(size = 7) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: size }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const authHeader = req.headers.authorization
  let isAdmin = false
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const decoded = atob(token).split(':')[0]
    if (decoded === 'admin') isAdmin = true
  }

  try {
    const projectsKey = 'all_projects'

    if (req.method === 'GET') {
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })
      let projectIds = await dbGet(projectsKey) || []
      
      const projects = []
      for (const id of projectIds) {
        const proj = await dbGet(`proj:${id}`)
        if (proj) projects.push(proj)
      }
      return res.json({ projects: projects.sort((a,b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)) })
    }

    if (req.method === 'POST') {
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })
      const { project } = req.body
      if (!project) return res.status(400).json({ error: 'Missing project body' })
      
      const isNew = !project.id || isNaN(project.id) || project.id.toString().length > 10
      let id = isNew ? nanoid(7) : project.id
      
      const updatedProject = { ...project, id, lastUpdate: new Date().toISOString() }
      await dbSet(`proj:${id}`, updatedProject)

      let projectIds = await dbGet(projectsKey) || []
      if (!projectIds.includes(id)) {
        projectIds.push(id)
        await dbSet(projectsKey, projectIds)
      }

      return res.json({ project: updatedProject })
    }

    if (req.method === 'DELETE') {
      if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Missing id' })

      await dbDel(`proj:${id}`)
      let projectIds = await dbGet(projectsKey) || []
      projectIds = projectIds.filter(pid => pid !== id)
      await dbSet(projectsKey, projectIds)

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Redis error:', err)
    return res.status(500).json({ error: 'Storage error' })
  }
}

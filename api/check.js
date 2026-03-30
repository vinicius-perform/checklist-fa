import { dbGet, dbSet } from './_utils.js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { projectId, groupId, taskId, completed } = req.body
  if (!projectId || !groupId || !taskId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const projectKey = `proj:${projectId}`
    
    const project = await dbGet(projectKey)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    // Update the specific task in the groups
    const updatedGroups = project.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(item => {
            if (item.id === taskId) {
              return { ...item, completed: !!completed }
            }
            return item
          })
        }
      }
      return group
    })

    const updatedProject = { ...project, groups: updatedGroups, lastUpdate: new Date().toISOString() }
    await dbSet(projectKey, updatedProject)

    return res.json({ success: true })
  } catch (err) {
    console.error('Redis error:', err)
    return res.status(500).json({ error: 'Storage error' })
  }
}

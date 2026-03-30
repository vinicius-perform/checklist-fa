import { dbGet } from '../_utils.js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    const payload = await dbGet(`proj:${id}`)
    if (!payload) return res.status(404).json({ error: 'Not found' })
    return res.json({ payload })
  } catch (err) {
    console.error('Database error:', err)
    return res.status(500).json({ error: 'Storage error' })
  }
}

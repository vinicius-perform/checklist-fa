import { Redis } from '@upstash/redis'

function nanoid(size = 7) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: size }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { payload } = req.body
  if (!payload) return res.status(400).json({ error: 'Missing payload' })

  try {
    const redis = Redis.fromEnv()
    const id = nanoid(7)
    // Store with 180-day TTL
    await redis.set(`ck:${id}`, payload, { ex: 60 * 60 * 24 * 180 })
    return res.json({ id })
  } catch (err) {
    console.error('Redis error:', err)
    return res.status(500).json({ error: 'Storage error' })
  }
}

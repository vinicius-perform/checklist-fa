import { Redis } from '@upstash/redis'

// Global in-memory cache for local development without Redis keys
const localCache = {
  all_projects: []
}

export function getRedis() {
  try {
    // If env vars are missing, Redis.fromEnv() might throw or return a broken client
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Missing Upstash Env Vars')
    }
    return Redis.fromEnv()
  } catch (e) {
    console.warn('Redis not configured, using local in-memory storage.')
    return null
  }
}

export async function dbGet(key) {
  const redis = getRedis()
  if (redis) return await redis.get(key)
  return localCache[key] || null
}

export async function dbSet(key, value, options = {}) {
  const redis = getRedis()
  if (redis) return await redis.set(key, value, options)
  localCache[key] = value
  return 'OK'
}

export async function dbDel(key) {
  const redis = getRedis()
  if (redis) return await redis.del(key)
  delete localCache[key]
  return 1
}

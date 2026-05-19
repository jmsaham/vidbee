import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const DATA_DIR = process.env.VIDBEE_DATA_DIR
  ? path.resolve(process.env.VIDBEE_DATA_DIR)
  : path.resolve(process.cwd(), '.data')
const USERS_FILE = path.join(DATA_DIR, 'auth', 'users.json')
const SESSION_EXPIRY_MS = 120 * 60 * 1000 // 120 minutes

interface StoredUser {
  id: string
  username: string
  passwordHash: string
  createdAt: number
}

interface UsersStore {
  users: StoredUser[]
}

const sessions = new Map<string, { userId: string; expiresAt: number }>()

// Simple in-memory brute-force protection per username.
const MAX_FAILED_ATTEMPTS = 10
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const colonIdx = stored.indexOf(':')
  if (colonIdx === -1) {
    return false
  }
  const salt = stored.slice(0, colonIdx)
  const hash = stored.slice(colonIdx + 1)
  if (!(salt && hash)) {
    return false
  }
  const hashBuf = Buffer.from(hash, 'hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  if (hashBuf.length !== derived.length) {
    return false
  }
  return timingSafeEqual(hashBuf, derived)
}

const readStore = async (): Promise<UsersStore> => {
  try {
    const content = await readFile(USERS_FILE, 'utf-8')
    return JSON.parse(content) as UsersStore
  } catch {
    return { users: [] }
  }
}

const writeStore = async (store: UsersStore): Promise<void> => {
  await mkdir(path.dirname(USERS_FILE), { recursive: true })
  await writeFile(USERS_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

export const ensureDefaultUser = async (): Promise<void> => {
  const store = await readStore()
  if (store.users.length > 0) {
    return
  }
  const username = process.env.VIDBEE_ADMIN_USERNAME?.trim() || 'admin'
  const password = process.env.VIDBEE_ADMIN_PASSWORD?.trim() || 'admin'
  store.users.push({
    id: randomBytes(16).toString('hex'),
    username,
    passwordHash: await hashPassword(password),
    createdAt: Date.now()
  })
  await writeStore(store)
}

export const login = async (
  username: string,
  password: string
): Promise<{ token: string; username: string } | null> => {
  const key = username.trim().toLowerCase()

  const attempt = loginAttempts.get(key)
  if (attempt && attempt.lockedUntil > Date.now()) {
    return null
  }

  const store = await readStore()
  const user = store.users.find((u) => u.username.toLowerCase() === key)
  if (!user) {
    // Record attempt even for unknown usernames to avoid user enumeration timing.
    const cur = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 }
    const count = cur.count + 1
    loginAttempts.set(key, { count, lockedUntil: count >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0 })
    return null
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const cur = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 }
    const count = cur.count + 1
    loginAttempts.set(key, { count, lockedUntil: count >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0 })
    return null
  }

  loginAttempts.delete(key)
  const token = randomBytes(32).toString('hex')
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_EXPIRY_MS })
  return { token, username: user.username }
}

export const validateToken = (token: string): string | null => {
  const session = sessions.get(token)
  if (!session) {
    return null
  }
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  return session.userId
}

export const listUsers = async (): Promise<
  Array<{ id: string; username: string; createdAt: number }>
> => {
  const store = await readStore()
  return store.users.map((u) => ({ id: u.id, username: u.username, createdAt: u.createdAt }))
}

export const createUser = async (
  username: string,
  password: string
): Promise<{ id: string; username: string } | null> => {
  const store = await readStore()
  const trimmed = username.trim()
  if (store.users.some((u) => u.username.toLowerCase() === trimmed.toLowerCase())) {
    return null
  }
  const id = randomBytes(16).toString('hex')
  const passwordHash = await hashPassword(password)
  store.users.push({ id, username: trimmed, passwordHash, createdAt: Date.now() })
  await writeStore(store)
  return { id, username: trimmed }
}

export const removeUser = async (userId: string): Promise<boolean> => {
  const store = await readStore()
  const idx = store.users.findIndex((u) => u.id === userId)
  if (idx === -1) {
    return false
  }
  if (store.users.length === 1) {
    return false
  }
  store.users.splice(idx, 1)
  await writeStore(store)
  for (const [token, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(token)
    }
  }
  return true
}

export const changeUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  const store = await readStore()
  const user = store.users.find((u) => u.id === userId)
  if (!user) {
    return false
  }
  user.passwordHash = await hashPassword(newPassword)
  await writeStore(store)
  // Invalidate all existing sessions for this user so the new password takes effect immediately.
  for (const [token, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(token)
    }
  }
  return true
}

export const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null
  }
  const spaceIdx = authHeader.indexOf(' ')
  if (spaceIdx === -1) {
    return null
  }
  if (authHeader.slice(0, spaceIdx).toLowerCase() !== 'bearer') {
    return null
  }
  const token = authHeader.slice(spaceIdx + 1).trim()
  return token || null
}

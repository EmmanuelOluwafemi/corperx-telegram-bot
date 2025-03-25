import { User, UserSession } from '../types/api'
import fs from 'fs'
import path from 'path'

// Define path for session storage file
const SESSION_FILE_PATH = path.join(process.cwd(), 'sessions.json')

// Session storage - initialize from file if exists, otherwise empty Map
let sessions: Map<number, UserSession> = new Map()

// Load sessions from file if exists
function loadSessions(): void {
  try {
    if (fs.existsSync(SESSION_FILE_PATH)) {
      const data = fs.readFileSync(SESSION_FILE_PATH, 'utf8')
      const sessionsObject = JSON.parse(data)
      
      // Convert from object to Map
      sessions = new Map()
      Object.entries(sessionsObject).forEach(([key, value]) => {
        sessions.set(Number(key), value as UserSession)
      })
      
      console.log(`✅ Loaded ${sessions.size} sessions from storage`)
    }
  } catch (error) {
    console.error('Failed to load sessions from file:', error)
    // If there's an error loading, start with empty sessions
    sessions = new Map()
  }
}

// Save sessions to file
function saveSessions(): void {
  try {
    // Convert Map to a plain object for JSON serialization
    const sessionsObject: Record<number, UserSession> = {}
    sessions.forEach((session, chatId) => {
      sessionsObject[chatId] = session
    })
    
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(sessionsObject, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to save sessions to file:', error)
  }
}

// Initialize sessions on startup
loadSessions()

/**
 * Create a new user session
 * @param chatId Telegram chat ID
 * @param user User data
 * @param accessToken Access token
 * @param expireAt Expiration timestamp
 */
function createSession(
  chatId: number,
  user: User,
  accessToken: string,
  expireAt: string
): void {
  const session: UserSession = {
    userId: user.id,
    email: user.email,
    accessToken,
    organizationId: user.organizationId,
    expireAt
  }
  
  sessions.set(chatId, session)
  saveSessions() // Save sessions to file after update
}

/**
 * Get session for a chat
 * @param chatId Telegram chat ID
 * @returns User session if exists, undefined otherwise
 */
function getSession(chatId: number): UserSession | undefined {
  return sessions.get(chatId)
}

/**
 * Check if session is valid (exists and not expired)
 * @param chatId Telegram chat ID
 * @returns true if session is valid, false otherwise
 */
function isSessionValid(chatId: number): boolean {
  const session = sessions.get(chatId)
  
  if (!session) return false
  
  const expireTime = new Date(session.expireAt).getTime()
  const currentTime = new Date().getTime()
  
  return expireTime > currentTime
}

/**
 * Delete session for a chat
 * @param chatId Telegram chat ID
 */
function deleteSession(chatId: number): void {
  sessions.delete(chatId)
  saveSessions() // Save sessions to file after update
}

export const sessionService = {
  createSession,
  getSession,
  isSessionValid,
  deleteSession
} 
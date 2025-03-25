// Common API response type
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Authentication Types
export interface OtpRequestResponse {
  email: string
  sid: string
}

export interface AuthenticateResponse {
  scheme: string
  accessToken: string
  accessTokenId: string
  expireAt: string
  user: User
}

// User Types
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  profileImage: string
  organizationId: string
  role: 'owner' | 'admin' | 'member'
  status: 'pending' | 'active' | 'suspended'
  type: 'individual' | 'business'
  relayerAddress: string
  flags: string[]
  walletAddress: string
  walletId: string
  walletAccountType: string
}

// Session Types
export interface UserSession {
  userId: string
  email: string
  accessToken: string
  organizationId: string
  expireAt: string
} 
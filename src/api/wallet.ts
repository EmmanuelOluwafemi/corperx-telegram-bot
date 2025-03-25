import axios from 'axios'
import { ApiResponse } from '../types/api'
import { api } from '.'


/**
 * Get all user wallets
 * @param token Access token
 * @returns List of wallets
 */
export async function getWallets(token: string): Promise<ApiResponse<any>> {
  try {
    const response = await api.get('/api/wallets', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Wallets fetch error:', error.response?.data)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch wallets'
      }
    }
    
    console.error('Unknown wallets fetch error:', error)
    return {
      success: false,
      error: 'Unknown error occurred while fetching wallets'
    }
  }
}

/**
 * Get wallet balances across networks
 * @param token Access token
 * @returns Wallet balances
 */
export async function getWalletBalances(token: string): Promise<ApiResponse<any>> {
  try {
    const response = await api.get('/api/wallets/balances', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Balances fetch error:', error.response?.data)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch wallet balances'
      }
    }
    
    console.error('Unknown balances fetch error:', error)
    return {
      success: false,
      error: 'Unknown error occurred while fetching wallet balances'
    }
  }
}

/**
 * Get default wallet
 * @param token Access token
 * @returns Default wallet information
 */
export async function getDefaultWallet(token: string): Promise<ApiResponse<any>> {
  try {
    const response = await api.get('/api/wallets/default', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Default wallet fetch error:', error.response?.data)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch default wallet'
      }
    }
    
    console.error('Unknown default wallet fetch error:', error)
    return {
      success: false,
      error: 'Unknown error occurred while fetching default wallet'
    }
  }
}

/**
 * Set default wallet
 * @param token Access token
 * @param walletId Wallet ID to set as default
 * @returns Response result
 */
export async function setDefaultWallet(token: string, walletId: string): Promise<ApiResponse<any>> {
  try {
    const response = await api.post('/api/wallets/default', 
      { walletId },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    
    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Set default wallet error:', error.response?.data)
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to set default wallet'
      }
    }
    
    console.error('Unknown set default wallet error:', error)
    return {
      success: false,
      error: 'Unknown error occurred while setting default wallet'
    }
  }
} 
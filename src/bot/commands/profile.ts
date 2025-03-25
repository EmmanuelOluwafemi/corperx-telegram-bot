import { getUserProfile } from '../../api/auth'
import { sessionService } from '../../services/session'
import { Context } from '../../types/telegraf'

/**
 * Show user profile information
 */
export async function showProfile(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id

  if (!chatId) {
    await ctx.reply('Error: Could not determine chat ID.')
    return
  }

  // Get session
  const session = sessionService.getSession(chatId)
  
  if (!session) {
    await ctx.reply('You need to be logged in to view your profile. Use /login to authenticate.')
    return
  }

  await ctx.reply('🔍 Fetching your profile... Please wait.')

  // Call API to get profile data
  const result = await getUserProfile(session.accessToken)

  if (!result.success || !result.data) {
    await ctx.reply(`❌ Failed to fetch profile: ${result.error || 'Unknown error'}`)
    return
  }

  const user = result.data

  // Format the profile information
  const profile = [
    '👤 *YOUR PROFILE*',
    '',
    `*Name:* ${formatName(user.firstName, user.lastName)}`,
    `*Email:* ${user.email || 'Not set'}`,
    `*Account Type:* ${formatAccountType(user.type)}`,
    `*Status:* ${formatStatus(user.status)}`,
    `*Role:* ${formatRole(user.role)}`,
    '',
    '*Account Details*',
    `Account ID: \`${user.id || 'N/A'}\``,
    `Organization ID: \`${user.organizationId || 'N/A'}\``,
    '',
    '*Wallet Information*',
    `Wallet Address: \`${formatAddress(user.walletAddress)}\``,
    `Wallet ID: \`${user.walletId || 'N/A'}\``,
    `Account Type: ${user.walletAccountType || 'Not set'}`
  ].join('\n')

  await ctx.reply(profile, { 
    parse_mode: 'Markdown'
  })
}

// Helper functions to format the profile data

function formatName(firstName?: string, lastName?: string): string {
  if (firstName && lastName) return `${firstName} ${lastName}`
  if (firstName) return firstName
  if (lastName) return lastName
  return 'Not set'
}

function formatAccountType(type?: string): string {
  if (!type) return 'Not specified'
  
  switch (type) {
    case 'individual':
      return '👤 Individual'
    case 'business':
      return '🏢 Business'
    default:
      return type
  }
}

function formatStatus(status?: string): string {
  if (!status) return 'Unknown'
  
  switch (status) {
    case 'pending':
      return '⏳ Pending'
    case 'active':
      return '✅ Active'
    case 'suspended':
      return '❌ Suspended'
    default:
      return status
  }
}

function formatRole(role?: string): string {
  if (!role) return 'Not assigned'
  
  switch (role) {
    case 'owner':
      return '👑 Owner'
    case 'admin':
      return '🔑 Administrator'
    case 'member':
      return '👥 Member'
    default:
      return role
  }
}

function formatAddress(address?: string): string {
  if (!address) return 'Not set'
  
  // Truncate long addresses for better display
  if (address.length > 16) {
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`
  }
  
  return address
} 
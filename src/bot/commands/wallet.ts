import { Markup } from 'telegraf'
import { getDefaultWallet, getWalletBalances, getWallets, setDefaultWallet } from '../../api/wallet'
import { sessionService } from '../../services/session'
import { Context } from '../../types/telegraf'

// Cache to store wallet information during wallet setting
interface WalletCache {
  wallets?: any[]
  stage: 'idle' | 'select_default_wallet'
}

const walletCache = new Map<number, WalletCache>()

/**
 * Show wallet balances
 */
export async function showWallets(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id

  if (!chatId) {
    await ctx.reply('Error: Could not determine chat ID.')
    return
  }

  // Get session
  const session = sessionService.getSession(chatId)
  
  if (!session) {
    await ctx.reply('You need to be logged in to view your wallets. Use /login to authenticate.')
    return
  }

  await ctx.reply('💰 Fetching your wallets... Please wait.')

  // Get wallet balances
  const balancesResult = await getWalletBalances(session.accessToken)
  
  if (!balancesResult.success || !balancesResult.data) {
    await ctx.reply(`❌ Failed to fetch wallet balances: ${balancesResult.error || 'Unknown error'}`)
    return
  }

  // Get default wallet
  const defaultWalletResult = await getDefaultWallet(session.accessToken)
  let defaultWalletId = ''
  
  if (defaultWalletResult.success && defaultWalletResult.data) {
    defaultWalletId = defaultWalletResult.data.id
  }

  // Format wallet balances
  const balances = balancesResult.data
  
  if (!balances || !Array.isArray(balances) || balances.length === 0) {
    await ctx.reply('You don\'t have any wallet balances yet.')
    return
  }

  // Create response message with wallet balances
  const walletMessage = [
    '💰 *YOUR WALLET BALANCES*',
    ''
  ]

  balances.forEach((balance: any) => {
    const isDefault = balance.walletId === defaultWalletId
    const defaultTag = isDefault ? ' (Default)' : ''
    
    walletMessage.push(
      `*${balance?.network ? formatNetwork(balance.network) : 'Unknown Network'}${defaultTag}*`,
      `Balance: \`${formatBalance(balance.balance)} ${balance.currency || 'USDC'}\``,
      `Wallet: \`${formatAddress(balance.walletAddress)}\``,
      ''
    )
  })

  // Add a note about default wallet
  walletMessage.push(
    '*Note:* Default wallet is used for outgoing transactions.'
  )

  await ctx.reply(walletMessage.join('\n'), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Set Default Wallet', 'set_default_wallet')],
      [Markup.button.callback('📥 Deposit', 'deposit_funds')],
      [Markup.button.callback('📤 Send Funds', 'send_funds')],
      [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
    ])
  })
}

/**
 * Handle wallet-related callbacks
 */
export async function handleWalletCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery) return
  
  // Handle Telegraf's type system - cast to any to access data property
  const callbackData = (ctx.callbackQuery as any).data
  
  if (!callbackData) return
  
  const chatId = ctx.chat?.id
  
  if (!chatId) {
    await ctx.answerCbQuery('Error: Could not determine chat ID.')
    return
  }

  // Get session
  const session = sessionService.getSession(chatId)
  
  if (!session) {
    await ctx.answerCbQuery('You need to log in first')
    await ctx.reply('You need to be logged in. Use /login to authenticate.')
    return
  }

  // Handle different callback actions
  switch (callbackData) {
    case 'set_default_wallet':
      await showDefaultWalletSelector(ctx, session.accessToken)
      break
      
    case 'deposit_funds':
      await showDepositInfo(ctx, session.accessToken)
      break
      
    case 'send_funds':
      await ctx.answerCbQuery('Coming soon!')
      await ctx.reply('The send funds feature will be available soon! 🚧')
      break
      
    case 'back_to_menu':
      await ctx.answerCbQuery('Returning to main menu')
      await showMainMenu(ctx)
      break
      
    case 'back_to_wallets':
      await ctx.answerCbQuery('Returning to wallets')
      await showWallets(ctx)
      break
      
    default:
      // Check if it's a wallet selection
      if (callbackData.startsWith('select_wallet:')) {
        const walletId = callbackData.replace('select_wallet:', '')
        await setDefaultWalletHandler(ctx, session.accessToken, walletId)
      } else {
        await ctx.answerCbQuery('Unknown action')
      }
  }
}

/**
 * Show default wallet selector
 */
async function showDefaultWalletSelector(ctx: Context, token: string): Promise<void> {
  await ctx.answerCbQuery('Loading wallets...')
  
  const chatId = ctx.chat?.id
  if (!chatId) return

  // Get all wallets
  const walletsResult = await getWallets(token)
  
  if (!walletsResult.success || !walletsResult.data) {
    await ctx.reply(`❌ Failed to fetch wallets: ${walletsResult.error || 'Unknown error'}`)
    return
  }

  const wallets = walletsResult.data
  
  if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
    await ctx.reply('You don\'t have any wallets yet.')
    return
  }

  // Store wallets in cache
  walletCache.set(chatId, {
    wallets,
    stage: 'select_default_wallet'
  })

  // Create inline keyboard with wallet options
  const buttons = wallets.map(wallet => [
    Markup.button.callback(
      `${wallet.network ? formatNetwork(wallet.network) : 'Unknown'} - ${formatAddress(wallet.walletAddress)}`,
      `select_wallet:${wallet.id}`
    )
  ])
  
  // Add cancel button
  buttons.push([Markup.button.callback('Cancel', 'back_to_menu')])

  await ctx.reply(
    '🔄 *Select Default Wallet*\n\nPlease choose which wallet you want to set as your default wallet:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  )
}

/**
 * Handle setting default wallet
 */
async function setDefaultWalletHandler(ctx: Context, token: string, walletId: string): Promise<void> {
  await ctx.answerCbQuery('Setting default wallet...')
  
  // Set default wallet
  const result = await setDefaultWallet(token, walletId)
  
  if (!result.success) {
    await ctx.reply(`❌ Failed to set default wallet: ${result.error || 'Unknown error'}`)
    return
  }

  await ctx.reply('✅ Default wallet has been updated successfully!')
  
  // Show updated wallet list
  await showWallets(ctx)
}

/**
 * Show deposit information
 */
async function showDepositInfo(ctx: Context, token: string): Promise<void> {
  await ctx.answerCbQuery('Loading deposit information...')
  
  // Get default wallet
  const defaultWalletResult = await getDefaultWallet(token)
  
  if (!defaultWalletResult.success || !defaultWalletResult.data) {
    await ctx.reply(`❌ Failed to fetch default wallet: ${defaultWalletResult.error || 'Unknown error'}`)
    return
  }

  const defaultWallet = defaultWalletResult.data
  
  // Format deposit information
  const depositInfo = [
    '📥 *DEPOSIT INFORMATION*',
    '',
    '*Network:* ' + (defaultWallet.network ? formatNetwork(defaultWallet.network) : 'Not specified'),
    '',
    '*Your Deposit Address:*',
    '`' + (defaultWallet.walletAddress || 'No address available') + '`',
    '',
    '*Important Notes:*',
    '• Only send USDC to this address',
    '• Make sure you\'re sending from the correct network',
    '• Deposit will be credited after network confirmation'
  ].join('\n')

  await ctx.reply(depositInfo, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Wallets', 'back_to_wallets')],
      [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
    ])
  })
}

/**
 * Show main menu
 */
async function showMainMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    "What would you like to do?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💰 My Wallets", "show_wallets"),
        Markup.button.callback("💸 Send Funds", "send_funds")
      ],
      [
        Markup.button.callback("📊 Transaction History", "show_history"),
        Markup.button.callback("👤 My Profile", "show_profile")
      ],
      [Markup.button.callback("❓ Help", "show_help")]
    ])
  )
}

// Helper functions

/**
 * Format wallet address
 */
function formatAddress(address?: string): string {
  if (!address) return 'Not set'
  
  // Truncate long addresses for better display
  if (address.length > 16) {
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`
  }
  
  return address
}

/** 
 * Format network name
 */
function formatNetwork(network?: string): string {
  if (!network) return 'Unknown Network'
  switch (network) {
    case '8453':
      return 'Base'
    case '42161':
      return 'Arbitrum'
    case '137':
      return 'Polygon'
    case '23434':
      return 'Starknet'
    case '10':
      return 'Optimism'
    case '11155111':
      return 'Sepolia'
    case '84532':
      return 'Base Sepolia'
    case '1':
      return 'Ethereum'
    case '56':
      return 'Binance Smart Chain'
    case '1329':
      return 'Heco'
    case '43114':
      return 'Avalanche'
    case '1284':
      return 'Moonbeam'
    case '1285':
      return 'Moonriver'
    case '1287':
      return 'Moonbase Alpha'
    case '1288':
      return 'Moonbeam Alpha'
    case '1289':
      return 'Moonriver Alpha'
    case '1290':
      return 'Moonbeam Alpha Testnet'
    default:
      return network
  }
}

/**
 * Format balance with 2 decimal places
 */
function formatBalance(balance?: number | string): string {
  if (balance === undefined || balance === null) return '0.00'
  
  const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance
  
  // Format with 2 decimal places
  return numBalance.toFixed(2)
} 
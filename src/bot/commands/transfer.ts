import { Markup } from 'telegraf'
import { getWalletBalances } from '../../api/wallet'
import { sendToEmail, sendToWallet } from '../../api/transfer'
import { sessionService } from '../../services/session'
import { Context } from '../../types/telegraf'

// Interface for transfer data cache
interface TransferCache {
  stage: 'select_method' | 'enter_email' | 'enter_wallet_address' | 'enter_amount' | 'confirm' | 'idle'
  method?: 'email' | 'wallet' | 'bank'
  recipient?: string
  amount?: number
  walletAddress?: string
  network?: string
  message?: string
}

// Cache for storing transfer data
const transferCache = new Map<number, TransferCache>()

/**
 * Start the send funds process
 */
export async function startTransfer(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id

  if (!chatId) {
    await ctx.reply('Error: Could not determine chat ID.')
    return
  }

  // Get session
  const session = sessionService.getSession(chatId)
  
  if (!session) {
    await ctx.reply('You need to be logged in to send funds. Use /login to authenticate.')
    return
  }

  // Check available balance
  const balancesResult = await getWalletBalances(session.accessToken)
  
  if (!balancesResult.success || !balancesResult.data) {
    await ctx.reply(`❌ Failed to fetch wallet balances: ${balancesResult.error || 'Unknown error'}`)
    return
  }

  const balances = balancesResult.data
  
  if (!balances || !Array.isArray(balances) || balances.length === 0) {
    await ctx.reply('You don\'t have any wallet balances yet. Please deposit funds first.')
    return
  }

  // Initialize transfer cache
  transferCache.set(chatId, {
    stage: 'select_method'
  })

  // Show transfer method selection
  await ctx.reply(
    '💸 *SEND FUNDS*\n\nPlease select how you want to send funds:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📧 Send to Email', 'transfer_method:email')],
        [Markup.button.callback('🔑 Send to Wallet Address', 'transfer_method:wallet')],
        [Markup.button.callback('🏦 Withdraw to Bank (Coming Soon)', 'transfer_method:bank')],
        [Markup.button.callback('↩️ Cancel', 'cancel_transfer')]
      ])
    }
  )
}

/**
 * Handle transfer-related callbacks
 */
export async function handleTransferCallback(ctx: Context): Promise<boolean> {
  if (!ctx.callbackQuery) return false
  
  // Handle Telegraf's type system - cast to any to access data property
  const callbackData = (ctx.callbackQuery as any).data
  
  if (!callbackData || typeof callbackData !== 'string') return false
  
  const chatId = ctx.chat?.id
  
  if (!chatId) {
    await ctx.answerCbQuery('Error: Could not determine chat ID.')
    return false
  }

  // Transfer method selection
  if (callbackData.startsWith('transfer_method:')) {
    const method = callbackData.replace('transfer_method:', '') as 'email' | 'wallet' | 'bank'
    return await handleTransferMethodSelection(ctx, chatId, method)
  }

  // Network selection for wallet transfers
  if (callbackData.startsWith('network:')) {
    const network = callbackData.replace('network:', '')
    const cache = transferCache.get(chatId)
    
    if (!cache || cache.method !== 'wallet' || !cache.walletAddress) {
      await ctx.answerCbQuery('Transfer session expired')
      await ctx.reply('Your transfer session has expired. Please start again.')
      return true
    }
    
    // Update cache with selected network
    transferCache.set(chatId, {
      ...cache,
      network,
      stage: 'enter_amount'
    })
    
    await ctx.answerCbQuery(`Selected network: ${getNetworkName(network)}`)
    await ctx.reply(
      '💰 *Enter Amount*\n\n' +
      `Please enter the amount of USDC you want to send to the wallet address on ${getNetworkName(network)}:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Cancel Transfer', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  // Cancel transfer
  if (callbackData === 'cancel_transfer') {
    transferCache.delete(chatId)
    await ctx.answerCbQuery('Transfer cancelled')
    await ctx.reply('Transfer has been cancelled.')
    return true
  }

  // Confirm transfer
  if (callbackData === 'confirm_transfer') {
    return await handleTransferConfirmation(ctx, chatId)
  }

  return false
}

/**
 * Handle transfer method selection
 */
async function handleTransferMethodSelection(
  ctx: Context, 
  chatId: number, 
  method: 'email' | 'wallet' | 'bank'
): Promise<boolean> {
  const cache = transferCache.get(chatId)
  
  if (!cache) {
    await ctx.answerCbQuery('Transfer session expired')
    await ctx.reply('Your transfer session has expired. Please start again.')
    return true
  }

  // Update cache with selected method
  transferCache.set(chatId, {
    ...cache,
    method
  })

  if (method === 'bank') {
    await ctx.answerCbQuery('Coming soon!')
    await ctx.reply(
      '🏦 Bank withdrawals are coming soon!\n\nPlease choose another method.',
      {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Back to Transfer Methods', 'transfer_method:back')],
          [Markup.button.callback('↩️ Cancel Transfer', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  if (method === 'email') {
    // Update cache stage
    transferCache.set(chatId, {
      ...cache,
      method,
      stage: 'enter_email'
    })

    await ctx.answerCbQuery('Please enter recipient email')
    await ctx.reply(
      '📧 *Send to Email*\n\nPlease enter the recipient\'s email address:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Cancel Transfer', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  if (method === 'wallet') {
    // Update cache stage
    transferCache.set(chatId, {
      ...cache,
      method,
      stage: 'enter_wallet_address'
    })

    await ctx.answerCbQuery('Please enter wallet address')
    await ctx.reply(
      '🔑 *Send to Wallet Address*\n\nPlease enter the recipient\'s wallet address:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Cancel Transfer', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  return false
}

/**
 * Handle transfer confirmation
 */
async function handleTransferConfirmation(ctx: Context, chatId: number): Promise<boolean> {
  const cache = transferCache.get(chatId)
  
  if (!cache) {
    await ctx.answerCbQuery('Transfer session expired')
    await ctx.reply('Your transfer session has expired. Please start again.')
    return true
  }

  const session = sessionService.getSession(chatId)
  
  if (!session) {
    await ctx.answerCbQuery('You need to be logged in')
    await ctx.reply('You need to be logged in to send funds. Use /login to authenticate.')
    transferCache.delete(chatId)
    return true
  }

  await ctx.answerCbQuery('Processing transfer...')
  await ctx.reply('💳 Processing your transfer... Please wait.')

  let result
  
  if (cache.method === 'email' && cache.recipient && cache.amount) {
    // Send to email
    result = await sendToEmail(
      session.accessToken,
      cache.recipient,
      cache.amount,
      cache.message
    )
  } else if (cache.method === 'wallet' && cache.walletAddress && cache.amount && cache.network) {
    // Send to wallet
    result = await sendToWallet(
      session.accessToken,
      cache.walletAddress,
      cache.amount,
      cache.network
    )
  } else {
    await ctx.reply('❌ Transfer failed: Missing required information.')
    transferCache.delete(chatId)
    return true
  }

  if (!result.success) {
    await ctx.reply(`❌ Transfer failed: ${result.error || 'Unknown error'}`)
    transferCache.delete(chatId)
    return true
  }

  // Clear cache
  transferCache.delete(chatId)

  // Show success message
  await ctx.reply(
    '✅ *Transfer successful!*\n\n' +
    `${cache.amount} USDC has been sent to ${cache.recipient || cache.walletAddress}.\n\n` +
    'You can view this transaction in your transaction history.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📊 View Transaction History', 'show_history')],
        [Markup.button.callback('💰 View Wallets', 'show_wallets')],
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
      ])
    }
  )

  return true
}

/**
 * Handle messages for the transfer flow
 */
export async function handleTransferMessage(ctx: Context): Promise<boolean> {
  if (!ctx.message || !('text' in ctx.message) || !ctx.chat?.id) return false

  const chatId = ctx.chat.id
  const text = ctx.message.text
  const cache = transferCache.get(chatId)

  if (!cache) return false

  // Email input stage
  if (cache.stage === 'enter_email') {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(text)) {
      await ctx.reply('⚠️ Please enter a valid email address.')
      return true
    }

    // Update cache with recipient email
    transferCache.set(chatId, {
      ...cache,
      recipient: text,
      stage: 'enter_amount'
    })

    await ctx.reply(
      '💰 *Enter Amount*\n\n' +
      `Please enter the amount of USDC you want to send to ${text}:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('↩️ Cancel Transfer', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  // Wallet address input stage
  if (cache.stage === 'enter_wallet_address') {
    // Simple validation - addresses should be at least 20 chars
    if (text.length < 20) {
      await ctx.reply('⚠️ Please enter a valid wallet address.')
      return true
    }

    // Update cache with wallet address
    transferCache.set(chatId, {
      ...cache,
      walletAddress: text,
      stage: 'enter_amount'
    })

    await ctx.reply(
      '🌐 *Select Network*\n\n' +
      'Please select the blockchain network for this wallet:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Ethereum', 'network:1')],
          [Markup.button.callback('Base', 'network:8453')],
          [Markup.button.callback('Arbitrum', 'network:42161')],
          [Markup.button.callback('Polygon', 'network:137')],
          [Markup.button.callback('Optimism', 'network:10')],
          [Markup.button.callback('Binance Smart Chain', 'network:56')],
          [Markup.button.callback('↩️ Cancel Transfer', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  // Amount input stage
  if (cache.stage === 'enter_amount') {
    // Validate amount
    const amount = parseFloat(text)
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('⚠️ Please enter a valid positive amount.')
      return true
    }

    // Get session
    const session = sessionService.getSession(chatId)
    
    if (!session) {
      await ctx.reply('You need to be logged in to send funds. Use /login to authenticate.')
      transferCache.delete(chatId)
      return true
    }

    // Check available balance
    const balancesResult = await getWalletBalances(session.accessToken)
    
    if (!balancesResult.success || !balancesResult.data) {
      await ctx.reply(`❌ Failed to fetch wallet balances: ${balancesResult.error || 'Unknown error'}`)
      return true
    }

    const balances = balancesResult.data
    
    if (!balances || !Array.isArray(balances)) {
      await ctx.reply('Failed to verify available balance.')
      return true
    }

    // Calculate total balance
    const totalBalance = balances.reduce((sum, balance) => {
      return sum + (parseFloat(balance.balance) || 0)
    }, 0)

    if (amount > totalBalance) {
      await ctx.reply(`⚠️ Insufficient balance. Your available balance is ${totalBalance.toFixed(2)} USDC.`)
      return true
    }

    // Update cache with amount
    transferCache.set(chatId, {
      ...cache,
      amount,
      stage: 'confirm'
    })

    // Show confirmation message
    let confirmMessage = '📝 *Confirm Transfer*\n\n'
    
    if (cache.method === 'email') {
      confirmMessage += `• Recipient: ${cache.recipient}\n• Amount: ${amount} USDC\n\nDo you want to proceed with this transfer?`
    } else if (cache.method === 'wallet') {
      const networkName = getNetworkName(cache.network || '')
      confirmMessage += `• Wallet Address: ${cache.walletAddress}\n• Network: ${networkName}\n• Amount: ${amount} USDC\n\nDo you want to proceed with this transfer?`
    }

    await ctx.reply(
      confirmMessage,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Confirm', 'confirm_transfer')],
          [Markup.button.callback('❌ Cancel', 'cancel_transfer')]
        ])
      }
    )
    return true
  }

  return false
}

/**
 * Get network name from network ID
 */
function getNetworkName(networkId: string): string {
  switch (networkId) {
    case '1':
      return 'Ethereum'
    case '8453':
      return 'Base'
    case '42161':
      return 'Arbitrum'
    case '137':
      return 'Polygon'
    case '10':
      return 'Optimism'
    case '56':
      return 'Binance Smart Chain'
    default:
      return networkId
  }
} 
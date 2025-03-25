import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { env } from '../config/env'
import { authMiddleware, handleAuthMessage, logout, startAuth } from './commands/auth'
import { showProfile } from './commands/profile'
import { handleTransferCallback, handleTransferMessage, startTransfer } from './commands/transfer'
import { handleWalletCallback, showWallets } from './commands/wallet'
import { Context } from '../types/telegraf'

/**
 * Initialize the Telegram bot
 */
export function initBot() {
  const bot = new Telegraf<Context>(env.BOT_TOKEN)

  // Apply middleware
  bot.use(authMiddleware())

  // Register command handlers
  registerCommands(bot)

  // Handle keyboard menu selections and other text messages
  bot.on(message('text'), async (ctx) => {
    // Try to handle auth message first
    const handled = await handleAuthMessage(ctx)
    
    if (handled) return
    
    // Try to handle transfer messages
    const transferHandled = await handleTransferMessage(ctx)
    
    if (transferHandled) return
    
    // Handle keyboard menu selections
    const text = ctx.message.text
    
    switch (text) {
      case '💰 My Wallets':
        await showWallets(ctx)
        break
        
      case '💸 Send Funds':
        await startTransfer(ctx)
        break
        
      case '📊 Transaction History':
        await ctx.reply('Transaction history feature will be available soon! 🚧')
        break
        
      case '👤 My Profile':
        await showProfile(ctx)
        break
        
      case '❓ Help':
        await showHelp(ctx)
        break
        
      default:
        await ctx.reply('I received your message but no matching command was found.\n\nPlease use the menu buttons or type /help to see available commands.')
    }
  })

  // Handle callback queries from inline keyboards
  bot.on('callback_query', async (ctx) => {
    // Handle wallet-related callbacks first
    const callbackData = (ctx.callbackQuery as any).data
    
    if (!callbackData) return
    
    // Handle transfer-related callbacks
    const transferHandled = await handleTransferCallback(ctx)
    if (transferHandled) return
    
    // Handle navigation menu callbacks
    switch (callbackData) {
      case 'show_wallets':
        await ctx.answerCbQuery('Loading wallets...')
        await showWallets(ctx)
        break
        
      case 'send_funds':
        await ctx.answerCbQuery('Loading send funds...')
        await startTransfer(ctx)
        break
        
      case 'show_history':
        await ctx.answerCbQuery('Coming soon!')
        await ctx.reply('Transaction history feature will be available soon! 🚧')
        break
        
      case 'show_profile':
        await ctx.answerCbQuery('Loading profile...')
        await showProfile(ctx)
        break
        
      case 'show_help':
        await ctx.answerCbQuery('Showing help information')
        await showHelp(ctx)
        break
        
      default:
        // If not a navigation callback, try to handle it as a wallet callback
        await handleWalletCallback(ctx)
    }
  })

  // Error handler
  bot.catch((err, ctx) => {
    console.error(`Error in bot update ${ctx.update.update_id}:`, err)
    ctx.reply('An error occurred while processing your request. Please try again later.')
  })

  return bot
}

/**
 * Show help information
 */
async function showHelp(ctx: Context) {
  await ctx.reply(
    '🔍 *Available Commands*\n\n' +
    '• /start - Show introduction\n' +
    '• /login - Connect to your Copperx account\n' +
    '• /logout - Disconnect from your account\n' +
    '• /help - Show this help message\n\n' +
    'After logging in, you will have access to:\n' +
    '• Wallet management\n' +
    '• Fund transfers\n' +
    '• Transaction history\n\n' +
    'Need assistance? Join our community at https://t.me/copperxcommunity/2183',
    { parse_mode: 'Markdown' }
  )
}

/**
 * Register bot commands
 */
function registerCommands(bot: Telegraf<Context>) {
  // Start command - Introduction
  bot.command('start', async (ctx) => {
    await ctx.reply(
      '👋 Welcome to Copperx Bot!\n\n' +
      'This bot allows you to access your Copperx Payout account directly through Telegram.\n\n' +
      'Use /login to authenticate with your Copperx account.\n' +
      'Use /help to see all available commands.',
      { parse_mode: 'Markdown' }
    )
  })

  // Login command
  bot.command('login', startAuth)

  // Logout command
  bot.command('logout', logout)

  // Profile command
  bot.command('profile', showProfile)
  
  // Wallet command
  bot.command('wallet', showWallets)
  
  // Send funds command
  bot.command('send', startTransfer)

  // Help command
  bot.command('help', showHelp)
} 
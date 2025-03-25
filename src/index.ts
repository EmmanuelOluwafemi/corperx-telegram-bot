import { initBot } from './bot'

async function main() {
  try {
    console.log('🤖 Starting Copperx Telegram Bot...')
    
    // Initialize and start the bot
    const bot = initBot()
    
    // Start the bot
    await bot.launch()
    console.log('✅ Bot is running!')
    
    // Enable graceful stop
    process.once('SIGINT', () => {
      console.log('🛑 Stopping bot...')
      bot.stop('SIGINT')
    })
    process.once('SIGTERM', () => {
      console.log('🛑 Stopping bot...')
      bot.stop('SIGTERM')
    })
  } catch (error) {
    console.error('❌ Failed to start bot:', error)
    process.exit(1)
  }
}

// Start the application
main() 
import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env file
dotenv.config()

// Define schema for environment variables
const envSchema = z.object({
  // Bot Configuration
  BOT_TOKEN: z.string(),
  
  // API Configuration
  API_BASE_URL: z.string().url(),
  
  // Pusher Configuration
  PUSHER_APP_KEY: z.string(),
  PUSHER_CLUSTER: z.string(),
  
  // Security
  SESSION_SECRET: z.string()
})

// Parse and validate environment variables
export const env = envSchema.parse({
  BOT_TOKEN: process.env.BOT_TOKEN,
  API_BASE_URL: process.env.API_BASE_URL,
  PUSHER_APP_KEY: process.env.PUSHER_APP_KEY,
  PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,
  SESSION_SECRET: process.env.SESSION_SECRET
}) 
# Copperx Payout Telegram Bot

A Telegram bot for Copperx Payout that allows users to manage their Copperx account directly through Telegram.

## Features

- User authentication with Copperx credentials
- View account information and status
- Manage wallets and transfer funds
- Receive notifications for deposits

## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- pnpm
- A Telegram Bot Token (from BotFather)
- Copperx API access

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/copperx-telegram-bot.git
   cd copperx-telegram-bot
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Configure environment variables
   Make sure you have a `.env` file with the following configuration:
   ```
   # Bot Configuration
   BOT_TOKEN=your_telegram_bot_token

   # API Configuration
   API_BASE_URL=https://income-api.copperx.io

   # Pusher Configuration
   PUSHER_APP_KEY=your_pusher_app_key
   PUSHER_CLUSTER=your_pusher_cluster

   # Security
   SESSION_SECRET=your_session_secret
   ```

4. Build the application
   ```bash
   pnpm build
   ```

5. Start the bot
   ```bash
   pnpm start
   ```

## Testing the Bot

1. Open Telegram and search for your bot by its username
2. Start a conversation with the bot by sending `/start`
3. Use `/login` to authenticate with your Copperx account
4. Follow the prompts to enter your email and OTP
5. Once authenticated, you can use the other commands

## Authentication Flow

The authentication process follows these steps:

1. User initiates login with `/login` command
2. Bot asks for the user's email
3. User provides their email address
4. Bot requests OTP from Copperx API
5. User receives OTP in their email
6. User enters the OTP in the Telegram chat
7. Bot verifies the OTP and creates a session if successful

## Deployment

The bot can be deployed on any Node.js hosting service like Render, Heroku, or a VPS.

### Deploying to Render

1. Create a new Web Service in your Render dashboard
2. Connect your GitHub repository
3. Configure the build command as `pnpm build`
4. Configure the start command as `pnpm start`
5. Add environment variables from your `.env` file
6. Deploy the service

## Troubleshooting

### Common Issues

- **Bot not responding**: Ensure your bot token is correct and the bot is running
- **Authentication failing**: Check if the Copperx API is accessible and your credentials are correct
- **OTP not receiving**: Verify email address is correct and check spam folders

For additional help, join our community: https://t.me/copperxcommunity/2183 
import { Markup } from "telegraf";
import { Context } from "../../types/telegraf";
import { authenticateOtp, requestOtp } from "../../api/auth";
import { sessionService } from "../../services/session";

// Cache for storing temporary authentication data
interface AuthCache {
  email?: string;
  sid?: string;
  stage: "idle" | "awaiting_email" | "awaiting_otp";
}

const authCache = new Map<number, AuthCache>();

/**
 * Initialize authentication process
 */
export async function startAuth(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;

  if (!chatId) {
    await ctx.reply("Error: Could not determine chat ID.");
    return;
  }

  // Reset auth cache
  authCache.set(chatId, { stage: "awaiting_email" });

  await ctx.reply(
    "🔐 *Copperx Authentication*\n\nPlease enter your Copperx email address:",
    { parse_mode: "Markdown" }
  );
}

/**
 * Log out user by removing session
 */
export async function logout(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;

  if (!chatId) {
    await ctx.reply("Error: Could not determine chat ID.");
    return;
  }

  sessionService.deleteSession(chatId);
  authCache.delete(chatId);

  await ctx.reply(
    "👋 You have been logged out. Use /login to authenticate again.",
    { parse_mode: "Markdown" }
  );
}

/**
 * Handle incoming messages for authentication
 */
export async function handleAuthMessage(ctx: Context): Promise<boolean> {
  if (!ctx.message || !("text" in ctx.message) || !ctx.chat?.id) return false;

  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  const cache = authCache.get(chatId);

  if (!cache) return false;

  // Handle email input
  if (cache.stage === "awaiting_email") {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      await ctx.reply("⚠️ Please enter a valid email address.");
      return true;
    }

    await ctx.reply("📤 Requesting OTP... Please wait.");

    const result = await requestOtp(text);

    if (!result.success || !result.data) {
      await ctx.reply(
        `❌ Failed to request OTP: ${result.error || "Unknown error"}`
      );

      // Reset authentication process
      authCache.set(chatId, { stage: "awaiting_email" });
      return true;
    }

    // Update auth cache with email and sid
    authCache.set(chatId, {
      email: result.data.email,
      sid: result.data.sid,
      stage: "awaiting_otp",
    });

    await ctx.reply(
      "📱 An OTP has been sent to your email address.\n\nPlease enter the code:",
      Markup.keyboard([["Cancel"]])
        .oneTime()
        .resize()
    );
    return true;
  }

  // Handle OTP input
  if (cache.stage === "awaiting_otp") {
    // Check for cancel action
    if (text.toLowerCase() === "cancel") {
      authCache.set(chatId, { stage: "idle" });
      await ctx.reply(
        "❌ Authentication cancelled. Use /login to try again.",
        Markup.removeKeyboard()
      );
      return true;
    }

    // Validate OTP format (numeric only)
    if (!/^\d+$/.test(text)) {
      await ctx.reply("⚠️ Please enter a valid numeric OTP code.");
      return true;
    }

    if (!cache.email || !cache.sid) {
      await ctx.reply(
        "❌ Authentication error: Missing email or session information. Please try again with /login.",
        Markup.removeKeyboard()
      );
      authCache.delete(chatId);
      return true;
    }

    await ctx.reply("🔄 Verifying OTP... Please wait.");

    const result = await authenticateOtp(cache.email, text, cache.sid);

    if (!result.success || !result.data) {
      await ctx.reply(
        `❌ Authentication failed: ${result.error || "Invalid OTP"}`,
        Markup.removeKeyboard()
      );
      authCache.delete(chatId);
      return true;
    }

    // Create session
    sessionService.createSession(
      chatId,
      result.data.user,
      result.data.accessToken,
      result.data.expireAt
    );

    // Clear auth cache
    authCache.delete(chatId);

    // Send separate messages for each part to match the desired format
    await ctx.reply("✅ Authentication successful!", Markup.removeKeyboard());
    
    // Get name or default to empty string
    const firstName = result?.data?.user?.firstName ?? '';
    const lastName = result?.data?.user?.lastName ?? '';
    await ctx.reply(`Welcome, ${firstName} ${lastName}!`);
    
    // Create a menu with inline keyboard
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
    );
    
    return true;
  }

  return false;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(chatId: number): boolean {
  return sessionService.isSessionValid(chatId);
}

/**
 * Get authentication middleware
 */
export function authMiddleware() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      await ctx.reply("Error: Could not determine chat ID.");
      return;
    }

    // Skip auth check for auth-related commands
    if (
      ctx.message &&
      "text" in ctx.message &&
      ["/start", "/login", "/logout"].includes(ctx.message.text)
    ) {
      return next();
    }

    // Handle messages part of the auth flow
    if (authCache.has(chatId)) {
      const handled = await handleAuthMessage(ctx);
      if (handled) return;
    }

    // Check if authenticated for other commands
    if (!isAuthenticated(chatId)) {
      await ctx.reply(
        "🔒 You need to authenticate first.\n\nUse /login to sign in to your Copperx account."
      );
      return;
    }

    return next();
  };
}

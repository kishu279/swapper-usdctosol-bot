import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;

console.debug("🚀 Initializing swapper bot...");
console.debug("🔑 BOT_TOKEN exists:", !!BOT_TOKEN);

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set");
  throw new Error("BOT_TOKEN is not set");
}

console.debug("✅ Creating Telegraf instance");
const bot = new Telegraf(BOT_TOKEN!);

type user_subscription = {
  name: string;
  subscription: {
    quantity?: number;
    sol_rate_usdc: number;
    subscribed: boolean;
  }[];
};

const user = new Map<number, user_subscription>();
console.debug("📊 User data store initialized");

const sol_mint_address = "So11111111111111111111111111111111111111112";
const usdc_mint_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function main() {
  console.debug("🎯 Setting up bot commands...");

  // bot commands
  bot.command("start", async (ctx) => {
    const userId = ctx.message.from.id;
    const name = ctx.message.from.first_name;

    console.debug("🔵 /start command received", {
      userId,
      name,
      username: ctx.message.from.username,
    });

    await ctx.reply("Hello there!");

    if (!user.has(userId)) {
      user.set(userId, {
        name: name,
        subscription: [],
      });
      console.debug("✅ New user created", { userId, name });
    } else {
      console.debug("👤 Existing user found", { userId, name });
    }

    console.debug("📈 Total users:", user.size);
  });

  // insert the subscription
  bot.command("subscribe", async (ctx) => {
    const userId = ctx.message.from.id;
    const messageText = ctx.message.text;

    console.debug("🔵 /subscribe command received", {
      userId,
      messageText,
      username: ctx.message.from.username,
    });

    if (!user.has(userId)) {
      console.debug("❌ User not found, need to /start first", { userId });
      await ctx.reply("Please use /start command first");
      return;
    }

    const args = ctx.message.text.split(" ");
    console.debug("📝 Subscribe arguments parsed", {
      args,
      argsCount: args.length,
    });

    if (args.length < 3) {
      console.debug("❌ Insufficient arguments for subscribe", {
        argsCount: args.length,
      });
      await ctx.reply("Usage: /subscribe <quantity> <sol_rate_usdc>");
      return;
    }

    const quantity = parseFloat(args.at(1)!) || 1;
    const sol_rate_usdc = parseFloat(args.at(2)!);

    console.debug("🔢 Parsing rates", {
      sol_rate_raw: args.at(2),
      sol_rate_parsed: sol_rate_usdc,
    });

    if (isNaN(sol_rate_usdc)) {
      console.debug("❌ Invalid rates provided", { sol_rate_usdc });
      await ctx.reply("Invalid rates. Please enter valid numbers.");
      return;
    }

    const newSubscription = {
      quantity: quantity,
      sol_rate_usdc: sol_rate_usdc,
      subscribed: true,
    };

    user.get(userId)!.subscription.push(newSubscription);

    const userSubscriptions = user.get(userId)!.subscription;
    console.debug("✅ Subscription added successfully", {
      userId,
      newSubscription,
      totalSubscriptions: userSubscriptions.length,
    });

    await ctx.reply("Subscribed successfully!");
  });

  bot.command("subscriptions", async (ctx) => {
    const userId = ctx.message.from.id;

    console.debug("🔵 /subscriptions command received", {
      userId,
      username: ctx.message.from.username,
    });

    if (!user.has(userId)) {
      console.debug("❌ User not found for subscriptions", { userId });
      await ctx.reply("Please use /start command first");
      return;
    }

    const subscriptions = user.get(userId)!.subscription;
    console.debug("📋 Fetching user subscriptions", {
      userId,
      subscriptionCount: subscriptions.length,
      subscriptions,
    });

    const reply = subscriptions.map((s) => {
      return `* ${s.usdc_rate} USDC -> ${s.sol_rate_usdc} SOL`;
    });

    console.debug("💬 Sending subscriptions reply", {
      userId,
      replyLines: reply.length,
    });

    await ctx.reply(reply.join("\n"));
    return;
  });

  bot.command("help", async (ctx) => {
    const userId = ctx.message.from.id;

    console.debug("🔵 /help command received", {
      userId,
      username: ctx.message.from.username,
    });

    await ctx.reply(
      "Commands:\n/start - Start the bot\n/subscribe <usdc_rate> <sol_rate_usdc> - Subscribe to a rate\n/subscriptions - List your subscriptions\n/help - Show this help message"
    );

    console.debug("💬 Help message sent", { userId });
  });

  // Add error handling
  bot.catch((err, ctx) => {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("❌ Bot error occurred:", {
      error: error.message,
      stack: error.stack,
      userId: ctx.from?.id,
      username: ctx.from?.username,
      updateType: ctx.updateType,
    });
  });

  console.log("🤖 Bot started and ready!");
  console.debug("🚀 Launching bot...");
  bot.launch();

  // Graceful shutdown
  process.once("SIGINT", () => {
    console.debug("🛑 SIGINT received, shutting down gracefully...");
    bot.stop("SIGINT");
  });

  process.once("SIGTERM", () => {
    console.debug("🛑 SIGTERM received, shutting down gracefully...");
    bot.stop("SIGTERM");
  });
}

main();

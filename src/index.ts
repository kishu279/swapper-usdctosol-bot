import { Telegraf } from "telegraf";
import { getSwapQuoteValue } from "./swap";

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

const priceToUser = new Map<number, Set<number>>();
console.debug("📊 Price to User data store initialized");

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

    await ctx.reply("🚀 Welcome to SwapBot! Ready to track those rates?");

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
      await ctx.reply("⚠️ Hit /start first!");
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
      await ctx.reply("📝 Use: /subscribe <quantity> <sol_rate>");
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
      await ctx.reply("❌ Invalid numbers, try again!");
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

    const userPrices = sol_rate_usdc.toFixed(2) as unknown as number;

    if (priceToUser.has(userPrices)) {
      priceToUser.get(userPrices)?.add(userId);
    } else {
      priceToUser.set(userPrices, new Set([userId]));
    }

    await ctx.reply("✅ You're in! Rate locked 🔒");
  });

  bot.command("subscriptions", async (ctx) => {
    const userId = ctx.message.from.id;

    console.debug("🔵 /subscriptions command received", {
      userId,
      username: ctx.message.from.username,
    });

    if (!user.has(userId)) {
      console.debug("❌ User not found for subscriptions", { userId });
      await ctx.reply("⚠️ Hit /start first!");
      return;
    }

    const subscriptions = user.get(userId)!.subscription;
    console.debug("📋 Fetching user subscriptions", {
      userId,
      subscriptionCount: subscriptions.length,
      subscriptions,
    });

    const reply = subscriptions.map((s) => {
      return `🎯 1 USDC → ${s.sol_rate_usdc} SOL`;
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
      "🔥 Commands:\n/start - Join the party\n/subscribe <qty> <rate> - Lock in rates\n/subscriptions - Your watchlist\n/help - This menu"
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

  swapChecker();

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

async function swapChecker() {
  // poll the data every 5 seconds
  // check the response against all user subscriptions
  // send the message if the rate is met

  const goal_sol_rate = 233.1923; // the user wants to buy sol at this rate

  setInterval(async () => {
    // poll the data every 5 seconds
    const response = await getSwapQuoteValue(
      1 * 10 ** 6,
      usdc_mint_address,
      sol_mint_address
    );

    if (response) {
      // convert the sol lamports to sol
      const current_sol_rate = 1 / response;
      console.debug("🔄 GOAL SOL rate:", goal_sol_rate);
      console.debug("🔄 Current SOL rate:", current_sol_rate.toFixed(2));

      // get the user ids that subscribed to this rate
      if (priceToUser.has(current_sol_rate.toFixed(2) as unknown as number)) {
        const userIds = priceToUser.get(
          current_sol_rate.toFixed(2) as unknown as number
        );
        console.debug("👥 Notifying users:", userIds);

        // iterating through the user ids
        for (const userId of userIds!) {
          await bot.telegram.sendMessage(
            userId,
            `🔥 BINGO! Your rate hit: ${current_sol_rate.toFixed(2              
            )} USDC per SOL! 💰`
          );
        }
      } else {
        console.log("👥 No users to notify for this rate");
      }
    }
  }, 5000);
}

main();

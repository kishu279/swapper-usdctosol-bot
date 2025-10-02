import axios from "axios";

const JUP_URL = "https://lite-api.jup.ag";
const slippage = 0.1;

async function getSwapQuoteValue(
  amount: Number,
  fromMint: string,
  toMint: string
) {
  try {
    const url = `${JUP_URL}/swap/v1/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${amount}&slippageBps=${
      slippage * 100
    }&restrictIntermediateTokens=true`;

    const config = {
      headers: {
        Accept: "application/json",
      },
    };

    const response = await axios.get(url, config);

    const { inAmount, outAmount } = response.data;
    console.debug("📝 Swap quote data:", {
      inAmount: inAmount / 10 ** 6,
      outAmount: outAmount / 10 ** 9,
    });

    // console.debug("📝 Swap quote response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching swap quote:", error);
  }
}

async function main() {
  console.debug("🎯 Setting up bot commands...");

  const sol_mint_address = "So11111111111111111111111111111111111111112";
  const usdc_mint_address = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  await getSwapQuoteValue(1 * 10 ** 6, usdc_mint_address, sol_mint_address);
}

main();

// export { getSwapQuoteValue };

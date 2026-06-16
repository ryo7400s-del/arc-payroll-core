import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
};

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const USDC = "0x3600000000000000000000000000000000000000";
const USDC_ABI = [
  { type:"function", name:"transfer", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[{type:"bool"}] },
  { type:"function", name:"balanceOf", inputs:[{name:"account",type:"address"}], outputs:[{type:"uint256"}] },
];

const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function x402Flow() {
  console.log("=".repeat(50));
  console.log("⚡ x402 Payment Flow (Arc Testnet)");
  console.log("=".repeat(50));

  const MERCHANT = "0x000000000000000000000000000000000000dEaD";
  const AMOUNT   = parseUnits("0.01", 6); // 0.01 USDC

  // 残高確認
  const balance = await publicClient.readContract({
    address: USDC, abi: USDC_ABI,
    functionName: "balanceOf", args: [account.address],
  });
  console.log(`\n💰 残高: ${Number(balance) / 1e6} USDC`);

  console.log("\n📡 Step 1: AIエージェント → APIリクエスト");
  console.log("   GET https://api.example.com/data");

  console.log("\n💳 Step 2: サーバー → 402 Payment Required");
  console.log(`   merchant: ${MERCHANT}`);
  console.log(`   amount:   0.01 USDC`);

  console.log("\n💸 Step 3: USDC直接送金 (x402決済)...");
  const hash = await walletClient.writeContract({
    address: USDC, abi: USDC_ABI,
    functionName: "transfer",
    args: [MERCHANT, AMOUNT],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  console.log("   ✅ 送金完了!");
  console.log("   TX:", hash);
  console.log("   🔍 https://testnet.arcscan.app/tx/" + hash);

  // 残高確認
  const newBalance = await publicClient.readContract({
    address: USDC, abi: USDC_ABI,
    functionName: "balanceOf", args: [account.address],
  });
  console.log(`\n💰 送金後残高: ${Number(newBalance) / 1e6} USDC`);

  console.log("\n✅ Step 4: APIコンテンツ返却");
  console.log('   { data: "APIレスポンス", status: 200 }');
  console.log("\n" + "=".repeat(50));
  console.log("🎉 x402フロー完了! 0.01 USDC 支払い成功");
  console.log("=".repeat(50));
}

x402Flow().catch(console.error);

import { createWalletClient, createPublicClient, http, parseUnits, keccak256, encodePacked, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
};

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const SCHEDULER = "0xf28150bc2746af10f91b2744295b6c0de9a50a46";
const USDC = "0x3600000000000000000000000000000000000000";
const ABI = JSON.parse(readFileSync("./build/src_PaymentScheduler_sol_PaymentScheduler.abi", "utf8"));
const USDC_ABI = [
  { type:"function", name:"approve", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{type:"bool"}] },
  { type:"function", name:"allowance", inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], outputs:[{type:"uint256"}] },
];

const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function simulateX402Flow() {
  console.log("=".repeat(50));
  console.log("⚡ x402 Payment Flow");
  console.log("=".repeat(50));

  const PAYER    = account.address;
  const MERCHANT = "0x000000000000000000000000000000000000dEaD";
  const AMOUNT   = parseUnits("0.01", 6);
  const NONCE    = BigInt(Date.now());
  const EXPIRY   = BigInt(Math.floor(Date.now() / 1000) + 300);

  console.log("\n📡 Step 1: APIリクエスト送信");
  console.log("💳 Step 2: 402 Payment Required");
  console.log(`   payer:    ${PAYER}`);
  console.log(`   merchant: ${MERCHANT}`);
  console.log(`   amount:   0.01 USDC`);

  console.log("\n✍️  Step 3: 署名中...");
  const innerHash = keccak256(
    encodePacked(
      ["address", "address", "uint256", "uint256", "uint256"],
      [PAYER, MERCHANT, AMOUNT, EXPIRY, NONCE]
    )
  );

  const signature = await account.signMessage({
    message: { raw: toBytes(innerHash) },
  });
  console.log("   署名:", signature.slice(0, 20) + "...");

  console.log("\n🔐 Step 4: ホワイトリスト確認...");
  const isListed = await publicClient.readContract({
    address: SCHEDULER, abi: ABI,
    functionName: "isWhitelisted",
    args: [PAYER, MERCHANT],
  });
  if (!isListed) {
    const h = await walletClient.writeContract({
      address: SCHEDULER, abi: ABI,
      functionName: "addToWhitelist", args: [MERCHANT],
    });
    await publicClient.waitForTransactionReceipt({ hash: h });
    console.log("   ✅ ホワイトリスト追加");
  } else {
    console.log("   ✅ 済み");
  }

  console.log("\n📝 Step 5: USDC approve...");
  const allowance = await publicClient.readContract({
    address: USDC, abi: USDC_ABI,
    functionName: "allowance", args: [PAYER, SCHEDULER],
  });
  if (allowance < AMOUNT) {
    const h = await walletClient.writeContract({
      address: USDC, abi: USDC_ABI,
      functionName: "approve", args: [SCHEDULER, parseUnits("10", 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: h });
    console.log("   ✅ approve完了");
  } else {
    console.log("   ✅ 済み");
  }

  console.log("\n💸 Step 6: x402決済実行...");
  const x402ABI = [{
    type: "function", name: "executeX402Payment",
    inputs: [{ name: "req", type: "tuple", components: [
      { name: "payer",     type: "address" },
      { name: "merchant",  type: "address" },
      { name: "amount",    type: "uint256" },
      { name: "expiry",    type: "uint256" },
      { name: "nonce",     type: "uint256" },
      { name: "signature", type: "bytes"   },
    ]}],
    outputs: []
  }];

  const execHash = await walletClient.writeContract({
    address: SCHEDULER, abi: x402ABI,
    functionName: "executeX402Payment",
    args: [{ payer: PAYER, merchant: MERCHANT, amount: AMOUNT, expiry: EXPIRY, nonce: NONCE, signature }],
  });
  await publicClient.waitForTransactionReceipt({ hash: execHash });

  console.log("   ✅ x402決済完了!");
  console.log("   TX:", execHash);
  console.log("   🔍 https://testnet.arcscan.app/tx/" + execHash);
  console.log("\n✅ Step 7: APIコンテンツ返却");
  console.log("=".repeat(50));
  console.log("🎉 x402フロー完了! 0.01 USDC 支払い成功");
  console.log("=".repeat(50));
}

simulateX402Flow().catch(console.error);

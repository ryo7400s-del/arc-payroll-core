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
const SCHEDULER = "0xf28150bc2746af10f91b2744295b6c0de9a50a46";
const ABI = JSON.parse(readFileSync("./build/src_PaymentScheduler_sol_PaymentScheduler.abi", "utf8"));

const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function send(functionName, args) {
  const hash = await walletClient.writeContract({
    address: SCHEDULER, abi: ABI, functionName, args,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ ${functionName} 完了 (${hash})`);
}

async function main() {
  // 1. 支出ガード設定 (週間600 USDC, 最大600 USDC)
  await send("setGuard", [parseUnits("600", 6), parseUnits("600", 6)]);

  // 2. 自分のアドレスをホワイトリストに追加 (テスト送金先)
  await send("addToWhitelist", [account.address]);

  // 3. 毎週1 USDCのテストスケジュール作成
  await send("createSchedule", [
    account.address,
    parseUnits("1", 6),   // 1 USDC
    BigInt(3600),          // 1時間後 (テスト用)
    "Test Weekly Payment"
  ]);

  console.log("\n🎉 初期設定完了!");
  console.log("Contract:", SCHEDULER);
}

main().catch(console.error);

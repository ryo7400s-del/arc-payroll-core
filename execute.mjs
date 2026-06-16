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
const USDC = "0x3600000000000000000000000000000000000000";
const ABI = JSON.parse(readFileSync("./build/src_PaymentScheduler_sol_PaymentScheduler.abi", "utf8"));
const USDC_ABI = [
  { type:"function", name:"approve", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{type:"bool"}] },
  { type:"function", name:"balanceOf", inputs:[{name:"account",type:"address"}], outputs:[{type:"uint256"}] },
];

const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function main() {
  const balance = await publicClient.readContract({
    address: USDC, abi: USDC_ABI,
    functionName: "balanceOf", args: [account.address],
  });
  console.log("💰 USDC残高:", Number(balance) / 1e6, "USDC");

  const [ok, reason] = await publicClient.readContract({
    address: SCHEDULER, abi: ABI,
    functionName: "canExecute", args: [account.address, BigInt(0)],
  });
  console.log("🔍 実行可否:", ok ? "✅ OK" : `❌ ${reason}`);

  if (!ok) { console.log("⏳", reason); return; }

  console.log("📝 USDC approve中...");
  const approveTx = await walletClient.writeContract({
    address: USDC, abi: USDC_ABI,
    functionName: "approve",
    args: [SCHEDULER, parseUnits("600", 6)],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("✅ approve完了");

  console.log("🚀 送金実行中...");
  const execTx = await walletClient.writeContract({
    address: SCHEDULER, abi: ABI,
    functionName: "executeSchedule",
    args: [account.address, BigInt(0)],
  });
  await publicClient.waitForTransactionReceipt({ hash: execTx });
  console.log("✅ 送金完了!");
  console.log("🔍 https://testnet.arcscan.app/tx/" + execTx);
}

main().catch(console.error);

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
};

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const account = privateKeyToAccount(PRIVATE_KEY);

const walletClient = createWalletClient({
  account, chain: arcTestnet, transport: http(),
});
const publicClient = createPublicClient({
  chain: arcTestnet, transport: http(),
});

const BYTECODE = "0x" + readFileSync(
  "./build/src_PaymentScheduler_sol_PaymentScheduler.bin", "utf8"
).trim();

const ABI = JSON.parse(readFileSync(
  "./build/src_PaymentScheduler_sol_PaymentScheduler.abi", "utf8"
));

async function main() {
  console.log("=".repeat(50));
  console.log("🚀 Arc Testnet デプロイ開始");
  console.log("Deployer:", account.address);

  const hash = await walletClient.deployContract({
    abi: ABI,
    bytecode: BYTECODE,
  });
  console.log("📦 TX Hash:", hash);
  console.log("⏳ 確認中...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("✅ デプロイ完了!");
  console.log("📍 Contract:", receipt.contractAddress);
  console.log("🔍 https://testnet.arcscan.app/address/" + receipt.contractAddress);
  console.log("=".repeat(50));
  console.log("\n.envに追加:");
  console.log("SCHEDULER_ADDRESS=" + receipt.contractAddress);
}

main().catch(console.error);

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const arcTestnet = {
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name:"USDC", symbol:"USDC", decimals:18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }
};

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

const bytecode = "0x" + readFileSync("build/src_Registry_sol_Registry.bin", "utf8");

console.log("🚀 Deploying Registry...");
const hash = await walletClient.deployContract({ abi: [], bytecode });
console.log("📦 TX Hash:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("✅ Registry deployed!");
console.log("📍 Address:", receipt.contractAddress);
console.log("🔍 https://testnet.arcscan.app/address/" + receipt.contractAddress);

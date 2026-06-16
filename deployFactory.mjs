import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name:"USDC", symbol:"USDC", decimals:18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
};

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wc = createWalletClient({ account, chain:arcTestnet, transport:http() });
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const bytecode = "0x" + readFileSync("build/src_PayrollFactory_sol_PayrollFactory.bin", "utf8");
const abi = JSON.parse(readFileSync("build/src_PayrollFactory_sol_PayrollFactory.abi", "utf8"));

console.log("🚀 Deploying PayrollFactory...");
const hash = await wc.deployContract({ abi, bytecode });
const receipt = await pc.waitForTransactionReceipt({ hash });
console.log("✅ Factory deployed:", receipt.contractAddress);
console.log("🔍", `https://testnet.arcscan.app/address/${receipt.contractAddress}`);

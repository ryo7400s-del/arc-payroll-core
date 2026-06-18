import 'dotenv/config';
import { createPublicClient, http } from "viem";
import crypto from "crypto";

// Arc Testnet設定
const arcTestnet = {
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }
};

// 契約アドレスとABI
const REGISTRY = "0xc01c0113e353c6fc1be7d32a80e9688e1256b81f";
const REGISTRY_ABI = [
  { type: "function", name: "getAll", inputs: [], outputs: [{ components: [{ name: "owner", type: "address" }, { name: "scheduler", type: "address" }, { name: "name", type: "string" }, { name: "registeredAt", type: "uint256" }], name: "", type: "tuple[]" }] },
];
const ABI = [
  { type: "function", name: "getSchedules", inputs: [{ name: "owner", type: "address" }], outputs: [{ components: [{ name: "id", type: "uint96" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "interval", type: "uint256" }, { name: "nextExecution", type: "uint256" }, { name: "active", type: "bool" }, { name: "label", type: "string" }], name: "", type: "tuple[]" }] },
  { type: "function", name: "canExecute", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ name: "ok", type: "bool" }, { name: "reason", type: "string" }] },
];

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function main() {
  console.log("--- 🚀 直接API通信モード (Contract Execution) ---");
  console.log("🔑 API Key check:", !!process.env.CIRCLE_API_KEY ? "OK" : "MISSING");
  console.log("----------------------------------------------");

  // Registryから全カンパニーを取得
  const companies = await publicClient.readContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAll",
  });
  console.log(`🏢 Found ${companies.length} company(s)`);

  for (const company of companies) {
    const { owner, scheduler } = company;
    console.log(`\n🔍 Company: ${owner} → ${scheduler}`);

    // スケジュール取得
    const schedules = await publicClient.readContract({
      address: scheduler, abi: ABI, functionName: "getSchedules", args: [owner],
    });
    console.log(`📋 Found ${schedules.length} schedule(s)`);

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.active) { console.log(`⏸ Schedule ${i} (${s.label}) is paused`); continue; }

      // 実行可能かチェック
      const [ok, reason] = await publicClient.readContract({
        address: scheduler, abi: ABI, functionName: "canExecute", args: [owner, BigInt(i)],
      });
      if (!ok) { console.log(`⏳ Schedule ${i} (${s.label}): ${reason}`); continue; }

      console.log(`🚀 Executing schedule ${i} (${s.label})...`);

      try {
        // 直接APIエンドポイントを叩く
        const response = await fetch("https://api-sandbox.circle.com/v1/w3s/transactions/contractExecution", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.CIRCLE_API_KEY}`
          },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            walletId: process.env.CIRCLE_WALLET_ID,
            contractAddress: scheduler,
            abiFunctionSignature: "executeSchedule(address,uint256)",
            abiParameters: [owner, i.toString()],
            feeLevel: "MEDIUM"
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(JSON.stringify(result));
        }

        console.log(`✅ TX submitted successfully! ID: ${result.data.id}`);
      } catch (error) {
        console.error(`❌ API Error on schedule ${i}:`, error.message);
      }
    }
  }
  console.log("\n✨ All operations finished.");
}

main().catch(e => { console.error("❌ Fatal Error:", e.message); process.exit(1); });

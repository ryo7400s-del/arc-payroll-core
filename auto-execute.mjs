import 'dotenv/config';
import { createPublicClient, http } from "viem";
import crypto from "crypto";

const arcTestnet = {
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }
};

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
  console.log("--- 🚀 API直接通信モード (Contract Execution) ---");
  
  // 環境変数チェック
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET || !process.env.CIRCLE_WALLET_ID) {
    console.error("❌ ERROR: Required environment variables are missing!");
    process.exit(1);
  }

  const companies = await publicClient.readContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAll",
  });
  console.log(`🏢 Found ${companies.length} company(s)`);

  for (const company of companies) {
    const { owner, scheduler } = company;
    const schedules = await publicClient.readContract({
      address: scheduler, abi: ABI, functionName: "getSchedules", args: [owner],
    });

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.active) continue;

      const [ok] = await publicClient.readContract({
        address: scheduler, abi: ABI, functionName: "canExecute", args: [owner, BigInt(i)],
      });
      if (!ok) continue;

      console.log(`🚀 Executing schedule ${i} (${s.label})...`);
      
      const payload = {
        idempotencyKey: crypto.randomUUID(),
        walletId: process.env.CIRCLE_WALLET_ID,
        contractAddress: scheduler,
        abiFunctionSignature: "executeSchedule(address,uint256)",
        abiParameters: [owner, i.toString()],
        feeLevel: "MEDIUM"
      };

      try {
        const url = "https://api-sandbox.circle.com/v1/w3s/transactions/contractExecution";
        console.log(`📡 Sending request to: ${url}`);
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.CIRCLE_API_KEY}`,
            "X-Entity-Secret": process.env.CIRCLE_ENTITY_SECRET
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error(`❌ API Failed with Status: ${response.status}`);
          console.error(`❌ Response Body:`, JSON.stringify(result, null, 2));
          throw new Error("API call failed");
        }

        console.log(`✅ TX submitted: ${result.data.id}`);
      } catch (error) {
        console.error(`❌ API Error on schedule ${i}:`, error.message);
      }
    }
  }
}

main().catch(e => { console.error("❌ Fatal Error:", e.message); process.exit(1); });

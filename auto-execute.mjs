import 'dotenv/config'; // 環境変数の読み込み
import { createPublicClient, http, encodeFunctionData, parseAbiItem } from "viem";
import { CircleDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const arcTestnet = {
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name:"USDC", symbol:"USDC", decimals:18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }
};

const REGISTRY = "0xc01c0113e353c6fc1be7d32a80e9688e1256b81f";
const REGISTRY_ABI = [
  { type:"function", name:"getAll", inputs:[], outputs:[{components:[{name:"owner",type:"address"},{name:"scheduler",type:"address"},{name:"name",type:"string"},{name:"registeredAt",type:"uint256"}],name:"",type:"tuple[]"}] },
];
const ABI = [
  { type:"function", name:"getSchedules", inputs:[{name:"owner",type:"address"}], outputs:[{components:[{name:"id",type:"uint96"},{name:"recipient",type:"address"},{name:"amount",type:"uint256"},{name:"interval",type:"uint256"},{name:"nextExecution",type:"uint256"},{name:"active",type:"bool"},{name:"label",type:"string"}],name:"",type:"tuple[]"}] },
  { type:"function", name:"canExecute", inputs:[{name:"owner",type:"address"},{name:"index",type:"uint256"}], outputs:[{name:"ok",type:"bool"},{name:"reason",type:"string"}] },
  { type:"function", name:"executeSchedule", inputs:[{name:"owner",type:"address"},{name:"index",type:"uint256"}], outputs:[{name:"txRef",type:"bytes32"}] },
];

const circleClient = new CircleDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function main() {
  // 環境変数の生存確認ログ
  console.log("--- 🕵️ 環境変数の生存確認 ---");
  console.log("🔑 API Key exists:", !!process.env.CIRCLE_API_KEY);
  console.log("🔐 Entity Secret exists:", !!process.env.CIRCLE_ENTITY_SECRET);
  console.log("👛 Wallet ID exists:", !!process.env.CIRCLE_WALLET_ID);
  console.log("------------------------------");

  const companies = await publicClient.readContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAll",
  });
  console.log(`🏢 Found ${companies.length} company(s) in Registry`);

  let totalExecuted = 0, totalSchedules = 0;

  for (const company of companies) {
    const { owner, scheduler } = company;
    console.log(`\n🔍 Company: ${owner} → ${scheduler}`);

    const schedules = await publicClient.readContract({
      address: scheduler, abi: ABI, functionName: "getSchedules", args: [owner],
    });
    console.log(`📋 Found ${schedules.length} schedule(s)`);
    totalSchedules += schedules.length;

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.active) { console.log(`⏸ Schedule ${i} (${s.label}) is paused`); continue; }

      const [ok, reason] = await publicClient.readContract({
        address: scheduler, abi: ABI, functionName: "canExecute", args: [owner, BigInt(i)],
      });
      if (!ok) { console.log(`⏳ Schedule ${i} (${s.label}): ${reason}`); continue; }

      console.log(`🚀 Executing schedule ${i} (${s.label})...`);
      
      try {
        // 💡 修正ポイント: SDKにABIを解析させず、viemで手動エンコードする
        const data = encodeFunctionData({
          abi: [parseAbiItem("function executeSchedule(address,uint256)")],
          args: [owner, BigInt(i)]
        });

        const response = await circleClient.createTransaction({
          walletId: process.env.CIRCLE_WALLET_ID,
          contractAddress: scheduler,
          data: data, // 👈 エンコード済みの16進数データを直接渡す
          feeLevel: "MEDIUM",
        });

        const txId = response.data?.id;
        console.log(`✅ TX submitted: ${txId}`);
        totalExecuted++;
      } catch (error) {
        console.error(`❌ Execution Error on schedule ${i}:`, error.message);
      }
    }
  }
  console.log(`\n✨ Executed ${totalExecuted}/${totalSchedules} schedules across ${companies.length} companies`);
}

main().catch(e => { console.error("❌ Main Error:", e.message); process.exit(1); });

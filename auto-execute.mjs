import 'dotenv/config';
import { createPublicClient, http, encodeFunctionData, parseAbiItem } from "viem"; // 👈 encodeFunctionData を追加
import { CircleDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

// ... (中略：arcTestnetやREGISTRY_ABI, ABIの設定などはそのまま)

async function main() {
  // ... (中略：生存確認ログはそのまま)

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
          data: data, // 👈 データを直接渡す
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

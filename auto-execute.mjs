import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

async function main() {
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
      const hash = await walletClient.writeContract({
        address: scheduler, abi: ABI,
        functionName: "executeSchedule", args: [owner, BigInt(i)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ Done! TX: ${hash}`);
      console.log(`🔍 https://testnet.arcscan.app/tx/${hash}`);
      totalExecuted++;
    }
  }
  console.log(`\n✨ Executed ${totalExecuted}/${totalSchedules} schedules across ${companies.length} companies`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });

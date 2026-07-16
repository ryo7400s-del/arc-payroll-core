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

const RECORD_URL = "https://arc-payroll-ui.vercel.app/api/record-execution";
const RECORD_SECRET = process.env.RECORD_SECRET;

// --- レート制限対策 ---------------------------------------------------
// パブリックRPC (https://rpc.testnet.arc.network) は単位時間あたりの
// リクエスト数に上限があり、10社分をノーウェイトでループすると
// "request limit reached" で失敗する。各呼び出しの間に固定の待機を挟み、
// 429/レート制限エラーが出た場合は指数バックオフでリトライする。
const RPC_DELAY_MS = Number(process.env.RPC_DELAY_MS ?? 1200);
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err) {
  const msg = (err?.message || err?.details || "").toString().toLowerCase();
  return (
    msg.includes("request limit reached") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("too many requests")
  );
}

// publicClient.readContract をレート制限対応でラップする。
// 呼び出しごとに RPC_DELAY_MS 待機し、レート制限エラーが出た場合は
// 指数バックオフ（2s, 4s, 8s, 16s, 32s）でリトライする。
async function readContractSafe(args) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await publicClient.readContract(args);
      await sleep(RPC_DELAY_MS);
      return result;
    } catch (err) {
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        const backoff = 2000 * 2 ** attempt;
        console.warn(
          `⚠️ RPC rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${backoff}ms...`
        );
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error("readContractSafe: exhausted retries");
}
// -----------------------------------------------------------------------

async function recordExecution(owner, recipient, amount, txHash, scheduler, label) {
  if (!RECORD_SECRET) { console.warn("⚠️ RECORD_SECRET not set, skipping history record"); return; }
  try {
    const res = await fetch(RECORD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: RECORD_SECRET, owner, recipient, amount: amount.toString(), txHash, scheduler, label }),
    });
    if (!res.ok) console.warn("⚠️ Failed to record history:", await res.text());
  } catch (e) {
    console.warn("⚠️ Failed to record history:", e.message);
  }
}

async function main() {
  const companies = await readContractSafe({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAll",
  });
  console.log(`🏢 Found ${companies.length} company(s) in Registry`);

  let totalExecuted = 0, totalSchedules = 0;

  for (const company of companies) {
    const { owner, scheduler } = company;
    console.log(`\n🔍 Company: ${owner} → ${scheduler}`);

    const schedules = await readContractSafe({
      address: scheduler, abi: ABI, functionName: "getSchedules", args: [owner],
    });
    console.log(`📋 Found ${schedules.length} schedule(s)`);
    totalSchedules += schedules.length;

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.active) { console.log(`⏸ Schedule ${i} (${s.label}) is paused`); continue; }

      const [ok, reason] = await readContractSafe({
        address: scheduler, abi: ABI, functionName: "canExecute", args: [owner, BigInt(i)],
      });
      if (!ok) { console.log(`⏳ Schedule ${i} (${s.label}): ${reason}`); continue; }

      console.log(`🚀 Executing schedule ${i} (${s.label})...`);
      const hash = await walletClient.writeContract({
        address: scheduler, abi: ABI,
        functionName: "executeSchedule", args: [owner, BigInt(i)],
      });
      await sleep(RPC_DELAY_MS);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ Done! TX: ${hash}`);
      console.log(`🔍 https://testnet.arcscan.app/tx/${hash}`);

      await recordExecution(owner, s.recipient, s.amount, hash, scheduler, s.label);

      totalExecuted++;
    }
  }
  console.log(`\n✨ Executed ${totalExecuted}/${totalSchedules} schedules across ${companies.length} companies`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });

import { createPublicClient, http } from "viem";

const arcTestnet = {
  id:5042002, name:"Arc Testnet",
  nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},
  rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}}
};

const SCHEDULER = "0xD3ea6652a52255749E036E730a13d0E252a7F50B";
const OWNER = "0xa5fb8e2D23cd7c218a99dA27A029B48Fd92D6fcb";
const ABI = [
  { type:"function", name:"getSchedules", inputs:[{name:"owner",type:"address"}], outputs:[{components:[{name:"id",type:"uint96"},{name:"recipient",type:"address"},{name:"amount",type:"uint256"},{name:"interval",type:"uint256"},{name:"nextExecution",type:"uint256"},{name:"active",type:"bool"},{name:"label",type:"string"}],name:"",type:"tuple[]"}] },
  { type:"function", name:"getGuard", inputs:[{name:"owner",type:"address"}], outputs:[{components:[{name:"weeklyLimit",type:"uint256"},{name:"weeklyUsed",type:"uint256"},{name:"weekResetAt",type:"uint256"},{name:"maxSingleTx",type:"uint256"}],name:"",type:"tuple"}] },
];

const pc = createPublicClient({ chain: arcTestnet, transport: http() });
const schedules = await pc.readContract({ address: SCHEDULER, abi: ABI, functionName: "getSchedules", args: [OWNER] });
const guard = await pc.readContract({ address: SCHEDULER, abi: ABI, functionName: "getGuard", args: [OWNER] });

console.log("Guard - maxSingleTx:", Number(guard.maxSingleTx)/1e6, "(0=unlimited)");
console.log("Guard - weeklyLimit:", Number(guard.weeklyLimit)/1e6, "(0=unlimited)");

schedules.forEach((s, i) => {
  const next = new Date(Number(s.nextExecution) * 1000);
  console.log(`\nSchedule ${i}: ${s.label}`);
  console.log(`  Amount: ${Number(s.amount)/1e6} USDC`);
  console.log(`  Next execution: ${next.toLocaleString("ja-JP")}`);
  console.log(`  Active: ${s.active}`);
});

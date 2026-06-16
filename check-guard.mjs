import { createPublicClient, http } from "viem";

const arcTestnet = {
  id:5042002, name:"Arc Testnet",
  nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},
  rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}}
};

const SCHEDULER = "0x37362A6fB2b9a6df5757B114A5A14F1311d82F98";
const OWNER = "0xa5fb8e2D23cd7c218a99dA27A029B48Fd92D6fcb";
const ABI = [
  { type:"function", name:"getGuard", inputs:[{name:"owner",type:"address"}], outputs:[{components:[{name:"weeklyLimit",type:"uint256"},{name:"weeklyUsed",type:"uint256"},{name:"weekResetAt",type:"uint256"},{name:"maxSingleTx",type:"uint256"}],name:"",type:"tuple"}] },
];

const pc = createPublicClient({ chain: arcTestnet, transport: http() });
const guard = await pc.readContract({ address: SCHEDULER, abi: ABI, functionName: "getGuard", args: [OWNER] });
console.log("Weekly Limit:", Number(guard.weeklyLimit) / 1e6, "USDC");
console.log("Weekly Used:", Number(guard.weeklyUsed) / 1e6, "USDC");
console.log("Max Single TX:", Number(guard.maxSingleTx) / 1e6, "USDC");

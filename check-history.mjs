import { createPublicClient, http } from "viem";

const arcTestnet = {
  id:5042002, name:"Arc Testnet",
  nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},
  rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}}
};

const SCHEDULER = "0xd3ea6652a52255749e036e730a13d0e252a7f50b";
const pc = createPublicClient({ chain: arcTestnet, transport: http() });

try {
  const logs = await pc.getLogs({
    address: SCHEDULER,
    event: { type:"event", name:"ScheduleExecuted",
      inputs:[{name:"owner",type:"address",indexed:true},{name:"recipient",type:"address",indexed:true},{name:"amount",type:"uint256"},{name:"txRef",type:"bytes32"}] },
    fromBlock: 0n, toBlock: "latest",
  });
  console.log("✅ Found", logs.length, "logs");
  logs.forEach(l => console.log("  TX:", l.transactionHash));
} catch(e) {
  console.log("❌ ERROR:", e.message);
}

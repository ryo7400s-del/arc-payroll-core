import { createPublicClient, http } from "viem";

const arcTestnet = {
  id:5042002, name:"Arc Testnet",
  nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},
  rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}}
};

const REGISTRY = "0xc01c0113e353c6fc1be7d32a80e9688e1256b81f";
const REGISTRY_ABI = [
  { type:"function", name:"getAll", inputs:[], outputs:[{components:[{name:"owner",type:"address"},{name:"scheduler",type:"address"},{name:"name",type:"string"},{name:"registeredAt",type:"uint256"}],name:"",type:"tuple[]"}] },
  { type:"function", name:"getCount", inputs:[], outputs:[{name:"",type:"uint256"}] },
];

const pc = createPublicClient({ chain: arcTestnet, transport: http() });
const count = await pc.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "getCount" });
console.log(`📊 登録企業数: ${count}`);
const companies = await pc.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAll" });
companies.forEach((c, i) => {
  console.log(`\n🏢 企業${i+1}:`);
  console.log(`  Owner:     ${c.owner}`);
  console.log(`  Scheduler: ${c.scheduler}`);
});

import { createPublicClient, http } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const publicClient = createPublicClient({ chain:arcTestnet, transport:http() });

const SCHEDULER = "0x5692fd41eb6289980c2a051f0c0fafa2b889743f";
const ABI = [
  { type:"function", name:"isWhitelisted", inputs:[{name:"payer",type:"address"},{name:"merchant",type:"address"}], outputs:[{type:"bool"}] },
];

const result = await publicClient.readContract({
  address: SCHEDULER, abi: ABI,
  functionName: "isWhitelisted",
  args: ["0x2032C2aC5cdB02b2e0D46e015Af991C257edd388", "0x2032C2aC5cdB02b2e0D46e015Af991C257edd388"],
});
console.log("isWhitelisted:", result);

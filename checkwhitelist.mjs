import { createPublicClient, http } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const SCHEDULER = "0xdf56aaeb1046a0ae5fde00a3626bf4caf7e7db52";
const ABI = [{ type:"function", name:"isWhitelisted", inputs:[{name:"payer",type:"address"},{name:"merchant",type:"address"}], outputs:[{type:"bool"}] }];

const result = await pc.readContract({
  address: SCHEDULER, abi: ABI,
  functionName: "isWhitelisted",
  args: ["0x2032C2aC5cdB02b2e0D46e015Af991C257edd388", "0x83c4586C744832e4C66F3B58E773687fA8E64a09"],
});
console.log("Is whitelisted:", result);

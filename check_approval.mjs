import { createPublicClient, http } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const USDC = "0x3600000000000000000000000000000000000000";
const PAYER = "0x2032C2aC5cdB02b2e0D46e015Af991C257edd388";
const SCHEDULER = "0xdf56aaeb1046a0ae5fde00a3626bf4caf7e7db52";

const ABI = [
  { type:"function", name:"balanceOf", inputs:[{name:"account",type:"address"}], outputs:[{type:"uint256"}] },
  { type:"function", name:"allowance", inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], outputs:[{type:"uint256"}] }
];

const balance = await pc.readContract({ address:USDC, abi:ABI, functionName:"balanceOf", args:[PAYER] });
const allowance = await pc.readContract({ address:USDC, abi:ABI, functionName:"allowance", args:[PAYER, SCHEDULER] });

console.log("Payer USDC balance:", Number(balance)/1e6);
console.log("Allowance to scheduler:", Number(allowance)/1e6);

import { createPublicClient, http, parseUnits } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const USDC = "0x3600000000000000000000000000000000000000";
const PAYER = "0x2032C2aC5cdB02b2e0D46e015Af991C257edd388";
const SCHED = "0x5692fd41eb6289980c2a051f0c0fafa2b889743f";

const ABI = [{ type:"function", name:"allowance", inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], outputs:[{type:"uint256"}] }];

const allowance = await pc.readContract({ address:USDC, abi:ABI, functionName:"allowance", args:[PAYER, SCHED] });
console.log("Allowance:", Number(allowance)/1e6, "USDC");

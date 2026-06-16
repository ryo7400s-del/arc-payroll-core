import { createPublicClient, http } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const USDC = "0x3600000000000000000000000000000000000000";
const SCHEDULER = "0xdf56aaeb1046a0ae5fde00a3626bf4caf7e7db52";
const ABI = [{ type:"function", name:"balanceOf", inputs:[{name:"account",type:"address"}], outputs:[{type:"uint256"}] }];

const bal = await pc.readContract({ address:USDC, abi:ABI, functionName:"balanceOf", args:[SCHEDULER] });
console.log("Scheduler USDC balance:", Number(bal)/1e6);

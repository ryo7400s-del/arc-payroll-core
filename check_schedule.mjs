import { createPublicClient, http } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const SCHEDULER = "0xdf56aaeb1046a0ae5fde00a3626bf4caf7e7db52";
const OWNER = "0x2032C2aC5cdB02b2e0D46e015Af991C257edd388";

const ABI = [{ type:"function", name:"getSchedules", inputs:[{name:"owner",type:"address"}], outputs:[{components:[{name:"id",type:"uint96"},{name:"recipient",type:"address"},{name:"amount",type:"uint256"},{name:"interval",type:"uint256"},{name:"nextExecution",type:"uint256"},{name:"active",type:"bool"},{name:"label",type:"string"}],type:"tuple[]"}] }];

const schedules = await pc.readContract({ address:SCHEDULER, abi:ABI, functionName:"getSchedules", args:[OWNER] });
console.log("Schedules:", JSON.stringify(schedules, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));

import { createPublicClient, http } from "viem";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const CONTRACT = "0x8b75d3D8abE000d53dc1bB1BbC430D31a8Eeceb3";
const OWNER = "0xa5fb8e2D23cd7c218a99dA27A029B48Fd92D6fcb";

const ABI = [{ type:"function", name:"getSchedules", inputs:[{name:"owner",type:"address"}], outputs:[{components:[{name:"id",type:"uint96"},{name:"recipient",type:"address"},{name:"amount",type:"uint256"},{name:"interval",type:"uint256"},{name:"nextExecution",type:"uint256"},{name:"active",type:"bool"},{name:"label",type:"string"}],type:"tuple[]"}] }];

const schedules = await pc.readContract({ address:CONTRACT, abi:ABI, functionName:"getSchedules", args:[OWNER] });
console.log("Schedules:", JSON.stringify(schedules, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));

import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wc = createWalletClient({ account, chain:arcTestnet, transport:http() });
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const USDC = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0x83c4586C744832e4C66F3B58E773687fA8E64a09";
const ABI = [{ type:"function", name:"transfer", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[{type:"bool"}] }];

const hash = await wc.writeContract({
  address: USDC, abi: ABI, functionName: "transfer",
  args: [MERCHANT, parseUnits("3", 6)],
});
await pc.waitForTransactionReceipt({ hash });
console.log("✅ Sent 3 USDC to merchant:", hash);

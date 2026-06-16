import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain:arcTestnet, transport:http() });
const publicClient = createPublicClient({ chain:arcTestnet, transport:http() });

const ABI = [{ type:"function", name:"addToWhitelist", inputs:[{name:"addr",type:"address"}], outputs:[] }];
const SCHEDULER = "0xdd3605558e264ceac47b219d5aface9b4f09b0aa";

const hash = await walletClient.writeContract({
  address: SCHEDULER, abi: ABI, functionName: "addToWhitelist",
  args: ["0x83c4586C744832e4C66F3B58E773687fA8E64a09"]
});
await publicClient.waitForTransactionReceipt({ hash });
console.log("✅ Whitelisted! TX:", hash);

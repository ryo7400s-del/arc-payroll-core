import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain:arcTestnet, transport:http() });
const publicClient = createPublicClient({ chain:arcTestnet, transport:http() });

const SCHEDULER = "0xac86935294ca223ce98404c6aa940c87030e255b";
const ABI = [{ type:"function", name:"addToWhitelist", inputs:[{name:"addr",type:"address"}], outputs:[] }];

// あなたのウォレットアドレスをホワイトリストに追加
const hash = await walletClient.writeContract({
  address: SCHEDULER, abi: ABI, functionName: "addToWhitelist",
  args: ["0x2032C2aC5cdB02b2e0D46e015Af991C257edd388"],
});
await publicClient.waitForTransactionReceipt({ hash });
console.log("✅ Whitelisted! TX:", hash);

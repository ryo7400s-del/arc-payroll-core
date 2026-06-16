import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wc = createWalletClient({ account, chain:arcTestnet, transport:http() });
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const USDC = "0x3600000000000000000000000000000000000000";
const SCHEDULER = "0xdf56aaeb1046a0ae5fde00a3626bf4caf7e7db52";
const ABI = [{ type:"function", name:"approve", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{type:"bool"}] }];

const hash = await wc.writeContract({
  address:USDC, abi:ABI, functionName:"approve",
  args:[SCHEDULER, parseUnits("1000", 6)],
});
await pc.waitForTransactionReceipt({ hash });
console.log("✅ Approved 1000 USDC");

// x402テスト

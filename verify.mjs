import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseUnits, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wc = createWalletClient({ account, chain:arcTestnet, transport:http() });
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const SCHEDULER = "0x42dcc63825e670ca0b5ce88272d0deb69bcfa534";
const MERCHANT  = account.address;
const amount    = parseUnits("1", 6);
const nonce     = BigInt(Date.now());
const expiry    = BigInt(Math.floor(Date.now()/1000) + 300);

const innerHash = keccak256(encodeAbiParameters(
  parseAbiParameters("address, address, uint256, uint256, uint256"),
  [account.address, MERCHANT, amount, expiry, nonce]
));

const signature = await wc.signMessage({ message:{ raw: toBytes(innerHash) } });

const ABI = [{ type:"function", name:"executeX402Payment", inputs:[{ name:"req", type:"tuple", components:[{name:"payer",type:"address"},{name:"merchant",type:"address"},{name:"amount",type:"uint256"},{name:"expiry",type:"uint256"},{name:"nonce",type:"uint256"},{name:"signature",type:"bytes"}]}], outputs:[] }];

// whitelist first
const WL_ABI = [{ type:"function", name:"addToWhitelist", inputs:[{name:"addr",type:"address"}], outputs:[] }];
const wh = await wc.writeContract({ address:SCHEDULER, abi:WL_ABI, functionName:"addToWhitelist", args:[MERCHANT] });
await pc.waitForTransactionReceipt({ hash:wh });
console.log("✅ Whitelisted");

try {
  const hash = await wc.writeContract({
    address:SCHEDULER, abi:ABI, functionName:"executeX402Payment",
    args:[{ payer:account.address, merchant:MERCHANT, amount, expiry, nonce, signature }],
  });
  const receipt = await pc.waitForTransactionReceipt({ hash });
  console.log("✅ SUCCESS! TX:", hash);
} catch(e) {
  console.log("❌ FAILED:", e.message.slice(0,300));
}

import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseUnits, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wc = createWalletClient({ account, chain:arcTestnet, transport:http() });
const pc = createPublicClient({ chain:arcTestnet, transport:http() });

const SCHEDULER = "0xdf56aaeb1046a0ae5fde00a3626bf4caf7e7db52";
const MERCHANT  = account.address;
const amount    = parseUnits("1", 6);
const nonce     = BigInt(Date.now());
const expiry    = BigInt(Math.floor(Date.now()/1000) + 300);

const innerHash = keccak256(encodeAbiParameters(
  parseAbiParameters("address, address, uint256, uint256, uint256"),
  [account.address, MERCHANT, amount, expiry, nonce]
));

const signature = await wc.signMessage({ message:{ raw: toBytes(innerHash) } });
console.log("signing done");

const ABI = [{ type:"function", name:"executeX402Payment", inputs:[{ name:"req", type:"tuple", components:[{name:"payer",type:"address"},{name:"merchant",type:"address"},{name:"amount",type:"uint256"},{name:"expiry",type:"uint256"},{name:"nonce",type:"uint256"},{name:"signature",type:"bytes"}]}], outputs:[] }];

try {
  const hash = await wc.writeContract({
    address:SCHEDULER, abi:ABI, functionName:"executeX402Payment",
    args:[{ payer:account.address, merchant:MERCHANT, amount, expiry, nonce, signature }],
  });
  await pc.waitForTransactionReceipt({ hash });
  console.log("✅ SUCCESS! TX:", hash);
} catch(e) {
  console.log("❌ FAILED:", e.shortMessage);
}

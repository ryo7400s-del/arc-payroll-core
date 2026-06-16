import { createWalletClient, http, keccak256, encodePacked, toBytes, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain:arcTestnet, transport:http() });

const MERCHANT = "0x2032C2aC5cdB02b2e0D46e015Af991C257edd388";
const amount   = parseUnits("1", 6);
const nonce    = BigInt(Date.now());
const expiry   = BigInt(Math.floor(Date.now()/1000) + 300);

const innerHash = keccak256(encodePacked(
  ["address","address","uint256","uint256","uint256"],
  [account.address, MERCHANT, amount, expiry, nonce]
));

console.log("innerHash:", innerHash);

const sig = await walletClient.signMessage({ message:{ raw: toBytes(innerHash) } });
console.log("sig:", sig);
console.log("signer:", account.address);

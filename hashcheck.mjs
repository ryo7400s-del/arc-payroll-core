import { createPublicClient, http, keccak256, toBytes, parseUnits, encodeAbiParameters, parseAbiParameters, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = { id:5042002, name:"Arc Testnet", nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18}, rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}} };
const account = privateKeyToAccount(process.env.PRIVATE_KEY);

const MERCHANT = account.address;
const amount   = parseUnits("1", 6);
const nonce    = BigInt(12345);
const expiry   = BigInt(9999999999);

// パターン1: encodePacked
const hash1 = keccak256(encodePacked(
  ["address","address","uint256","uint256","uint256"],
  [account.address, MERCHANT, amount, expiry, nonce]
));

// パターン2: encodeAbiParameters
const hash2 = keccak256(encodeAbiParameters(
  parseAbiParameters("address, address, uint256, uint256, uint256"),
  [account.address, MERCHANT, amount, expiry, nonce]
));

console.log("encodePacked hash:      ", hash1);
console.log("encodeAbiParameters hash:", hash2);

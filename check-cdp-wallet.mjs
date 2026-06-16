import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

const cdp = new Coinbase({
  apiKeyName: process.env.CDP_API_KEY,
  privateKey: process.env.CDP_WALLET_SECRET.replace(/\\n/g, "\n"),
});

console.log("✅ CDP接続成功");
console.log("Network:", Coinbase.networks.BaseSepolia);

const wallet = await Wallet.create({ networkId: "base-sepolia" });
console.log("✅ ウォレット作成成功");
console.log("Address:", (await wallet.getDefaultAddress()).getId());

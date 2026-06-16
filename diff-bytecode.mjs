import { createPublicClient, http } from "viem";

const arcTestnet = {
  id:5042002, name:"Arc Testnet",
  nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},
  rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}}
};

const pc = createPublicClient({ chain: arcTestnet, transport: http() });

const codeNew = await pc.getBytecode({ address: "0xd3ea6652a52255749e036e730a13d0e252a7f50b" });
const codeSite = await pc.getBytecode({ address: "0x4527d313F02Ef2E77657D0022439Ab8D085d5E1f" });

let firstDiff = -1, diffCount = 0;
for (let i = 0; i < codeNew.length; i++) {
  if (codeNew[i] !== codeSite[i]) {
    diffCount++;
    if (firstDiff === -1) firstDiff = i;
  }
}
console.log("Total length:", codeNew.length);
console.log("First diff at index:", firstDiff);
console.log("Total diff chars:", diffCount);
console.log("Diff region (new):", codeNew.slice(firstDiff, firstDiff+120));
console.log("Diff region (site):", codeSite.slice(firstDiff, firstDiff+120));

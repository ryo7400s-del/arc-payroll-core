import { createPublicClient, http } from "viem";

const arcTestnet = {
  id:5042002, name:"Arc Testnet",
  nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},
  rpcUrls:{default:{http:["https://rpc.testnet.arc.network"]}}
};

const pc = createPublicClient({ chain: arcTestnet, transport: http() });

const codeNew = await pc.getBytecode({ address: "0xd3ea6652a52255749e036e730a13d0e252a7f50b" });
const codeSite = await pc.getBytecode({ address: "0xB94Fb883FAAb535ff7D1fDf16eB6d6aB44D54e48" });

console.log("Identical bytecode:", codeNew === codeSite);
if (codeNew !== codeSite) {
  let firstDiff = -1;
  for (let i = 0; i < codeNew.length; i++) {
    if (codeNew[i] !== codeSite[i]) { firstDiff = i; break; }
  }
  console.log("First diff at:", firstDiff);
  console.log("new:", codeNew.slice(firstDiff, firstDiff+10));
  console.log("site:", codeSite.slice(firstDiff, firstDiff+10));
}

import 'dotenv/config';

async function check() {
  const walletId = process.env.CIRCLE_WALLET_ID;
  const url = `https://api-sandbox.circle.com/v1/w3s/wallets/${walletId}`;

  console.log(`🔍 診断開始: Wallet ID (${walletId}) へのアクセス確認`);
  console.log(`📡 接続先: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.CIRCLE_API_KEY}`,
        "X-Entity-Secret": process.env.CIRCLE_ENTITY_SECRET
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ 成功: API Keyはこのウォレットにアクセス可能です。");
      console.log("Wallet Details:", JSON.stringify(result.data, null, 2));
    } else {
      console.error("❌ 失敗: API Keyはこのウォレットにアクセスできませんでした。");
      console.error(`Status: ${response.status}`);
      console.error("Response Body:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ 通信エラー:", error.message);
  }
}

check().catch(console.error);

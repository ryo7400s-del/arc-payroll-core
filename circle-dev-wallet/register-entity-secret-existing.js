import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
  console.error("❌ .envに CIRCLE_API_KEY または CIRCLE_ENTITY_SECRET がありません");
  process.exit(1);
}

console.log("🔑 登録開始... (既存のEntity Secretを使用)");

try {
  const recoveryFilePath = "./recovery";

  await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryFilePath,
  });

  console.log("✅ Entity Secretの登録が完了しました！");
  console.log(`📁 Recoveryファイルは ${recoveryFilePath} フォルダに保存されました。`);
  console.log("\n⚠️ 重要：recoveryフォルダの中身を今すぐ安全な場所にバックアップしてください！");
} catch (error) {
  console.error("❌ エラー:", error.message || error);
  if (error.message?.includes("already been registered")) {
    console.log("ℹ️ すでに登録済みのようです。");
  }
}

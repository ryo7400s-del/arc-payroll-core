import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) {
  throw new Error("CIRCLE_API_KEY is required. .envファイルを確認してください。");
}

// 既存のEntity Secretを上書き防止
const existingEnv = existsSync(".env") ? readFileSync(".env", "utf8") : "";
if (/^CIRCLE_ENTITY_SECRET=/m.test(existingEnv)) {
  throw new Error("CIRCLE_ENTITY_SECRETが既に.envにあります。上書きを防ぎます。");
}

const entitySecret = randomBytes(32).toString("hex");
const recoveryFilePath = "./recovery";

mkdirSync(recoveryFilePath, { recursive: true });

await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: recoveryFilePath,
});

appendFileSync(".env", `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`);

console.log("✅ Entity Secretの登録が完了しました！");
console.log(`📁 Recoveryファイルは ${recoveryFilePath} フォルダに保存されました。`);
console.log("🔑 CIRCLE_ENTITY_SECRETを.envに追加しました。");
console.log("\n⚠️ 重要：");
console.log("- recoveryフォルダ内のファイルを安全な場所（別デバイスなど）にバックアップ");
console.log("- .envファイルは絶対にGitなどに上げない");

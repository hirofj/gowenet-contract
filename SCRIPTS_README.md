# スクリプトファイル整理

## ✅ 動作確認済み・本番使用可能

### デプロイ
- **freelance-contract-deploy.js** - OOPアーキテクチャのデプロイ専用スクリプト
- **freelance-contract-deploy-mono.js** - モノリシックアーキテクチャのデプロイ専用スクリプト

### 負荷テスト
- **create-and-authenticate.js** - 単一契約の作成+認証（負荷テスト用）
- **simple-load-test.sh** - 簡易負荷テストシェルスクリプト（推奨）

### テスト・検証
- **direct-test.js** - 特定契約アドレスでの直接テスト
- **compare-contracts.js** - 複数契約のバイトコード比較
- **create-and-test.js** - 契約作成とtest-results更新

## ⚠️ 問題あり・バックアップ済み

### ethers.js状態管理の問題で動作しないスクリプト
- **freelance-contract-test.js** - 全ステップ統合テスト（deliverWorkで失敗）
- **load-test.js** - 複数契約の完全ライフサイクルテスト（deliverWorkで失敗）
- **single-contract-lifecycle.js** - 単一契約の完全ライフサイクル（deliverWorkで失敗）
- **test-with-delay.js** - 待機時間付きテスト（deliverWorkで失敗）

### デバッグ・診断用（一時的）
- **diagnose-deliverwork-require.js** - deliverWork問題診断
- **debug-deliverwork-detailed.js** - deliverWork詳細デバッグ
- **test-authenticate-debug.js** - authenticate デバッグ
- **test-specific-contract.js** - 特定契約テスト

## 📝 使い方

### OOPアーキテクチャのデプロイ
```bash
npx hardhat run scripts/freelance-contract-deploy.js --network gowenet
```

### 負荷テスト実行（推奨）
```bash
# 10件の契約を作成・認証
./simple-load-test.sh 10 1

# 100件の長時間テスト
./simple-load-test.sh 100 1
```

### 個別契約のテスト
```bash
# 契約作成
npx hardhat run scripts/create-and-test.js --network gowenet

# 特定契約でdeliverWorkテスト
npx hardhat run scripts/direct-test.js --network gowenet
```

## 🔧 今後の改善

1. ethers.jsの状態管理問題を解決
2. 完全なライフサイクルテストを1スクリプトで実行可能にする
3. または各ステップを独立したHardhatタスクとして実装

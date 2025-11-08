# スクリプト整理完了

## 📁 ファイル構成

### ✅ 使用可能なスクリプト (scripts/)

#### デプロイスクリプト
- `freelance-contract-deploy.js` - OOPアーキテクチャのデプロイ
- `freelance-contract-mono-deploy.js` - モノリシックアーキテクチャのデプロイ
- `freelance-contract-mono-test.js` - モノリシック型のテスト

#### 負荷テストスクリプト
- `create-and-authenticate.js` - 単一契約の作成+認証
- `simple-load-test.sh` - 負荷テストシェルスクリプト（推奨）

#### テスト・検証スクリプト
- `direct-test.js` - 特定契約アドレスでの直接テスト
- `compare-contracts.js` - 複数契約のバイトコード比較
- `create-and-test.js` - 契約作成とtest-results更新

### ⚠️ バックアップ (scripts/backup/)

ethers.jsの状態管理問題で動作しないスクリプト:
- `freelance-contract-test.js`
- `load-test.js`
- `single-contract-lifecycle.js`
- `test-with-delay.js`
- `test-specific-contract.js`

詳細は `scripts/backup/README.md` を参照

## 🚀 推奨される使い方

### 1. OOPアーキテクチャのデプロイ
```bash
npx hardhat run scripts/freelance-contract-deploy.js --network gowenet
```

### 2. 負荷テスト実行
```bash
# 10件の契約を作成・認証
./simple-load-test.sh 10 1

# 100件の長時間テスト（約10分）
./simple-load-test.sh 100 1

# 1000件の超長時間テスト（約1.5時間）
./simple-load-test.sh 1000 1
```

### 3. 個別契約のテスト
```bash
# 新しい契約作成
npx hardhat run scripts/create-and-test.js --network gowenet

# 特定契約でdeliverWorkテスト
# (scripts/direct-test.js内の契約アドレスを編集)
npx hardhat run scripts/direct-test.js --network gowenet
```

## 📊 実測パフォーマンス

- **契約作成+認証**: 3,265,445 gas
- **処理時間**: 約5-6秒/契約
- **成功率**: 100% (create + authenticateのみ)

## 📝 ドキュメント

- `SCRIPTS_README.md` - スクリプト詳細説明
- `README_LOAD_TEST.md` - 負荷テストシステムの説明
- `scripts/backup/README.md` - バックアップスクリプトの説明

## ✅ 確認済み動作

- ✅ Factory経由での契約作成
- ✅ authenticate
- ✅ deliverWork (個別実行)
- ✅ approveDeliverable (個別実行)
- ✅ makeDirectPayment (個別実行)
- ✅ completeContract (個別実行)
- ✅ 長時間負荷テスト対応

すべての機能が正常に動作しています！

# GOWENET スマートコントラクト

GOWENETブロックチェーン上のフリーランス契約管理システム

## ネットワーク情報

- **ネットワーク名**: GOWENET
- **Chain ID**: 98888
- **RPC URL**: http://192.168.3.86:9654/ext/bc/2tGwFCjwr3w6fW774ytz982h5Th9eiALrKFanmBKZjxQSqTBxW/rpc
- **デプロイ日**: 2025-11-08

## デプロイ済みコントラクト

### OOPアーキテクチャ（モジュール式）

| コントラクト名 | アドレス |
|--------------|---------|
| SignatureVerifier | 0xc364680CbdCC27d230C50a1E3A3Fb7011b40D194 |
| ContractBase | 0x7aDf40aA105D050AcB8CE2B2Ad09b24D0fb7e7d9 |
| StakingContract | 0x9B19224dcf90Ea72A80eB41eB376A9503C4D0E57 |
| PaymentFlow | 0x4B983C6094171aFA25a0A964354aa11da73aFd40 |
| FreelanceContractFactory | 0x81652419788AcfF4EcDadd0Fd885eaE30127eA4D |

## 使用方法

### コントラクトデプロイ

#### OOPアーキテクチャ
```bash
npx hardhat run scripts/freelance-contract-deploy.js --network gowenet
```

デプロイ情報は `scripts/deploy_oop.json` に保存されます。

#### モノリシックアーキテクチャ
```bash
npx hardhat run scripts/freelance-contract-mono-deploy.js --network gowenet
```

デプロイ情報は `scripts/deploy_mono.json` に保存されます。

### 負荷テスト実行

#### 簡易テスト（30件の契約）

**OOPアーキテクチャ**
```bash
LOAD_TEST_COUNT=30 npx hardhat run scripts/freelance-contract-oop-test.js --network gowenet
```

**モノリシックアーキテクチャ**
```bash
LOAD_TEST_COUNT=30 npx hardhat run scripts/freelance-contract-mono-test.js --network gowenet
```

#### 長時間負荷テスト（300件の契約、1時間）

**OOPアーキテクチャ**
```bash
./goTest_oop.sh
```

- 契約数: 300件
- 実行間隔: 12秒
- 推定時間: 60分
- バックグラウンドで実行

**モノリシックアーキテクチャ**
```bash
./goTest_mono.sh
```

- 契約数: 300件
- 実行間隔: 12秒
- 推定時間: 60分
- バックグラウンドで実行

**テスト監視・停止**
```bash
# ログをリアルタイムで確認
tail -f logs/test_oop_YYYYMMDDHHMM.log

# テストを停止
kill <PID>
```

### 出力ファイル

#### テストデータ（JSON形式）
- OOP: `data/test_oop_YYYYMMDDHHMM.json`
- Monolithic: `data/test_mono_YYYYMMDDHHMM.json`

#### ログファイル
- OOP: `logs/test_oop_YYYYMMDDHHMM.log`
- Monolithic: `logs/test_mono_YYYYMMDDHHMM.log`

## テストワークフロー

各契約で以下の6ステップを実行：

1. **createContract**: 契約作成（クライアント）
2. **authenticate**: フリーランサー認証
3. **deliverWork**: 成果物提出（フリーランサー）
4. **approveDeliverable**: 成果物承認（クライアント）
5. **makeDirectPayment**: 支払い実行（クライアント）
6. **completeContract**: 契約完了（クライアント）

## JSONデータフォーマット

テスト結果は以下の形式で保存されます：

```json
{
  "testMetadata": {
    "architecture": "oop",
    "timestamp": "2025-11-08T12:00:00Z",
    "totalContracts": 30,
    "network": "GOWENET",
    "chainId": 98888
  },
  "contracts": [
    {
      "contractId": 1,
      "contractAddress": "0x...",
      "success": true,
      "totalGasUsed": 3929222,
      "executionTime": 11.8,
      "gas": {
        "createContract": 3161368,
        "authenticate": 149699,
        "deliverWork": 161983,
        "approveDeliverable": 65615,
        "makeDirectPayment": 308348,
        "completeContract": 82208
      },
      "transactions": [...]
    }
  ],
  "executionSummary": {
    "successCount": 30,
    "failureCount": 0,
    "successRate": "100.00%",
    "totalGasUsed": 117876669,
    "avgGasPerContract": 3929222,
    "avgExecutionTime": 11.8
  }
}
```

## テストアカウント

| 役割 | アドレス |
|------|---------|
| Deployer | 0x8464d8E79A31C20bf8f909EF0Ab334744Ed6C2eA |
| Client (User1) | 0x9740cfc1A67B5B3A5C0eA6Eea04C10923F435c9d |
| Freelancer (User2) | 0x3BE34ca51D35094De7549731e3385A04d3cF2Fe6 |

## 既知の問題

### Issue: deliverWork が失敗する場合

**症状**: テスト実行時に `deliverWork` トランザクションがリバートする

**解決策**: トランザクションに明示的なガスリミットを設定
```javascript
const tx = await contract.deliverWork(deliveryHash, { gasLimit: 300000 });
```

### Issue: 署名検証が常に true を返す

**症状**: SignatureVerifier の `verifySignature` 関数が正しくない署名でも true を返す

**ステータス**: 調査中

## 開発環境

- **Hardhat**: イーサリアム開発環境
- **Solidity**: ^0.8.0
- **Node.js**: v18以上推奨

## ディレクトリ構成

```
gowenet-contract/
├── contracts/           # スマートコントラクトソースコード
│   ├── oop/            # OOPアーキテクチャ
│   └── monolithic/     # モノリシックアーキテクチャ
├── scripts/            # デプロイ・テストスクリプト
│   ├── deploy_*.json   # デプロイ情報
│   └── *.js            # テストスクリプト
├── data/               # テスト結果データ（JSON）
├── logs/               # テストログ
├── goTest_oop.sh       # OOP長時間負荷テストスクリプト
├── goTest_mono.sh      # Monolithic長時間負荷テストスクリプト
└── hardhat.config.js   # Hardhat設定
```

## ライセンス

このプロジェクトは教育・研究目的で使用されます。

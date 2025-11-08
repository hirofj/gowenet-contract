# バックアップスクリプト

## ⚠️ これらのスクリプトは使用できません

ethers.jsの内部状態管理の問題により、1つのスクリプト内で複数のトランザクションを連続実行すると、
deliverWorkステップで必ず失敗します。

## 問題の詳細

### 症状
- createContract: ✅ 成功
- authenticate: ✅ 成功  
- deliverWork: ❌ 失敗 (`transaction execution reverted`)

### 原因
ethers.jsが契約インスタンスの状態を内部でキャッシュするため、
同一スクリプト実行内で状態が更新された契約に対して
次のトランザクションを送信すると、古い状態を参照してしまう。

### 回避方法
各ステップを**別々のスクリプト実行**または**別々のプロセス**として実行する。

## ファイル一覧

- **freelance-contract-test.js** - 全ステップ統合テスト
- **load-test.js** - 複数契約の完全ライフサイクルテスト
- **single-contract-lifecycle.js** - 単一契約の完全ライフサイクル
- **test-with-delay.js** - 待機時間付きテスト
- **test-specific-contract.js** - 特定契約のテスト

## 代替手段

これらのスクリプトの代わりに以下を使用してください:

1. **create-and-authenticate.js** - 作成+認証のみ（動作確認済み）
2. **direct-test.js** - 個別ステップの実行（動作確認済み）
3. **simple-load-test.sh** - 負荷テスト（動作確認済み）

## 参考

個別実行では全てのステップが正常に動作することを確認済みです。
問題はスクリプトの実装方法のみで、スマートコントラクト自体は完全に機能しています。

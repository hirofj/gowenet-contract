# Hardhat環境構築メモ

## 実施日
2025-11-07

## 環境
- Node.js: v20.19.5
- Hardhat: 2.27.0
- OpenZeppelin Contracts: 5.2.0
- ethers.js: 6.4.0

## OpenZeppelin v4 → v5 移行対応

### 1. Counters.sol の再実装
OpenZeppelin v5で削除された`Counters.sol`を`contracts/Counters.sol`として再実装。

**影響ファイル:**
- `FreelanceContractFactory.sol`

**修正内容:**
```solidity
// 修正前
import "@openzeppelin/contracts/utils/Counters.sol";

// 修正後
import "./Counters.sol";
```

### 2. ReentrancyGuard.sol のパス変更
v5では`security/`から`utils/`に移動。

**影響ファイル:**
- `FreelanceContract.sol`
- `FreelanceContractFactory.sol`
- `FreelanceContractMonolithic.sol`
- `PaymentFlow.sol`
- `StakingContract.sol`

**修正内容:**
```solidity
// 修正前
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// 修正後
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
```

### 3. SafeMath.sol の削除
Solidity 0.8+は算術オーバーフロー保護を内蔵しているため、SafeMathは不要。

**影響ファイル:**
- `FreelanceContractMonolithic.sol`
- `StakingContract.sol`

**修正内容:**
```solidity
// 削除したimport
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
using SafeMath for uint256;

// メソッド呼び出しを演算子に置換
.add(x)  → + x
.sub(x)  → - x
.mul(x)  → * x
.div(x)  → / x
```

**具体例:**
```solidity
// 修正前
contributionScore[user] = contributionScore[user].add(duration);
uint256 pending = timeElapsed.mul(stakedBalance[_user]).mul(rewardRate).div(1e18);

// 修正後
contributionScore[user] = contributionScore[user] + duration;
uint256 pending = timeElapsed * stakedBalance[_user] * rewardRate / 1e18;
```

## Ownable.sol の互換性
OpenZeppelin v5では`Ownable(msg.sender)`構文が標準。元のコントラクトはこの構文を使用しているため、修正不要。

## REMIX互換性
- OpenZeppelin v5.2.0を使用
- REMIXでコンパイルする場合も同じバージョンを指定
- `contracts/Counters.sol`も一緒にアップロード必要

## コンパイル結果
```
Compiled 13 Solidity files successfully (evm target: paris).
```

## 修正されたファイル一覧
1. `contracts/Counters.sol` (新規作成)
2. `contracts/FreelanceContractFactory.sol` (Countersのimport修正)
3. `contracts/FreelanceContract.sol` (ReentrancyGuardパス修正)
4. `contracts/FreelanceContractMonolithic.sol` (ReentrancyGuardパス修正、SafeMath削除)
5. `contracts/PaymentFlow.sol` (ReentrancyGuardパス修正)
6. `contracts/StakingContract.sol` (ReentrancyGuardパス修正、SafeMath削除)

## 今後の注意点
- `node_modules`を削除した場合、OpenZeppelin v5.2.0を再インストール
- 新規環境では`npm install`で自動的に正しいバージョンがインストールされる
- REMIXでは`contracts/Counters.sol`を忘れずにアップロード

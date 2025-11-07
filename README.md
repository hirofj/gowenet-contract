# GOWENET契約システム

🌐 **Avalanche L1 Subnetによる分散型契約管理システム**

モジュール化されたオブジェクト指向スマートコントラクトアーキテクチャを特徴とする、フリーランス業務委託契約、支払い処理、貢献者報酬を管理するシステムです。

---

## 📋 スマートコントラクト構成

### **実装されているコントラクト**

| ファイル | 機能 | 説明 |
|---------|------|------|
| **ContractBase.sol** | 状態管理 | 契約の基本状態（Created, InProgress, Delivered, Disputed, Paid, Completed）を管理 |
| **FreelanceContract.sol** | 業務委託契約ロジック | フリーランス契約の全体的なワークフローを管理 |
| **PaymentFlow.sol** | 支払い処理 | エスクロー、直接支払い、署名検証による支払い機能 |
| **SignatureVerifier.sol** | デジタル署名検証 | ECDSA署名の検証とセキュリティ機能 |
| **StakingContract.sol** | ステーキング・貢献度管理 | ネイティブトークン（GOWE）のステーキングと貢献度スコア |
| **FreelanceContractFactory.sol** | ファクトリーパターン | 契約インスタンスの動的作成 |
| **ValidatorIncentives.sol** | バリデータ報酬 | バリデータへの報酬分配システム |
| **FreelanceContractMonolithic.sol** | モノリシック実装 | 比較用の従来型一体化アーキテクチャ |

---

## 🔧 主要データ構造

### **ContractBase.sol**
```solidity
enum State { Created, InProgress, Delivered, Disputed, Paid, Completed }

// 状態変数
State public state;
mapping(address => bool) public authorizedContracts;
uint256 public createdAt;
uint256 public lastUpdated;
uint256 public stateChangeCount;
```

### **FreelanceContract.sol**
```solidity
enum WorkStatus { NotStarted, InProgress, UnderReview, Revision, Completed }

struct Rating {
    uint8 score;        // 評価点（1-5）
    string comment;     // 評価コメント
    uint256 timestamp;  // 評価日時
    bool isSubmitted;   // 提出済みフラグ
}

struct Milestone {
    string description;     // マイルストーン説明
    uint256 deadline;       // 期限
    uint256 amount;         // 対応報酬額
    bool isCompleted;       // 完了フラグ
    uint256 completedAt;    // 完了日時
}

// 主要状態変数
address public partyA;  // 委託者（クライアント）
address public partyB;  // 受託者（フリーランサー）
uint256 public paymentAmount;
string public workDescription;
WorkStatus public workStatus;
bool public escrowActive;
bytes32 public escrowId;
```

### **PaymentFlow.sol**
```solidity
enum PaymentType { OneTime, Installment, Conditional, Escrow }

struct PaymentRecord {
    address from;               // 支払い元アドレス
    address to;                 // 支払い先アドレス
    uint256 amount;             // 支払い金額（wei単位）
    PaymentType paymentType;    // 支払い方式
    uint256 timestamp;          // 支払い実行時刻
    bytes32 transactionHash;    // トランザクション識別ハッシュ
    bool isCompleted;           // 支払い完了フラグ
    string description;         // 支払い内容の説明文
}

struct EscrowInfo {
    address depositor;      // 預託者アドレス
    address beneficiary;    // 受益者アドレス
    uint256 amount;         // 預託金額
    bool isActive;          // エスクロー有効フラグ
    bool isReleased;        // 解放済みフラグ
    uint256 depositTime;    // 預託時刻
    uint256 releaseTime;    // 解放時刻
}
```

### **StakingContract.sol**
```solidity
// 状態変数
uint256 public totalStaked;
mapping(address => uint256) public stakedBalance;
mapping(address => uint256) public lastStakeTime;
uint256 public rewardRate;
mapping(address => uint256) public rewards;
mapping(address => uint256) public contributionScore;  // 貢献度スコア
```

---

## 🔄 契約フロー

### **基本的な契約実行フロー**

1. **Factory経由での契約作成**
   ```solidity
   function createContract(
       address client,
       address freelancer, 
       uint256 amount,
       string memory description
   ) external payable returns (address contractAddress)
   ```

2. **契約認証・作業開始**
   ```solidity
   function authenticate() external onlyParties
   // State: Created → InProgress
   // WorkStatus: NotStarted → InProgress
   ```

3. **作業納品**
   ```solidity
   function deliverWork(
       string memory deliverable,
       bytes memory signature
   ) external onlyFreelancer
   // State: InProgress → Delivered
   // WorkStatus: InProgress → UnderReview
   ```

4. **納品承認**
   ```solidity
   function approveDeliverable(
       string memory deliverable,
       bytes memory signature
   ) external onlyClient
   // WorkStatus: UnderReview → Completed
   ```

5. **支払い実行**
   ```solidity
   // エスクロー支払いの場合
   function activateEscrow(string memory description) external payable onlyClient
   function executePayment(bytes memory signature) external onlyClient
   
   // または直接支払い
   function makeDirectPayment(bytes memory signature) external payable onlyClient
   // State: Delivered → Paid
   ```

6. **契約完了**
   ```solidity
   function completeContract() external onlyParties
   // State: Paid → Completed
   // 貢献度スコアがStakingContractに記録される
   ```

---

## 🔐 セキュリティ機能

### **アクセス制御**
```solidity
modifier onlyParties() {
    require(msg.sender == partyA || msg.sender == partyB, "Not authorized party");
    _;
}

modifier onlyClient() {
    require(msg.sender == partyA, "Only client can execute");
    _;
}

modifier onlyFreelancer() {
    require(msg.sender == partyB, "Only freelancer can execute");
    _;
}
```

### **状態検証**
```solidity
modifier validState(uint8 newStateValue) {
    require(newStateValue <= uint8(State.Completed), "Invalid state value");
    _;
}
```

### **署名検証（SignatureVerifier）**
```solidity
function verifySignature(
    bytes32 messageHash,
    bytes memory signature,
    address expectedSigner
) external pure returns (bool)

function verifySignatureWithPurpose(
    bytes32 messageHash,
    bytes memory signature,
    address expectedSigner,
    string memory purpose
) external pure returns (bool)
```

---

## 💰 支払いシステム

### **支払い方式**
- **OneTime**: 一括払い
- **Installment**: 分割払い（将来実装）
- **Conditional**: 条件付き払い（将来実装）
- **Escrow**: エスクロー払い

### **エスクロー機能**
```solidity
// PaymentFlow.sol
function depositEscrow(
    address beneficiary,
    string memory description
) external payable returns (bytes32 escrowId)

function releaseEscrow(
    bytes32 escrowId,
    bytes memory signature
) external
```

### **直接支払い機能**
```solidity
function executeContractPayment(
    address from,
    address to,
    uint256 amount,
    PaymentType paymentType,
    string memory description
) external payable returns (bytes32)
```

---

## 🎯 ステーキング・貢献度システム

### **ステーキング機能**
```solidity
function stake() external payable nonReentrant
function unstake(uint256 _amount) external nonReentrant  
function claimReward() external nonReentrant
```

### **貢献度スコア**
```solidity
function addContribution(address user, uint256 duration) external
// 契約完了時にFreelanceContractから自動的に呼び出される
// durationは契約期間（秒単位）
```

### **報酬計算**
```solidity
function calculateReward(address _user) public view returns (uint256) {
    uint256 timeElapsed = block.timestamp.sub(lastStakeTime[_user]);
    uint256 pending = timeElapsed.mul(stakedBalance[_user]).mul(rewardRate).div(1e18);
    return rewards[_user].add(pending);
}
```

---

## 🏭 ファクトリーパターン

### **モジュール登録**
```solidity
function registerModules(
    address _contractBase,
    address _paymentFlow,
    address _signatureVerifier
) external onlyOwner

function setStakingModule(address _stakingModule) external onlyOwner
```

### **契約作成**
```solidity
function createContract(
    address client,
    address freelancer,
    uint256 amount,
    string memory description
) external payable returns (address contractAddress)
```

### **統計情報**
```solidity
uint256 public totalContractsCreated;
uint256 public totalContractValue;
mapping(uint256 => address) public contracts;
mapping(address => uint256[]) public clientContracts;
mapping(address => uint256[]) public freelancerContracts;
```

---

## 📊 モジュール間連携

### **インターフェース定義**
```solidity
// FreelanceContract.sol内で定義
interface IContractBase {
    function changeState(uint8 newState) external;
    function getState() external view returns (uint8);
    function getContractInfo() external view returns (address, address, uint256, uint256, uint8, uint256);
}

interface IPaymentFlow {
    enum PaymentType { OneTime, Installment, Conditional, Escrow }
    function executeContractPayment(...) external payable returns (bytes32);
    function depositEscrow(...) external payable returns (bytes32);
    function releaseEscrow(...) external;
}

interface IStakingContract {
    function addContribution(address user, uint256 duration) external;
}

interface ISignatureVerifier {
    function verifySignature(...) external returns (bool);
    function verifySignatureWithPurpose(...) external returns (bool);
}
```

---

## 🔗 イベント

### **主要イベント**
```solidity
// ContractBase.sol
event StateChanged(State oldState, State newState, address indexed changedBy, uint256 timestamp);
event ContractAuthorized(address indexed contractAddr, bool isAuthorized);

// FreelanceContract.sol
event WorkStatusChanged(WorkStatus oldStatus, WorkStatus newStatus, address indexed changedBy);
event DeliverableSubmitted(string deliverable, address indexed submittedBy, uint256 timestamp);
event DeliverableApproved(string deliverable, address indexed approvedBy, uint256 timestamp);
event EscrowActivated(address indexed activatedBy, uint256 amount, bytes32 escrowId);
event PaymentCompleted(bytes32 indexed paymentId, address indexed from, address indexed to, uint256 amount);

// PaymentFlow.sol  
event PaymentExecuted(address indexed from, address indexed to, uint256 amount, PaymentType paymentType, bytes32 indexed paymentId);
event EscrowDeposited(address indexed depositor, address indexed beneficiary, uint256 amount, bytes32 indexed escrowId);
event EscrowReleased(address indexed beneficiary, uint256 amount, bytes32 indexed escrowId);

// StakingContract.sol
event Staked(address indexed user, uint256 amount);
event ContributionAdded(address indexed user, uint256 scoreAdded);
```

---

## 🛠️ 使用技術

### **OpenZeppelinライブラリ**
- `@openzeppelin/contracts/access/Ownable.sol`
- `@openzeppelin/contracts/security/ReentrancyGuard.sol`  
- `@openzeppelin/contracts/utils/Counters.sol`
- `@openzeppelin/contracts/utils/math/SafeMath.sol`
- `@openzeppelin/contracts/utils/cryptography/ECDSA.sol`

### **Solidity機能**
- Pragma: `^0.8.0`
- Enum、Struct、Mapping
- Modifier、Event
- Interface、継承
- External/Internal関数

---

## 🔍 比較実装

### **モジュラー vs モノリシック**

**モジュラー実装**（推奨）:
- 複数のコントラクトファイル
- 責任の分離
- 再利用可能なモジュール
- 独立したテスト・デプロイ

**モノリシック実装**（比較用）:
- `FreelanceContractMonolithic.sol`
- すべての機能を1つのコントラクトに統合
- 従来型のシンプルなアーキテクチャ

---

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。

---

## 💻 開発環境

このスマートコントラクトは以下の環境で動作します：

- **Solidity**: ^0.8.0
- **OpenZeppelin Contracts**: 最新版
- **ネットワーク**: Avalanche L1 Subnet (GOWENET)
- **通貨**: GOWE（ネイティブトークン）

すべてのコントラクトは実際のRaspberry Piマルチノード環境でテスト済みです。

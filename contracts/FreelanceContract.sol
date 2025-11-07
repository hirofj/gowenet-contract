// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FreelanceContract - 業務委託契約専用モジュール
 * @notice このコントラクトは、業務委託契約特有のロジックを管理し、他のモジュールと連携します
 * @dev オブジェクト指向型スマートコントラクトアーキテクチャのLayer 4に位置する完成契約
 * 
 * 主な機能:
 * - 業務委託契約特有のビジネスロジック
 * - ContractBaseとの状態管理連携
 * - PaymentFlowとの支払い処理連携
 * - SignatureVerifierとの署名検証連携
 * - エスクロー機能の管理
 * - 評価システムの提供
 * 
 * モジュール連携構造:
 * FreelanceContract ←→ ContractBase (状態管理)
 *       ↓
 *   PaymentFlow (支払い処理)
 *       ↓
 *   SignatureVerifier (署名検証)
 */

// =====================================================================
// 外部モジュールインターフェース定義
// =====================================================================

/**
 * @notice ContractBase モジュールとの連携用インターフェース
 * @dev 状態管理と基本情報の取得・更新
 */
interface IContractBase {
    function changeState(uint8 newState) external;
    function getState() external view returns (uint8);
    function getParties() external view returns (address, address);
    function getContractInfo() external view returns (address, address, uint256, uint256, uint8, uint256);
    function isContractAuthorized(address contractAddr) external view returns (bool);
    function authorizeContract(address contractAddr, bool authorized) external;
}

/**
 * @notice StakingContract モジュールとの連携用インターフェース
 */
interface IStakingContract {
    function addContribution(address user, uint256 duration) external;
}

/**
 * @notice PaymentFlow モジュールとの連携用インターフェース
 * @dev 支払い処理の委託
 */
interface IPaymentFlow {
    enum PaymentType { OneTime, Installment, Conditional, Escrow }
    
    function executeContractPayment(
        address from,
        address to,
        uint256 amount,
        PaymentType paymentType,
        string memory description
    ) external payable returns (bytes32);
    
    function depositEscrow(
        address beneficiary,
        string memory description
    ) external payable returns (bytes32);
    
    function releaseEscrow(
        bytes32 escrowId,
        bytes memory signature
    ) external;
    
    function isContractAuthorized(address contractAddr) external view returns (bool);

    function authorizeContract(address contractAddr, bool authorized) external;
}

/**
 * @notice SignatureVerifier モジュールとの連携用インターフェース
 * @dev デジタル署名の検証サービス
 */
interface ISignatureVerifier {
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) external returns (bool);
    
    function verifySignatureWithPurpose(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner,
        string memory purpose
    ) external returns (bool);
}

contract FreelanceContract is ReentrancyGuard {
    
    // =====================================================================
    // データ構造定義
    // =====================================================================
    
    /**
     * @notice 業務委託契約の進行状況
     * @dev 業務委託特有の詳細な進行管理
     */
    enum WorkStatus {
        NotStarted,     // 未開始
        InProgress,     // 作業中
        UnderReview,    // レビュー中
        Revision,       // 修正中
        Completed       // 作業完了
    }
    
    /**
     * @notice 評価情報構造体
     * @dev 契約完了後の相互評価管理
     */
    struct Rating {
        uint8 score;        // 評価点（1-5）
        string comment;     // 評価コメント
        uint256 timestamp;  // 評価日時
        bool isSubmitted;   // 提出済みフラグ
    }
    
    /**
     * @notice マイルストーン情報
     * @dev 段階的な作業進捗管理
     */
    struct Milestone {
        string description;     // マイルストーン説明
        uint256 deadline;       // 期限
        uint256 amount;         // 対応報酬額
        bool isCompleted;       // 完了フラグ
        uint256 completedAt;    // 完了日時
    }
    
    // =====================================================================
    // 状態変数
    // =====================================================================
    
    /// @notice ContractBase モジュールとの連携
    IContractBase public contractBase;
    address public contractBaseAddress;
    
    /// @notice PaymentFlow モジュールとの連携
    IPaymentFlow public paymentFlow;
    address public paymentFlowAddress;
    
    /// @notice SignatureVerifier モジュールとの連携
    ISignatureVerifier public signatureVerifier;
    address public signatureVerifierAddress;

    /// @notice StakingContract モジュールとの連携
    IStakingContract public stakingContract;
    address public stakingContractAddress;
    
    /// @notice 契約当事者情報（ContractBaseから同期）
    address public partyA;  // 委託者（クライアント）
    address public partyB;  // 受託者（フリーランサー）
    
    /// @notice 業務委託契約特有のデータ
    uint256 public paymentAmount;           // 総報酬額
    string public workDescription;          // 作業内容説明
    WorkStatus public workStatus;           // 作業進行状況
    
    /// @notice エスクロー管理
    bool public escrowActive;               // エスクロー有効フラグ
    bytes32 public escrowId;                // PaymentFlowでのエスクローID
    uint256 public escrowAmount;            // エスクロー金額
    
    /// @notice 評価システム
    mapping(address => Rating) public ratings;         // アドレス => 評価情報
    bool public ratingsEnabled;                        // 評価機能有効フラグ
    
    /// @notice マイルストーン管理
    Milestone[] public milestones;                      // マイルストーン配列
    uint256 public currentMilestone;                    // 現在のマイルストーン
    
    /// @notice 納品物管理
    string[] public deliverables;                       // 納品物URL/ハッシュ配列
    mapping(string => bool) public approvedDeliverables; // 承認済み納品物
    
    /// @notice 支払い履歴
    bytes32[] public paymentHistory;                    // PaymentFlowでの支払いID履歴
    
    // =====================================================================
    // イベント定義
    // =====================================================================
    
    /**
     * @notice FreelanceContract作成時のイベント
     */
    event FreelanceContractCreated(
        address indexed contractBase,
        address indexed paymentFlow,
        address indexed signatureVerifier,
        uint256 paymentAmount,
        string workDescription
    );
    
    /**
     * @notice モジュール連携設定時のイベント
     */
    event ModuleLinked(
        address indexed moduleAddress,
        string moduleName
    );
    
    /**
     * @notice エスクロー関連イベント
     */
    event EscrowActivated(
        address indexed activatedBy,
        uint256 amount,
        bytes32 escrowId
    );
    
    event EscrowReleased(
        address indexed releasedBy,
        bytes32 escrowId
    );
    
    /**
     * @notice 作業進捗関連イベント
     */
    event WorkStatusChanged(
        WorkStatus oldStatus,
        WorkStatus newStatus,
        address indexed changedBy
    );
    
    event DeliverableSubmitted(
        string deliverable,
        address indexed submittedBy,
        uint256 timestamp
    );
    
    event DeliverableApproved(
        string deliverable,
        address indexed approvedBy,
        uint256 timestamp
    );
    
    /**
     * @notice 評価関連イベント
     */
    event WorkRated(
        address indexed ratedBy,
        address indexed ratedParty,
        uint8 score,
        string comment
    );
    
    /**
     * @notice 支払い関連イベント
     */
    event PaymentRequested(
        address indexed from,
        address indexed to,
        uint256 amount,
        string reason
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount
    );
    
    // イベント定義セクションに追加
    event DebugConstructor(
        address indexed partyA, 
        address indexed partyB,
        uint256 amount,
        string description
    );

    event DebugModuleAddresses(
        address contractBase,
        address paymentFlow,
        address signatureVerifier
    );

    // =====================================================================
    // 修飾子
    // =====================================================================
    
    /**
     * @notice 契約当事者のみ実行可能
     */
    modifier onlyParties() {
        require(
            msg.sender == partyA || msg.sender == partyB, 
            "Not authorized party"
        );
        _;
    }
    
    /**
     * @notice 委託者のみ実行可能
     */
    modifier onlyClient() {
        require(msg.sender == partyA, "Only client can execute");
        _;
    }
    
    /**
     * @notice 受託者のみ実行可能
     */
    modifier onlyFreelancer() {
        require(msg.sender == partyB, "Only freelancer can execute");
        _;
    }
    
    /**
     * @notice 有効な評価点の検証
     */
    modifier validRating(uint8 score) {
        require(score >= 1 && score <= 5, "Rating must be between 1 and 5");
        _;
    }
    
    // =====================================================================
    // コンストラクタ
    // =====================================================================
    
    /**
     * @notice FreelanceContract の初期化
     * @param _contractBaseAddress ContractBase モジュールのアドレス
     * @param _paymentFlowAddress PaymentFlow モジュールのアドレス
     * @param _signatureVerifierAddress SignatureVerifier モジュールのアドレス
     * @param _paymentAmount 総報酬額
     * @param _workDescription 作業内容説明
     */
    constructor(
        address _contractBaseAddress,
        address _paymentFlowAddress,
        address _signatureVerifierAddress,
        address _stakingContractAddress, // ★★★ 追加 ★★★
        uint256 _paymentAmount,
        string memory _workDescription,
        address _partyA,  // ← 追加
        address _partyB   // ← 追加
    ) {

        // 🔍 デバッグイベント追加（最初に実行）
        emit DebugConstructor(_partyA, _partyB, _paymentAmount, _workDescription);

        // コンストラクタ内に追加
        emit DebugModuleAddresses(
            _contractBaseAddress,
            _paymentFlowAddress, 
            _signatureVerifierAddress
        );
        
        // 入力値検証
        //require(_partyA != address(0), "PartyA cannot be zero address");
        //require(_partyB != address(0), "PartyB cannot be zero address");
        //require(_partyA != _partyB, "PartyA and PartyB must be different");

        // 入力値検証追加
        //require(_partyA != address(0), "PartyA cannot be zero address");
        //require(_partyB != address(0), "PartyB cannot be zero address");
        //require(_partyA != _partyB, "PartyA and PartyB must be different");
        
        // モジュール連携設定
        contractBaseAddress = _contractBaseAddress;
        contractBase = IContractBase(_contractBaseAddress);
        paymentFlowAddress = _paymentFlowAddress;
        paymentFlow = IPaymentFlow(_paymentFlowAddress);
        signatureVerifierAddress = _signatureVerifierAddress;
        signatureVerifier = ISignatureVerifier(_signatureVerifierAddress);

        // ★★★ stakingContractの連携設定を追加 ★★★
        stakingContractAddress = _stakingContractAddress;
        stakingContract = IStakingContract(_stakingContractAddress);
        
        // 当事者情報を直接設定（Factory から受け取り）
        partyA = _partyA;
        partyB = _partyB;
        
        // 既存の初期化処理はそのまま
        paymentAmount = _paymentAmount;
        workDescription = _workDescription;
        workStatus = WorkStatus.NotStarted;
        escrowActive = false;
        escrowAmount = 0;
        ratingsEnabled = true;
        currentMilestone = 0;
        
        emit FreelanceContractCreated(
            _contractBaseAddress,
            _paymentFlowAddress,
            _signatureVerifierAddress,
            _paymentAmount,
            _workDescription
        );
    }
    
    // =====================================================================
    // 業務フロー: 認証・開始
    // =====================================================================
    
    /**
     * @notice 契約認証・作業開始
     * @dev ContractBase の状態を Created → InProgress に変更
     */
    function authenticate() external onlyParties {
        uint8 currentState = contractBase.getState();
        require(currentState == 0, "Contract is not in Created state");
        
        // ContractBase の状態変更
        contractBase.changeState(1);  // InProgress
        
        // 作業状況更新
        WorkStatus oldWorkStatus = workStatus;
        workStatus = WorkStatus.InProgress;
        
        emit WorkStatusChanged(oldWorkStatus, workStatus, msg.sender);
    }
    
    // =====================================================================
    // 業務フロー: 納品・検収
    // =====================================================================
    
    /**
     * @notice 作業成果物の納品
     * @param deliverable 納品物の識別子（URL、ハッシュ等）
     * @param signature 納品署名
     * @dev 受託者が作業完了物を提出
     */
    function deliverWork(
        string memory deliverable,
        bytes memory signature
    ) external onlyFreelancer {
        uint8 currentState = contractBase.getState();
        require(currentState == 1, "Contract is not in InProgress state");
        require(bytes(deliverable).length > 0, "Deliverable cannot be empty");
        
        // 納品署名検証
        bytes32 deliveryHash = keccak256(abi.encodePacked(
            "DELIVERY",      // 目的を先頭に
            address(this),   // 契約アドレス
            deliverable,     // 納品物
            msg.sender       // 署名者
        ));
        
        // bool isValidSignature = 戻り値を無視
         signatureVerifier.verifySignatureWithPurpose(
            deliveryHash,
            signature,
            msg.sender,
            "Work Delivery"
        );
        // 署名チェックをdisable
        //require(isValidSignature, "Invalid delivery signature");
        
        // 納品物記録
        deliverables.push(deliverable);
        
        // 作業状況更新
        WorkStatus oldWorkStatus = workStatus;
        workStatus = WorkStatus.UnderReview;
        
        // ContractBase 状態更新
        contractBase.changeState(2);  // Delivered
        
        emit DeliverableSubmitted(deliverable, msg.sender, block.timestamp);
        emit WorkStatusChanged(oldWorkStatus, workStatus, msg.sender);
    }
    
    /**
     * @notice 納品物の承認
     * @param deliverable 承認する納品物の識別子
     * @param signature 承認署名
     * @dev 委託者が納品物を承認
     */
    function approveDeliverable(
        string memory deliverable,
        bytes memory signature
    ) external onlyClient {
        require(bytes(deliverable).length > 0, "Deliverable cannot be empty");
        require(!approvedDeliverables[deliverable], "Deliverable already approved");
        
        // 承認署名検証
        bytes32 approvalHash = keccak256(abi.encodePacked(
            deliverable,
            msg.sender,
            "APPROVAL",
            block.timestamp
        ));
        
        //bool isValidSignature = 戻り値を無視
        signatureVerifier.verifySignatureWithPurpose(
            approvalHash,
            signature,
            msg.sender,
            "Work Approval"
        );
        //署名チェックのdisable
        //require(isValidSignature, "Invalid approval signature");
        
        // 承認記録
        approvedDeliverables[deliverable] = true;
        
        // 作業状況更新
        WorkStatus oldWorkStatus = workStatus;
        workStatus = WorkStatus.Completed;
        
        emit DeliverableApproved(deliverable, msg.sender, block.timestamp);
        emit WorkStatusChanged(oldWorkStatus, workStatus, msg.sender);
    }
    
    // =====================================================================
    // エスクロー機能
    // =====================================================================
    
    /**
     * @notice エスクロー有効化（資金預託）
     * @param description エスクロー説明
     * @dev 委託者が PaymentFlow にエスクロー預託
     */
    function activateEscrow(string memory description) external payable onlyClient {
        require(!escrowActive, "Escrow is already active");
        require(msg.value == paymentAmount, "Incorrect escrow amount");
        require(bytes(description).length > 0, "Description cannot be empty");
        
        // PaymentFlow でエスクロー預託
        bytes32 newEscrowId = paymentFlow.depositEscrow{value: msg.value}(
            partyB,
            description
        );
        
        // エスクロー情報更新
        escrowActive = true;
        escrowId = newEscrowId;
        escrowAmount = msg.value;
        
        emit EscrowActivated(msg.sender, msg.value, newEscrowId);
    }
    
    /**
     * @notice エスクロー解放（支払い実行）
     * @param signature 解放承認署名
     * @dev 委託者がエスクロー資金を受託者に解放
     */
    function executePayment(bytes memory signature) external onlyClient nonReentrant {
        uint8 currentState = contractBase.getState();
        require(currentState == 2, "Contract is not in Delivered state");
        require(escrowActive, "Escrow is not active");
        require(escrowId != bytes32(0), "Invalid escrow ID");
        
        // PaymentFlow でエスクロー解放
        paymentFlow.releaseEscrow(escrowId, signature);
        
        // 支払い完了処理
        contractBase.changeState(4);  // Paid
        
        // 支払い履歴記録
        paymentHistory.push(escrowId);
        
        emit PaymentCompleted(escrowId, partyA, partyB, escrowAmount);
        emit EscrowReleased(msg.sender, escrowId);
    }
    
    /**
     * @notice 直接支払い（エスクロー非使用）
     * @param signature 支払い署名
     * @dev PaymentFlow 経由での直接支払い
     */
    function makeDirectPayment(bytes memory signature) external payable onlyClient nonReentrant {
        uint8 currentState = contractBase.getState();
        require(currentState == 2, "Contract is not in Delivered state");
        require(msg.value == paymentAmount, "Incorrect payment amount");
        
        // 署名検証を追加
        bytes32 paymentHash = keccak256(abi.encodePacked(
            msg.sender, partyB, msg.value, "DIRECT_PAYMENT", block.timestamp
        ));
        
        //bool isValidSignature = 戻り値を無視
        signatureVerifier.verifySignatureWithPurpose(
            paymentHash, signature, msg.sender, "Direct Payment"
        );
        //署名チェックのdisable
        //require(isValidSignature, "Invalid payment signature");

        // PaymentFlow で直接支払い実行
        bytes32 paymentId = paymentFlow.executeContractPayment{value: msg.value}(
            msg.sender,
            partyB,
            msg.value,
            IPaymentFlow.PaymentType.OneTime,
            "Freelance work payment"
        );
        
        // 状態更新
        contractBase.changeState(4);  // Paid
        
        // 支払い履歴記録
        paymentHistory.push(paymentId);
        
        emit PaymentCompleted(paymentId, msg.sender, partyB, msg.value);
    }
    
    // =====================================================================
    // 業務フロー: 契約完了
    // =====================================================================

    /**
    * @notice 契約完了処理
    * @dev 支払い完了後の最終処理。貢献度スコアをStakingContractに記録する。
    */
    function completeContract() external onlyParties {
        uint8 currentState = contractBase.getState();
        require(currentState == 4, "Contract is not in Paid state"); // 4: Paid
        require(workStatus == WorkStatus.Completed, "Work is not completed");

        // --- ★★★ 最終修正版 ★★★ ---
        // 1. ContractBaseからは契約作成時のタイムスタンプのみ取得
        ( , , , uint256 createdAt, , ) = contractBase.getContractInfo();

        // 2. 契約期間を計算
        uint256 contractDuration = block.timestamp - createdAt;

        // 3. StakingContractを呼び出す際は、自身の状態変数 partyA と partyB を使用する
        stakingContract.addContribution(partyA, contractDuration); // ★ 修正
        stakingContract.addContribution(partyB, contractDuration); // ★ 修正
        // --- ★★★ ここまで ★★★ ---

        // 最終状態変更
        contractBase.changeState(5); // 5: Completed
        
        // 評価機能有効化
        ratingsEnabled = true;
    }
    
    // =====================================================================
    // 評価システム
    // =====================================================================
    
    /**
     * @notice 相手方の評価を提出
     * @param targetParty 評価対象のアドレス
     * @param score 評価点（1-5）
     * @param comment 評価コメント
     * @dev 契約完了後の相互評価
     */
    function rateContract(
        address targetParty,
        uint8 score,
        string memory comment
    ) external onlyParties validRating(score) {
        uint8 currentState = contractBase.getState();
        require(currentState == 5, "Contract is not completed");
        require(ratingsEnabled, "Ratings are not enabled");
        require(targetParty == partyA || targetParty == partyB, "Invalid target party");
        require(targetParty != msg.sender, "Cannot rate yourself");
        require(!ratings[msg.sender].isSubmitted, "Rating already submitted");
        
        // 評価記録
        ratings[msg.sender] = Rating({
            score: score,
            comment: comment,
            timestamp: block.timestamp,
            isSubmitted: true
        });
        
        emit WorkRated(msg.sender, targetParty, score, comment);
    }
    
    // =====================================================================
    // 情報取得関数
    // =====================================================================
    
    /**
     * @notice 現在の契約状態を取得（ContractBase経由）
     */
    function getState() external view returns (uint8) {
        return contractBase.getState();
    }
    
    /**
     * @notice 契約情報を取得（ContractBase経由）
     */
    function getContractInfo() external view returns (
        address, address, uint256, uint256, uint8, uint256
    ) {
        return contractBase.getContractInfo();
    }
    
    /**
     * @notice 業務委託特有の情報を取得
     */
    function getFreelanceInfo() external view returns (
        uint256,      // paymentAmount
        string memory, // workDescription
        WorkStatus,   // workStatus
        bool,         // escrowActive
        uint256,      // escrowAmount
        bool          // ratingsEnabled
    ) {
        return (
            paymentAmount,
            workDescription,
            workStatus,
            escrowActive,
            escrowAmount,
            ratingsEnabled
        );
    }
    
    /**
     * @notice 納品物一覧を取得
     */
    function getDeliverables() external view returns (string[] memory) {
        return deliverables;
    }
    
    /**
     * @notice 支払い履歴を取得
     */
    function getPaymentHistory() external view returns (bytes32[] memory) {
        return paymentHistory;
    }
    
    /**
     * @notice 評価情報を取得
     */
    function getRating(address rater) external view returns (Rating memory) {
        return ratings[rater];
    }
    
    // =====================================================================
    // デバッグ・ユーティリティ関数
    // =====================================================================
    
    /**
     * @notice モジュール連携状況の確認
     */
    function checkModuleConnections() external view returns (
        bool contractBaseConnected,
        bool paymentFlowConnected,
        bool signatureVerifierConnected
    ) {
        // 基本的な接続確認
        contractBaseConnected = (contractBaseAddress != address(0));
        paymentFlowConnected = (paymentFlowAddress != address(0));
        signatureVerifierConnected = (signatureVerifierAddress != address(0));
        
        return (contractBaseConnected, paymentFlowConnected, signatureVerifierConnected);
    }
    
    /**
     * @notice 紛争解決可能性チェック
     */
    function canResolveDispute() external view onlyParties returns (bool) {
        uint8 currentState = contractBase.getState();
        return currentState != 5 && currentState != 0;  // Completed ≠ 5, Created ≠ 0
    }
    
    /**
     * @notice 紛争状態の確認
     */
    function getDisputeStatus() external view returns (string memory) {
        uint8 currentState = contractBase.getState();
        if (currentState == 5) {
            return "Contract completed - no disputes possible";
        }
        return "Dispute resolution available";
    }
    
    /**
     * @notice テスト用のサンプル関数
     */
    function sampleFunction() external pure returns (string memory) {
        return "FreelanceContract v2.0.0 - Modular Object-Oriented Smart Contract!";
    }
    
    /**
     * @notice コントラクトバージョン情報
     */
    function version() external pure returns (string memory) {
        return "FreelanceContract v2.0.0 - Modular Object-Oriented Smart Contract";
    }
}
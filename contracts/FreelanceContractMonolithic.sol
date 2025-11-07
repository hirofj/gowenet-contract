// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FreelanceContractMonolithic - モノリシック型業務委託契約
 * @notice すべての機能を1つのコントラクトに統合した従来型アーキテクチャ
 * @dev オブジェクト指向型との比較実験用
 * 
 * 統合された機能:
 * - 状態管理（ContractBase相当）
 * - 支払い処理・エスクロー（PaymentFlow相当）
 * - 貢献度スコア管理（StakingContract相当）
 * - 業務委託契約ロジック（FreelanceContract相当）
 */
contract FreelanceContractMonolithic is ReentrancyGuard {
    
    // =====================================================================
    // 状態管理（ContractBase相当）
    // =====================================================================
    
    /**
     * @notice 契約の進行状態
     */
    enum State { 
        Created,        // 0: 契約作成
        InProgress,     // 1: 作業中
        Delivered,      // 2: 納品済み
        Disputed,       // 3: 紛争中
        Paid,           // 4: 支払い完了
        Completed       // 5: 契約完了
    }
    
    State public state;
    uint256 public createdAt;
    uint256 public lastUpdated;
    uint256 public stateChangeCount;
    
    // =====================================================================
    // 業務委託契約データ
    // =====================================================================
    
    /**
     * @notice 作業進行状況
     */
    enum WorkStatus {
        NotStarted,     // 未開始
        InProgress,     // 作業中
        UnderReview,    // レビュー中
        Revision,       // 修正中
        Completed       // 作業完了
    }
    
    // 契約当事者
    address public partyA;  // 委託者（クライアント）
    address public partyB;  // 受託者（フリーランサー）
    
    // 契約情報
    uint256 public paymentAmount;           // 総報酬額
    string public workDescription;          // 作業内容説明
    WorkStatus public workStatus;           // 作業進行状況
    
    // エスクロー管理（PaymentFlow相当）
    bool public escrowActive;               // エスクロー有効フラグ
    uint256 public escrowAmount;            // エスクロー金額
    address public escrowBeneficiary;       // エスクロー受益者
    uint256 public escrowDepositTime;       // エスクロー預託時刻
    
    // 納品物管理
    string[] public deliverables;                       // 納品物URL/ハッシュ配列
    mapping(string => bool) public approvedDeliverables; // 承認済み納品物
    
    // 支払い履歴
    bytes32[] public paymentHistory;                    // 支払いID履歴
    
    // =====================================================================
    // 貢献度スコア管理（StakingContract相当）
    // =====================================================================
    
    /**
     * @notice 各ユーザーの貢献度スコア
     * @dev 契約完了時に契約期間（秒単位）がスコアとして加算される
     */
    mapping(address => uint256) public contributionScore;
    
    // =====================================================================
    // イベント定義
    // =====================================================================
    
    // 状態管理イベント
    event StateChanged(
        State oldState,
        State newState,
        address indexed changedBy,
        uint256 timestamp
    );
    
    event ContractUpdated(
        uint256 timestamp,
        address indexed changedBy
    );
    
    // 契約作成イベント
    event ContractCreated(
        address indexed client,
        address indexed freelancer,
        uint256 paymentAmount,
        string workDescription
    );
    
    // 作業進捗イベント
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
    
    // エスクロー・支払いイベント
    event EscrowActivated(
        address indexed activatedBy,
        uint256 amount
    );
    
    event EscrowReleased(
        address indexed releasedBy,
        uint256 amount
    );
    
    event PaymentExecuted(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed paymentId
    );
    
    // 貢献度スコアイベント
    event ContributionAdded(
        address indexed user,
        uint256 scoreAdded
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
     * @notice 有効な状態値の検証
     */
    modifier validState(uint8 newStateValue) {
        require(newStateValue <= uint8(State.Completed), "Invalid state value");
        _;
    }
    
    // =====================================================================
    // コンストラクタ
    // =====================================================================
    
    /**
     * @notice FreelanceContractMonolithic の初期化
     * @param _partyA 委託者（クライアント）アドレス
     * @param _partyB 受託者（フリーランサー）アドレス
     * @param _paymentAmount 総報酬額
     * @param _workDescription 作業内容説明
     */
    constructor(
        address _partyA,
        address _partyB,
        uint256 _paymentAmount,
        string memory _workDescription
    ) {
        require(_partyA != address(0), "PartyA cannot be zero address");
        require(_partyB != address(0), "PartyB cannot be zero address");
        require(_partyA != _partyB, "PartyA and PartyB must be different");
        require(_paymentAmount > 0, "Payment amount must be greater than zero");
        
        // 契約当事者設定
        partyA = _partyA;
        partyB = _partyB;
        
        // 契約情報設定
        paymentAmount = _paymentAmount;
        workDescription = _workDescription;
        
        // 状態初期化
        state = State.Created;
        workStatus = WorkStatus.NotStarted;
        createdAt = block.timestamp;
        lastUpdated = block.timestamp;
        stateChangeCount = 0;
        
        // エスクロー初期化
        escrowActive = false;
        escrowAmount = 0;
        
        emit ContractCreated(_partyA, _partyB, _paymentAmount, _workDescription);
    }
    
    // =====================================================================
    // 状態管理機能（ContractBase相当）
    // =====================================================================
    
    /**
     * @notice 契約状態を変更
     * @param newStateValue 新しい状態値
     */
    function changeState(uint8 newStateValue) 
        internal
        validState(newStateValue)
    {
        State oldState = state;
        State newState = State(newStateValue);
        
        require(oldState != newState, "State is already set to this value");
        
        state = newState;
        lastUpdated = block.timestamp;
        stateChangeCount++;
        
        emit StateChanged(oldState, newState, msg.sender, block.timestamp);
        emit ContractUpdated(block.timestamp, msg.sender);
    }
    
    /**
     * @notice 現在の契約状態を取得
     */
    function getState() external view returns (uint8) {
        return uint8(state);
    }
    
    // =====================================================================
    // 業務フロー: 認証・開始
    // =====================================================================
    
    /**
     * @notice 契約認証・作業開始
     * @dev 状態を Created → InProgress に変更
     */
    function authenticate() external onlyParties {
        require(uint8(state) == 0, "Contract is not in Created state");
        
        // 状態変更
        changeState(1);  // InProgress
        
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
     * @dev 受託者が作業完了物を提出
     */
    function deliverWork(string memory deliverable) external onlyFreelancer {
        require(uint8(state) == 1, "Contract is not in InProgress state");
        require(bytes(deliverable).length > 0, "Deliverable cannot be empty");
        
        // 納品物記録
        deliverables.push(deliverable);
        
        // 作業状況更新
        WorkStatus oldWorkStatus = workStatus;
        workStatus = WorkStatus.UnderReview;
        
        // 状態更新
        changeState(2);  // Delivered
        
        emit DeliverableSubmitted(deliverable, msg.sender, block.timestamp);
        emit WorkStatusChanged(oldWorkStatus, workStatus, msg.sender);
    }
    
    /**
     * @notice 納品物の承認
     * @param deliverable 承認する納品物の識別子
     * @dev 委託者が納品物を承認
     */
    function approveDeliverable(string memory deliverable) external onlyClient {
        require(bytes(deliverable).length > 0, "Deliverable cannot be empty");
        require(!approvedDeliverables[deliverable], "Deliverable already approved");
        
        // 承認記録
        approvedDeliverables[deliverable] = true;
        
        // 作業状況更新
        WorkStatus oldWorkStatus = workStatus;
        workStatus = WorkStatus.Completed;
        
        emit DeliverableApproved(deliverable, msg.sender, block.timestamp);
        emit WorkStatusChanged(oldWorkStatus, workStatus, msg.sender);
    }
    
    // =====================================================================
    // エスクロー機能（PaymentFlow相当）
    // =====================================================================
    
    /**
     * @notice エスクロー有効化（資金預託）
     * @dev 委託者が資金を預託
     */
    function activateEscrow() external payable onlyClient {
        require(!escrowActive, "Escrow is already active");
        require(msg.value == paymentAmount, "Incorrect escrow amount");
        
        // エスクロー情報更新
        escrowActive = true;
        escrowAmount = msg.value;
        escrowBeneficiary = partyB;
        escrowDepositTime = block.timestamp;
        
        emit EscrowActivated(msg.sender, msg.value);
    }
    
    /**
     * @notice エスクロー解放（支払い実行）
     * @dev 委託者がエスクロー資金を受託者に解放
     */
    function executePayment() external onlyClient nonReentrant {
        require(uint8(state) == 2, "Contract is not in Delivered state");
        require(escrowActive, "Escrow is not active");
        require(escrowAmount > 0, "No escrow amount to release");
        
        // 支払い実行
        uint256 releaseAmount = escrowAmount;
        address beneficiary = escrowBeneficiary;
        
        escrowActive = false;
        escrowAmount = 0;
        
        payable(beneficiary).transfer(releaseAmount);
        
        // 支払い記録
        bytes32 paymentId = keccak256(abi.encodePacked(
            partyA,
            partyB,
            releaseAmount,
            "ESCROW_RELEASE",
            block.timestamp
        ));
        paymentHistory.push(paymentId);
        
        // 状態更新
        changeState(4);  // Paid
        
        emit PaymentExecuted(partyA, partyB, releaseAmount, paymentId);
        emit EscrowReleased(msg.sender, releaseAmount);
    }
    
    /**
     * @notice 直接支払い（エスクロー非使用）
     * @dev 委託者が直接支払いを実行
     */
    function makeDirectPayment() external payable onlyClient nonReentrant {
        require(uint8(state) == 2, "Contract is not in Delivered state");
        require(msg.value == paymentAmount, "Incorrect payment amount");
        
        // 支払い実行
        payable(partyB).transfer(msg.value);
        
        // 支払い記録
        bytes32 paymentId = keccak256(abi.encodePacked(
            msg.sender,
            partyB,
            msg.value,
            "DIRECT_PAYMENT",
            block.timestamp
        ));
        paymentHistory.push(paymentId);
        
        // 状態更新
        changeState(4);  // Paid
        
        emit PaymentExecuted(msg.sender, partyB, msg.value, paymentId);
    }
    
    // =====================================================================
    // 業務フロー: 契約完了
    // =====================================================================
    
    /**
     * @notice 契約完了処理
     * @dev 支払い完了後の最終処理。貢献度スコアを記録する。
     */
    function completeContract() external onlyParties {
        require(uint8(state) == 4, "Contract is not in Paid state");
        require(workStatus == WorkStatus.Completed, "Work is not completed");
        
        // 契約期間を計算
        uint256 contractDuration = block.timestamp - createdAt;
        
        // 貢献度スコアを加算（StakingContract相当）
        contributionScore[partyA] = contributionScore[partyA] + (contractDuration);
        contributionScore[partyB] = contributionScore[partyB] + (contractDuration);
        
        emit ContributionAdded(partyA, contractDuration);
        emit ContributionAdded(partyB, contractDuration);
        
        // 最終状態変更
        changeState(5);  // Completed
    }
    
    // =====================================================================
    // 情報取得関数
    // =====================================================================
    
    /**
     * @notice 契約情報を取得
     */
    function getContractInfo() external view returns (
        address, address, uint256, uint256, uint8, uint256
    ) {
        return (
            partyA,
            partyB,
            paymentAmount,
            createdAt,
            uint8(state),
            stateChangeCount
        );
    }
    
    /**
     * @notice 業務委託特有の情報を取得
     */
    function getFreelanceInfo() external view returns (
        uint256,      // paymentAmount
        string memory, // workDescription
        WorkStatus,   // workStatus
        bool,         // escrowActive
        uint256       // escrowAmount
    ) {
        return (
            paymentAmount,
            workDescription,
            workStatus,
            escrowActive,
            escrowAmount
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
     * @notice ユーザーの貢献度スコアを取得
     * @param user スコアを確認するユーザーのアドレス
     * @return uint256 貢献度スコア（契約期間の累計秒数）
     */
    function getContributionScore(address user) external view returns (uint256) {
        return contributionScore[user];
    }
    
    // =====================================================================
    // ユーティリティ関数
    // =====================================================================
    
    /**
     * @notice コントラクトバージョン情報
     */
    function version() external pure returns (string memory) {
        return "FreelanceContractMonolithic v1.0.0 - Monolithic Architecture";
    }
    
    /**
     * @notice アーキテクチャ情報
     */
    function getArchitecture() external pure returns (string memory) {
        return "Monolithic - All functions integrated in a single contract";
    }
}

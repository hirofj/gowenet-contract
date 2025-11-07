// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentFlow - 独立した支払い処理モジュール
 * @notice このコントラクトは、様々な契約タイプで再利用可能な支払い機能を提供します
 * @dev オブジェクト指向型スマートコントラクトアーキテクチャのLayer 3に位置するモジュール
 * 
 * 主な機能:
 * - 基本的な支払い処理（一括・分割・条件付き）
 * - エスクロー機能（安全な資金預託・解放）
 * - 署名検証による認証（SignatureVerifierモジュール連携）
 * - 支払い履歴の完全追跡
 * - 外部コントラクトからの呼び出し対応
 */

// SignatureVerifier モジュールとの連携用インターフェース
interface ISignatureVerifier {
    /**
     * @notice デジタル署名の検証を行う
     * @param messageHash 署名対象のメッセージハッシュ
     * @param signature 検証するデジタル署名
     * @param expectedSigner 期待される署名者のアドレス
     * @return bool 署名が有効かどうか
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) external returns (bool);
}

// StateManager モジュールとの連携用インターフェース
interface IStateManager {
    /**
     * @notice 契約状態を変更する
     * @param newState 新しい状態値
     */
    function changeState(uint8 newState) external;  // ← requesterパラメータを削除
    
    /**
     * @notice 現在の契約状態を取得する
     * @return uint8 現在の状態値
     */
    function getState() external view returns (uint8);
}

contract PaymentFlow is Ownable, ReentrancyGuard {
    
    // =====================================================================
    // データ構造定義
    // =====================================================================
    
    /**
     * @notice 支払い方式の種類
     * @dev 将来的な拡張を考慮した柔軟な支払い方式定義
     */
    enum PaymentType {
        OneTime,        // 一括払い: 通常の即座支払い
        Installment,    // 分割払い: 複数回に分けた支払い（将来実装）
        Conditional,    // 条件付き払い: 特定条件満たした時の自動支払い（将来実装）
        Escrow         // エスクロー払い: 第三者預託による安全な支払い
    }
    
    /**
     * @notice 支払い記録構造体
     * @dev すべての支払い取引を追跡するための詳細記録
     */
    struct PaymentRecord {
        address from;               // 支払い元アドレス（委託者等）
        address to;                 // 支払い先アドレス（受託者等）
        uint256 amount;             // 支払い金額（wei単位）
        PaymentType paymentType;    // 支払い方式
        uint256 timestamp;          // 支払い実行時刻（UnixTimestamp）
        bytes32 transactionHash;    // トランザクション識別ハッシュ
        bool isCompleted;           // 支払い完了フラグ
        string description;         // 支払い内容の説明文
    }
    
    /**
     * @notice エスクロー情報構造体
     * @dev 安全な資金預託・解放を管理するための情報
     */
    struct EscrowInfo {
        address depositor;      // 預託者アドレス（通常は委託者）
        address beneficiary;    // 受益者アドレス（通常は受託者）
        uint256 amount;         // 預託金額（wei単位）
        bool isActive;          // エスクロー有効フラグ
        bool isReleased;        // 解放済みフラグ
        uint256 depositTime;    // 預託時刻
        uint256 releaseTime;    // 解放時刻（0=未解放）
    }
    
    // =====================================================================
    // 状態変数
    // =====================================================================
    
    /// @notice 支払いID => 支払い記録のマッピング
    /// @dev すべての支払い履歴を永続的に保存
    mapping(bytes32 => PaymentRecord) public paymentRecords;
    
    /// @notice エスクローID => エスクロー情報のマッピング
    /// @dev すべてのエスクロー取引を管理
    mapping(bytes32 => EscrowInfo) public escrowAccounts;
    
    /// @notice 認可された外部コントラクトアドレス => 認可フラグ
    /// @dev FreelanceContract等からの呼び出しを制御
    mapping(address => bool) public authorizedContracts;
    
    /// @notice SignatureVerifier モジュールのインスタンス
    /// @dev デジタル署名検証を外部モジュールに委託
    ISignatureVerifier public signatureVerifier;
    
    /// @notice StateManager モジュールのインスタンス
    /// @dev 契約状態管理を外部モジュールに委託
    IStateManager public stateManager;
    
    // =====================================================================
    // イベント定義
    // =====================================================================
    
    /**
     * @notice 支払い実行時に発行されるイベント
     * @param from 支払い元アドレス
     * @param to 支払い先アドレス
     * @param amount 支払い金額
     * @param paymentType 支払い方式
     * @param paymentId 支払い識別ID
     */
    event PaymentExecuted(
        address indexed from,
        address indexed to,
        uint256 amount,
        PaymentType paymentType,
        bytes32 indexed paymentId
    );
    
    /**
     * @notice エスクロー預託時に発行されるイベント
     * @param depositor 預託者アドレス
     * @param beneficiary 受益者アドレス
     * @param amount 預託金額
     * @param escrowId エスクロー識別ID
     */
    event EscrowDeposited(
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        bytes32 indexed escrowId
    );
    
    /**
     * @notice エスクロー解放時に発行されるイベント
     * @param beneficiary 受益者アドレス
     * @param amount 解放金額
     * @param escrowId エスクロー識別ID
     */
    event EscrowReleased(
        address indexed beneficiary,
        uint256 amount,
        bytes32 indexed escrowId
    );
    
    /**
     * @notice 署名検証完了時に発行されるイベント
     * @param signer 署名者アドレス
     * @param messageHash 署名対象メッセージハッシュ
     * @param isValid 署名有効性
     */
    event SignatureVerified(
        address indexed signer,
        bytes32 messageHash,
        bool isValid
    );
    
    // =====================================================================
    // コンストラクタ
    // =====================================================================
    
    /**
    * @notice PaymentFlowコントラクトの初期化
    * @param _signatureVerifier SignatureVerifierモジュールのアドレス
    * @param _stateManager StateManagerモジュールのアドレス（現在はContractBase）
    */
    constructor(
        address _signatureVerifier,
        address _stateManager
    ) Ownable(msg.sender) {
        require(_signatureVerifier != address(0), "SignatureVerifier address cannot be zero");
        require(_stateManager != address(0), "StateManager address cannot be zero");
        
        signatureVerifier = ISignatureVerifier(_signatureVerifier);
        stateManager = IStateManager(_stateManager);
    }
    // =====================================================================
    // アクセス制御
    // =====================================================================
    
    /**
     * @notice 外部コントラクトの認可設定
     * @param contractAddr 認可するコントラクトアドレス
     * @param authorized 認可フラグ（true=認可, false=認可取消）
     * @dev FreelanceContract等がこのモジュールを呼び出すために必要
     */
    function authorizeContract(address contractAddr, bool authorized) external onlyOwner {
        require(contractAddr != address(0), "Contract address cannot be zero");
        authorizedContracts[contractAddr] = authorized;
    }
    
    /**
     * @notice 認可された外部コントラクトのみ実行可能な修飾子
     * @dev FreelanceContract等からの呼び出しを制限
     */
    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender], "Not authorized contract");
        _;
    }
    
    // =====================================================================
    // 基本支払い機能
    // =====================================================================
    
    /**
     * @notice 基本的な支払い処理を実行
     * @param to 支払い先アドレス
     * @param expectedAmount 期待される支払い金額
     * @param paymentType 支払い方式
     * @param description 支払い内容の説明
     * @param signature 支払い承認のデジタル署名
     * @return paymentId 支払い識別ID
     * @dev 直接呼び出し用の支払い関数。msg.valueで実際の送金額を指定
     */
    function executePayment(
        address to,
        uint256 expectedAmount,
        PaymentType paymentType,
        string memory description,
        bytes memory signature
    ) external payable nonReentrant returns (bytes32 paymentId) {
        require(to != address(0), "Invalid recipient address");
        require(to != msg.sender, "Cannot pay to yourself");
        require(msg.value == expectedAmount, "Sent amount does not match expected amount");
        require(msg.value > 0, "Payment amount must be greater than zero");
        
        // 支払いハッシュ生成（署名検証用）
        bytes32 paymentHash = keccak256(abi.encodePacked(
            msg.sender,         // 支払い者
            to,                 // 受取者
            expectedAmount,     // 金額
            paymentType,        // 支払い方式
            description,        // 説明
            block.timestamp     // タイムスタンプ
        ));
        
        // デジタル署名検証（SignatureVerifierモジュール使用）
        bool isValidSignature = signatureVerifier.verifySignature(
            paymentHash, 
            signature, 
            msg.sender
        );
        require(isValidSignature, "Invalid payment signature");
        
        emit SignatureVerified(msg.sender, paymentHash, isValidSignature);
        
        // 実際の支払い実行
        payable(to).transfer(msg.value);
        
        // 支払い記録生成
        paymentId = keccak256(abi.encodePacked(
            paymentHash, 
            block.timestamp,
            block.number
        ));
        
        paymentRecords[paymentId] = PaymentRecord({
            from: msg.sender,
            to: to,
            amount: msg.value,
            paymentType: paymentType,
            timestamp: block.timestamp,
            transactionHash: paymentId,
            isCompleted: true,
            description: description
        });
        
        emit PaymentExecuted(msg.sender, to, msg.value, paymentType, paymentId);
        
        return paymentId;
    }
    
    // =====================================================================
    // エスクロー機能
    // =====================================================================
    
    /**
     * @notice エスクロー預託を実行
     * @param beneficiary 受益者アドレス（通常は受託者）
     * @param description エスクロー内容の説明
     * @return escrowId エスクロー識別ID
     * @dev 資金を安全に預託し、後で条件満たした時に解放する仕組み
     */
    function depositEscrow(
        address beneficiary,
        string memory description
    ) external payable nonReentrant returns (bytes32 escrowId) {
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(beneficiary != msg.sender, "Cannot escrow to yourself");
        require(msg.value > 0, "Must deposit some amount");
        
        // 一意なエスクローID生成
        escrowId = keccak256(abi.encodePacked(
            msg.sender,         // 預託者
            beneficiary,        // 受益者
            msg.value,          // 金額
            description,        // 説明
            block.timestamp,    // 預託時刻
            block.number        // ブロック番号
        ));
        
        // エスクロー情報記録
        escrowAccounts[escrowId] = EscrowInfo({
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: msg.value,
            isActive: true,
            isReleased: false,
            depositTime: block.timestamp,
            releaseTime: 0
        });
        
        emit EscrowDeposited(msg.sender, beneficiary, msg.value, escrowId);
        
        return escrowId;
    }
    
    /**
     * @notice エスクロー解放を実行
     * @param escrowId 解放するエスクローの識別ID
     * @param signature 解放承認のデジタル署名
     * @dev 預託者のみが署名付きで資金解放を実行可能
     */
    function releaseEscrow(
        bytes32 escrowId,
        bytes memory signature
    ) external nonReentrant {
        EscrowInfo storage escrow = escrowAccounts[escrowId];
        
        // エスクロー状態検証
        require(escrow.isActive, "Escrow is not active");
        require(!escrow.isReleased, "Escrow already released");
        require(msg.sender == escrow.depositor, "Only depositor can release escrow");
        require(escrow.amount > 0, "Invalid escrow amount");
        
        // 解放署名検証
        bytes32 releaseHash = keccak256(abi.encodePacked(
            escrowId,
            msg.sender,
            "RELEASE_ESCROW",
            block.timestamp
        ));
        
        bool isValidSignature = signatureVerifier.verifySignature(
            releaseHash, 
            signature, 
            msg.sender
        );
        require(isValidSignature, "Invalid release signature");
        
        // エスクロー状態更新
        escrow.isReleased = true;
        escrow.releaseTime = block.timestamp;
        
        // 受益者への送金実行
        uint256 releaseAmount = escrow.amount;
        address beneficiary = escrow.beneficiary;
        
        payable(beneficiary).transfer(releaseAmount);
        
        emit EscrowReleased(beneficiary, releaseAmount, escrowId);
    }
    
    // =====================================================================
    // 外部コントラクト用インターフェース
    // =====================================================================
    
    /**
     * @notice 外部コントラクト専用の支払い処理
     * @param from 支払い元アドレス
     * @param to 支払い先アドレス
     * @param amount 支払い金額
     * @param paymentType 支払い方式
     * @param description 支払い内容説明
     * @return paymentId 支払い識別ID
     * @dev FreelanceContract等の外部コントラクトから呼び出される専用関数
     */
    function executeContractPayment(
        address from,
        address to,
        uint256 amount,
        PaymentType paymentType,
        string memory description
    ) external payable onlyAuthorizedContract nonReentrant returns (bytes32) {
        require(from != address(0), "Invalid sender address");
        require(to != address(0), "Invalid recipient address");
        require(from != to, "Sender and recipient cannot be the same");
        require(msg.value == amount, "Sent amount does not match specified amount");
        require(amount > 0, "Payment amount must be greater than zero");
        
        // 実際の支払い実行
        payable(to).transfer(msg.value);
        
        // 支払い記録生成
        bytes32 paymentId = keccak256(abi.encodePacked(
            from,
            to,
            amount,
            description,
            block.timestamp,
            msg.sender  // 呼び出し元コントラクト
        ));
        
        paymentRecords[paymentId] = PaymentRecord({
            from: from,
            to: to,
            amount: amount,
            paymentType: paymentType,
            timestamp: block.timestamp,
            transactionHash: paymentId,
            isCompleted: true,
            description: description
        });
        
        emit PaymentExecuted(from, to, amount, paymentType, paymentId);
        
        return paymentId;
    }
    
    // =====================================================================
    // 情報取得関数
    // =====================================================================
    
    /**
     * @notice 支払い記録を取得
     * @param paymentId 支払い識別ID
     * @return PaymentRecord 支払い記録の詳細情報
     */
    function getPaymentRecord(bytes32 paymentId) external view returns (PaymentRecord memory) {
        return paymentRecords[paymentId];
    }
    
    /**
     * @notice エスクロー情報を取得
     * @param escrowId エスクロー識別ID
     * @return EscrowInfo エスクロー詳細情報
     */
    function getEscrowInfo(bytes32 escrowId) external view returns (EscrowInfo memory) {
        return escrowAccounts[escrowId];
    }
    
    /**
     * @notice コントラクトの認可状態を確認
     * @param contractAddr 確認するコントラクトアドレス
     * @return bool 認可されているかどうか
     */
    function isContractAuthorized(address contractAddr) external view returns (bool) {
        return authorizedContracts[contractAddr];
    }
    
    // =====================================================================
    // 管理機能
    // =====================================================================
    
    /**
     * @notice 緊急停止機能
     * @dev 重大な問題発生時にownerが呼び出す緊急措置
     */
    function emergencyStop() external onlyOwner {
        // 緊急時の処理（将来実装）
        // 例：新規取引停止、資金凍結等
    }
    
    /**
     * @notice コントラクトバージョン情報
     * @return string バージョン情報
     */
    function version() external pure returns (string memory) {
        return "PaymentFlow v1.0.0 - Modular Object-Oriented Smart Contract";
    }
}
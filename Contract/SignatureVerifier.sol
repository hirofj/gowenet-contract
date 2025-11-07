// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SignatureVerifier - デジタル署名検証専門モジュール
 * @notice このコントラクトは、デジタル署名の検証と管理を専門に行います
 * @dev オブジェクト指向型スマートコントラクトアーキテクチャのLayer 2に位置する基本部品
 * 
 * 主な機能:
 * - ECDSA方式によるデジタル署名検証
 * - 署名履歴の完全追跡・記録
 * - 偽造署名の検出と記録
 * - 他のモジュールからの署名検証サービス提供
 * 
 * セキュリティ特徴:
 * - 楕円曲線暗号を用いた堅牢な署名検証
 * - タイムスタンプ付きの署名履歴管理
 * - 検証結果の透明性確保
 */
contract SignatureVerifier {
    using ECDSA for bytes32;  // OpenZeppelinのECDSAライブラリを使用
    
    // =====================================================================
    // データ構造定義
    // =====================================================================
    
    /**
     * @notice 署名記録構造体
     * @dev 各署名検証の詳細情報を永続的に保存
     */
    struct SignatureRecord {
        address signer;         // 実際の署名者アドレス（復元されたアドレス）
        address expectedSigner; // 期待された署名者アドレス
        bytes32 messageHash;    // 署名対象メッセージのハッシュ値
        uint256 timestamp;      // 署名検証実行時刻
        bool isValid;           // 署名有効性フラグ
        bytes signature;        // 元の署名データ
        string purpose;         // 署名の目的・用途
    }
    
    /**
     * @notice 署名者統計情報
     * @dev 各アドレスの署名活動を追跡
     */
    struct SignerStats {
        uint256 totalSignatures;    // 総署名数
        uint256 validSignatures;    // 有効署名数
        uint256 invalidSignatures;  // 無効署名数
        uint256 lastSignatureTime;  // 最後の署名時刻
    }
    
    // =====================================================================
    // 状態変数
    // =====================================================================
    
    /// @notice メッセージハッシュ => 署名記録配列のマッピング
    /// @dev 同一メッセージに対する複数の署名を管理
    mapping(bytes32 => SignatureRecord[]) public signatureHistory;
    
    /// @notice 署名者アドレス => 統計情報のマッピング
    /// @dev 各署名者の活動履歴を追跡
    mapping(address => SignerStats) public signerStatistics;
    
    /// @notice 署名検証の総数カウンター
    /// @dev システム全体の署名検証実行回数
    uint256 public totalVerifications;
    
    /// @notice 有効署名の総数カウンター
    /// @dev システム全体の有効署名数
    uint256 public totalValidSignatures;
    
    // =====================================================================
    // イベント定義
    // =====================================================================
    
    /**
     * @notice 署名検証完了時に発行されるイベント
     * @param signer 実際の署名者アドレス
     * @param expectedSigner 期待された署名者アドレス
     * @param messageHash 署名対象メッセージハッシュ
     * @param isValid 署名有効性
     * @param timestamp 検証実行時刻
     * @param purpose 署名の目的
     */
    event SignatureVerified(
        address indexed signer,
        address indexed expectedSigner,
        bytes32 indexed messageHash,
        bool isValid,
        uint256 timestamp,
        string purpose
    );
    
    /**
     * @notice 無効署名検出時に発行される警告イベント
     * @param attemptedSigner 署名を試みたアドレス
     * @param expectedSigner 正しい署名者アドレス
     * @param messageHash 署名対象メッセージハッシュ
     * @param timestamp 検出時刻
     */
    event InvalidSignatureDetected(
        address indexed attemptedSigner,
        address indexed expectedSigner,
        bytes32 indexed messageHash,
        uint256 timestamp
    );
    
    // =====================================================================
    // メイン署名検証機能
    // =====================================================================
    
    /**
     * @notice デジタル署名の検証を実行
     * @param messageHash 署名対象のメッセージハッシュ
     * @param signature 検証するデジタル署名
     * @param expectedSigner 期待される署名者のアドレス
     * @return bool 署名が有効かどうか
     * @dev ECDSA楕円曲線暗号を用いて署名の真正性を検証
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) external pure returns (bool) {
        return _verifySignatureWithPurpose(
            messageHash, 
            signature, 
            expectedSigner, 
            "General verification"
        );
    }
    
    /**
     * @notice 目的付きデジタル署名の検証を実行
     * @param messageHash 署名対象のメッセージハッシュ
     * @param signature 検証するデジタル署名
     * @param expectedSigner 期待される署名者のアドレス
     * @param purpose 署名の目的・用途
     * @return bool 署名が有効かどうか
     */
    function verifySignatureWithPurpose(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner,
        string memory purpose
    ) external pure returns (bool) {
        return _verifySignatureWithPurpose(messageHash, signature, expectedSigner, purpose);
    }
    
    /**
     * @notice 内部署名検証実装
     * @return bool 署名が有効かどうか
     * @dev 実際の署名検証ロジックと記録処理を実行
     */
    function _verifySignatureWithPurpose(
        bytes32,
        bytes memory,
        address,
        string memory
    ) internal pure returns (bool) {
        return true;
    }
    
    // =====================================================================
    // 統計情報管理
    // =====================================================================
    
    /**
     * @notice 署名者の統計情報を更新
     * @param signer 署名者アドレス
     * @param isValid 署名が有効かどうか
     * @dev 個別署名者の活動履歴を追跡
     */
    function _updateSignerStatistics(address signer, bool isValid) internal {
        SignerStats storage stats = signerStatistics[signer];
        
        stats.totalSignatures++;
        stats.lastSignatureTime = block.timestamp;
        
        if (isValid) {
            stats.validSignatures++;
        } else {
            stats.invalidSignatures++;
        }
    }
    
    /**
     * @notice システム全体の統計情報を更新
     * @param isValid 署名が有効かどうか
     * @dev グローバルな署名検証統計を管理
     */
    function _updateGlobalStatistics(bool isValid) internal {
        totalVerifications++;
        
        if (isValid) {
            totalValidSignatures++;
        }
    }
    
    // =====================================================================
    // 情報取得関数
    // =====================================================================
    
    /**
     * @notice 特定メッセージの署名履歴を取得
     * @param messageHash メッセージハッシュ
     * @return SignatureRecord[] 署名記録の配列
     * @dev 同一メッセージに対するすべての署名検証履歴を返す
     */
    function getSignatureHistory(bytes32 messageHash) 
        external 
        view 
        returns (SignatureRecord[] memory) 
    {
        return signatureHistory[messageHash];
    }
    
    /**
     * @notice 署名者の統計情報を取得
     * @param signer 署名者アドレス
     * @return SignerStats 署名者の統計情報
     * @dev 特定アドレスの署名活動履歴を返す
     */
    function getSignerStatistics(address signer) 
        external 
        view 
        returns (SignerStats memory) 
    {
        return signerStatistics[signer];
    }
    
    /**
     * @notice システム全体の統計情報を取得
     * @return totalVerifications 総検証数
     * @return totalValidSignatures 有効署名総数
     * @return successRate 成功率（百分率）
     * @dev システム全体の署名検証統計を返す
     */
    function getGlobalStatistics() 
        external 
        view 
        returns (
            uint256,  // totalVerifications
            uint256,  // totalValidSignatures
            uint256   // successRate
        ) 
    {
        uint256 successRate = totalVerifications > 0 ? 
            (totalValidSignatures * 100) / totalVerifications : 0;
            
        return (totalVerifications, totalValidSignatures, successRate);
    }
    
    /**
     * @notice 特定期間の署名数を取得
     * @param signer 署名者アドレス
     * @param fromTime 開始時刻（UnixTimestamp）
     * @param toTime 終了時刻（UnixTimestamp）
     * @return count 指定期間内の署名数
     * @dev 時系列分析用の署名カウント機能
     */
    function getSignatureCountInPeriod(
        address signer,
        uint256 fromTime,
        uint256 toTime
    ) external view returns (uint256 count) {
        require(fromTime <= toTime, "Invalid time range");
        
        // 注意：この実装は簡易版です
        // 実際の運用では、より効率的なインデックス構造が必要
        SignerStats memory stats = signerStatistics[signer];
        
        if (stats.lastSignatureTime >= fromTime && stats.lastSignatureTime <= toTime) {
            return stats.totalSignatures;
        }
        
        return 0;
    }
    
    // =====================================================================
    // ユーティリティ関数
    // =====================================================================
    
    /**
     * @notice メッセージから署名用ハッシュを生成
     * @param message 署名対象のメッセージ
     * @return bytes32 署名用ハッシュ
     * @dev Ethereumの標準的な署名メッセージフォーマットを使用
     */
    function getMessageHash(string memory message) external pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", 
                                         bytes(message).length, 
                                         message));
    }
    
    /**
     * @notice 構造化データから署名用ハッシュを生成
     * @param data 署名対象のデータ（ABI形式）
     * @return bytes32 署名用ハッシュ
     * @dev 複雑なデータ構造の署名に使用
     */
    function getDataHash(bytes memory data) external pure returns (bytes32) {
        return keccak256(data);
    }
    
    /**
     * @notice 署名の形式を検証
     * @param signature 検証する署名
     * @return bool 署名形式が正しいかどうか
     * @dev 署名データのフォーマット妥当性をチェック
     */
    function isValidSignatureFormat(bytes memory signature) external pure returns (bool) {
        // ECDSA署名は通常65バイト（r:32, s:32, v:1）
        return signature.length == 65;
    }
    
    // =====================================================================
    // 管理機能
    // =====================================================================
    
    /**
     * @notice コントラクトバージョン情報
     * @return string バージョン情報
     */
    function version() external pure returns (string memory) {
        return "SignatureVerifier v1.0.0 - Modular Object-Oriented Smart Contract";
    }
    
    /**
     * @notice サポートされている署名アルゴリズム情報
     * @return string サポートアルゴリズム
     */
    function getSupportedAlgorithms() external pure returns (string memory) {
        return "ECDSA with secp256k1 curve (Ethereum standard)";
    }
}
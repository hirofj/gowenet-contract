// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Counters.sol";
import "./FreelanceContract.sol";


/**
 * @title FreelanceContractFactory - Factory パターン実装
 * @notice 汎用化されたモジュールを組み合わせて動的に契約を作成
 */
contract FreelanceContractFactory is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // 契約IDカウンター
    Counters.Counter private _contractIdCounter;
    
    // 汎用モジュールアドレス
    address public contractBaseModule;
    address public paymentFlowModule;
    address public signatureVerifierModule;
    address public stakingContractModule; // ★この行を追加
    
    // 契約管理
    mapping(uint256 => address) public contracts;
    mapping(address => uint256[]) public clientContracts;
    mapping(address => uint256[]) public freelancerContracts;
    
    // Factory設定
    uint256 public creationFee;
    address public feeRecipient;
    
    // 統計情報
    uint256 public totalContractsCreated;
    uint256 public totalContractValue;
    
    // イベント
    event ContractCreated(
        uint256 indexed contractId,
        address indexed contractAddress,
        address indexed client,
        address freelancer,
        uint256 amount,
        uint256 timestamp
    );
    
    event ModulesRegistered(
        address contractBase,
        address paymentFlow,
        address signatureVerifier,
        uint256 timestamp
    );
    
    // 修飾子
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }
    
    /**
     * @notice Factory初期化
     * @param _creationFee 契約作成手数料
     */
    constructor(uint256 _creationFee) Ownable(msg.sender) {
        creationFee = _creationFee;
        feeRecipient = msg.sender;
        totalContractsCreated = 0;
        totalContractValue = 0;
    }
    
    /**
     * @notice 汎用モジュール一括登録
     */
    function registerModules(
        address _contractBase,
        address _paymentFlow,
        address _signatureVerifier
    ) external onlyOwner {
        require(_contractBase != address(0), "Invalid ContractBase");
        require(_paymentFlow != address(0), "Invalid PaymentFlow");
        require(_signatureVerifier != address(0), "Invalid SignatureVerifier");
        
        contractBaseModule = _contractBase;
        paymentFlowModule = _paymentFlow;
        signatureVerifierModule = _signatureVerifier;
        
        emit ModulesRegistered(_contractBase, _paymentFlow, _signatureVerifier, block.timestamp);
    }
    
    // オーナーだけがStakingContractのアドレスを設定できる関数
    function setStakingModule(address _stakingModule) external onlyOwner {
        require(_stakingModule != address(0), "Invalid StakingModule");
        stakingContractModule = _stakingModule;
    }

    // 情報取得関数
    function getContractCount() external view returns (uint256) {
        return _contractIdCounter.current();
    }
    
    function getRegisteredModules() external view returns (
        address _contractBase,
        address _paymentFlow,
        address _signatureVerifier
    ) {
        return (contractBaseModule, paymentFlowModule, signatureVerifierModule);
    }
    
    function version() external pure returns (string memory) {
        return "FreelanceContractFactory v1.0.0 - Generic Module Reference Type";
    }

    /**
    * @notice 新しい契約インスタンス作成（軽量版）
    */
    function createContract(
        address client,
        address freelancer,
        uint256 amount,
        string memory description
    ) 
        external 
        payable 
        nonReentrant 
        validAddress(client)
        validAddress(freelancer)
        returns (address contractAddress) 
    {
        // ★ StakingContractが設定されているかチェックするrequireを追加
        require(stakingContractModule != address(0), "StakingModule not registered");
        require(contractBaseModule != address(0), "Modules not registered");
        require(paymentFlowModule != address(0), "PaymentFlow not registered");
        require(signatureVerifierModule != address(0), "SignatureVerifier not registered");
        require(client != freelancer, "Client and freelancer must be different");
        require(amount > 0, "Amount must be greater than zero");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(msg.value >= creationFee, "Insufficient creation fee");
        
        // 契約ID生成
        _contractIdCounter.increment();
        uint256 newContractId = _contractIdCounter.current();
        
        // 🚀 実際のFreelanceContractインスタンス生成
        // ★ 引数にstakingContractModuleを追加
        FreelanceContract newContract = new FreelanceContract(
            contractBaseModule,
            paymentFlowModule,
            signatureVerifierModule,
            stakingContractModule, // ★StakingContractのアドレスを渡す
            amount,
            description,
            client,
            freelancer
        );
        contractAddress = address(newContract);

        // --- ▼ ここから自動認可処理を追加 ▼ ---    
        // 1. ContractBaseに新しい契約を認可させる
        IContractBase(contractBaseModule).authorizeContract(contractAddress, true);
        
        // 2. PaymentFlowにも新しい契約を認可させる (次のステップで必ず必要になります)
        IPaymentFlow(paymentFlowModule).authorizeContract(contractAddress, true);

        // Factory内での管理
        contracts[newContractId] = contractAddress;
        clientContracts[client].push(newContractId);
        freelancerContracts[freelancer].push(newContractId);
        
        // 統計更新
        totalContractsCreated++;
        totalContractValue += amount;
        
        // 手数料処理
        if (creationFee > 0) {
            payable(feeRecipient).transfer(creationFee);
        }
        if (msg.value > creationFee) {
            payable(msg.sender).transfer(msg.value - creationFee);
        }
        
        emit ContractCreated(newContractId, contractAddress, client, freelancer, amount, block.timestamp);
        
        return contractAddress;
    }
}
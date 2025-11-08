// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ContractBase is Ownable {

    enum State { Created, InProgress, Delivered, Disputed, Paid, Completed }

    mapping(address => bool) public authorizedContracts;
    
    // 契約毎の状態管理
    mapping(address => State) public contractStates;
    mapping(address => uint256) public contractCreatedAt;
    mapping(address => uint256) public contractLastUpdated;
    mapping(address => uint256) public contractStateChangeCount;

    event StateChanged(State oldState, State newState, address indexed changedBy, uint256 timestamp);
    event ContractUpdated(uint256 timestamp, address indexed changedBy);
    event ContractAuthorized(address indexed contractAddr, bool isAuthorized);

    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier validState(uint8 newStateValue) {
        require(newStateValue <= uint8(State.Completed), "Invalid state value");
        _;
    }

    constructor() Ownable(msg.sender) {
        // グローバル初期化は不要（契約作成時に個別初期化）
    }

    function authorizeContract(address contractAddr, bool authorized) external onlyOwner {
        authorizedContracts[contractAddr] = authorized;
        emit ContractAuthorized(contractAddr, authorized);
    }

    function changeState(uint8 newStateValue) 
        external 
        onlyAuthorizedContract 
        validState(newStateValue)
    {
        address contractAddr = msg.sender;
        
        // 契約が初回呼び出しの場合は初期化
        if (contractCreatedAt[contractAddr] == 0) {
            contractStates[contractAddr] = State.Created;
            contractCreatedAt[contractAddr] = block.timestamp;
            contractLastUpdated[contractAddr] = block.timestamp;
            contractStateChangeCount[contractAddr] = 0;
        }
        
        State oldState = contractStates[contractAddr];
        State newState = State(newStateValue);
        
        require(oldState != newState, "State is already set to this value");
        // For this MVP, we remove complex transition validation
        
        contractStates[contractAddr] = newState;
        contractLastUpdated[contractAddr] = block.timestamp;
        contractStateChangeCount[contractAddr]++;
        
        emit StateChanged(oldState, newState, contractAddr, block.timestamp);
        emit ContractUpdated(block.timestamp, contractAddr);
    }

    function getState() external view returns (uint8) {
        address contractAddr = msg.sender;
        
        // 初期化されていない契約は Created を返す
        if (contractCreatedAt[contractAddr] == 0) {
            return uint8(State.Created);
        }
        
        return uint8(contractStates[contractAddr]);
    }

    function isContractAuthorized(address contractAddr) external view returns (bool) {
        return authorizedContracts[contractAddr];
    }
    
    // For FreelanceContract to get creation timestamp
    function getContractInfo() external view returns (address, address, uint256, uint256, uint8, uint256) {
        address contractAddr = msg.sender;
        
        // 初期化されていない契約はデフォルト値を返す
        if (contractCreatedAt[contractAddr] == 0) {
            return (address(0), address(0), 0, block.timestamp, uint8(State.Created), 0);
        }
        
        return (
            address(0), 
            address(0), 
            0, 
            contractCreatedAt[contractAddr], 
            uint8(contractStates[contractAddr]), 
            contractStateChangeCount[contractAddr]
        );
    }
    
    // 特定契約の状態を外部から確認する関数
    function getContractState(address contractAddr) external view returns (uint8) {
        if (contractCreatedAt[contractAddr] == 0) {
            return uint8(State.Created);
        }
        return uint8(contractStates[contractAddr]);
    }

    // 特定契約の詳細情報を取得
    function getContractDetails(address contractAddr) external view returns (
        uint8 state,
        uint256 createdAt,
        uint256 lastUpdated,
        uint256 stateChangeCount
    ) {
        if (contractCreatedAt[contractAddr] == 0) {
            return (uint8(State.Created), block.timestamp, block.timestamp, 0);
        }
        
        return (
            uint8(contractStates[contractAddr]),
            contractCreatedAt[contractAddr],
            contractLastUpdated[contractAddr],
            contractStateChangeCount[contractAddr]
        );
    }
}


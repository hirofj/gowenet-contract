// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ContractBase is Ownable {

    enum State { Created, InProgress, Delivered, Disputed, Paid, Completed }
    State public state;

    mapping(address => bool) public authorizedContracts;
    uint256 public createdAt;
    uint256 public lastUpdated;
    uint256 public stateChangeCount;

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
        state = State.Created;
        createdAt = block.timestamp;
        lastUpdated = block.timestamp;
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
        State oldState = state;
        State newState = State(newStateValue);
        
        require(oldState != newState, "State is already set to this value");
        // For this MVP, we remove complex transition validation
        
        state = newState;
        lastUpdated = block.timestamp;
        stateChangeCount++;
        
        // ★★★ changedBy を msg.sender に修正 ★★★
        emit StateChanged(oldState, newState, msg.sender, block.timestamp);
        emit ContractUpdated(block.timestamp, msg.sender);
    }

    function getState() external view returns (uint8) {
        return uint8(state);
    }

    function isContractAuthorized(address contractAddr) external view returns (bool) {
        return authorizedContracts[contractAddr];
    }
    
    // For FreelanceContract to get creation timestamp
    function getContractInfo() external view returns (address, address, uint256, uint256, uint8, uint256) {
        // This is a mock-up for compatibility. In a real scenario, party info would be stored here.
        return (address(0), address(0), 0, createdAt, uint8(state), 0);
    }
}
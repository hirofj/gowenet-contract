// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ValidatorIncentives {
    address public owner;
    mapping(address => bool) public isValidator;
    address[] public validatorList;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // オーナーがバリデータを登録する
    function addValidator(address _validator) external onlyOwner {
        require(!isValidator[_validator], "Already a validator");
        isValidator[_validator] = true;
        validatorList.push(_validator);
    }

    // オーナーが報酬を手動で分配する
    function distributeRewards() external payable onlyOwner {
        require(validatorList.length > 0, "No validators registered");
        uint256 amount = msg.value / validatorList.length;
        for (uint i = 0; i < validatorList.length; i++) {
            payable(validatorList[i]).transfer(amount);
        }
    }
}
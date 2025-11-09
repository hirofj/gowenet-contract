# GOWENET Smart Contract System

🌐 **Avalanche L1 Subnet-based Decentralized Contract Management System**

A modular, object-oriented smart contract system for managing freelance contracts, payments, and contributor rewards on the GOWENET blockchain.

---

## 📋 Architecture Overview

### **Deployed Contracts (OOP Architecture)**

| Contract | Address | Purpose |
|----------|---------|---------|
| **SignatureVerifier** | `0xc364680CbdCC27d230C50a1E3A3Fb7011b40D194` | ECDSA signature verification |
| **ContractBase** | `0x7aDf40aA105D050AcB8CE2B2Ad09b24D0fb7e7d9` | Contract state management |
| **StakingContract** | `0x9B19224dcf90Ea72A80eB41eB376A9503C4D0E57` | GOWE token staking & rewards |
| **PaymentFlow** | `0x4B983C6094171aFA25a0A964354aa11da73aFd40` | Escrow & payment processing |
| **FreelanceContractFactory** | `0x81652419788AcfF4EcDadd0Fd885eaE30127eA4D` | Dynamic contract creation |

**Network:** GOWENET (Chain ID: 98888)  
**RPC Endpoint:** `http://192.168.3.86:9654/ext/bc/2tGwFCjwr3w6fW774ytz982h5Th9eiALrKFanmBKZjxQSqTBxW/rpc`  
**Deployment Date:** 2025-11-08

---

## 🚀 Quick Start

### **Prerequisites**
```bash
node >= 18.0.0
npm >= 9.0.0
```

### **Installation**
```bash
npm install
```

### **Environment Setup**
Create `.env` file:
```env
PRIVATE_KEY_DEPLOYER=your_deployer_private_key
PRIVATE_KEY_USER1=your_user1_private_key
PRIVATE_KEY_USER2=your_user2_private_key
```

---

## 📦 Contract Deployment

### **Deploy OOP Architecture**
```bash
npx hardhat run scripts/freelance-contract-deploy.js --network gowenet
```

### **Deploy Monolithic Version (for comparison)**
```bash
npx hardhat run scripts/freelance-contract-mono-deploy.js --network gowenet
```

**Output:** Deployment info saved to `deployment-info-oop.json`

---

## 🧪 Testing & Load Testing

### **Run Contract Test (OOP)**
```bash
# Single contract test
npx hardhat run scripts/freelance-contract-test.js --network gowenet

# Load test with 30 contracts
LOAD_TEST_COUNT=30 npx hardhat run scripts/freelance-contract-test.js --network gowenet

# 1-hour load test (300 contracts, ~59 minutes)
LOAD_TEST_COUNT=300 npx hardhat run scripts/freelance-contract-test.js --network gowenet
```

### **Run Monolithic Test (for comparison)**
```bash
npx hardhat run scripts/freelance-contract-mono-test.js --network gowenet
```

**Test Workflow:**
1. Create freelance contract via Factory
2. Authenticate parties (client & freelancer)
3. Deliver work with signature
4. Approve deliverable
5. Execute payment (1 GOWE)
6. Complete contract

---

## 📊 Performance Metrics

### **Load Test Results (30 contracts)**

| Metric | Value |
|--------|-------|
| **Success Rate** | 100% (30/30) |
| **Avg Execution Time** | 11.8 seconds/contract |
| **Total Gas Used** | 117,876,669 |
| **Avg Gas per Contract** | 3,929,222 |
| **Payment per Contract** | 1 GOWE |

### **Gas Usage by Operation**

| Operation | Gas Limit | Avg Gas Used |
|-----------|-----------|--------------|
| `createContract` | 5,000,000 | 3,161,368 |
| `authenticate` | 500,000 | 149,699 |
| `deliverWork` | 1,000,000 | 161,983 |
| `approveDeliverable` | 500,000 | 65,615 |
| `makeDirectPayment` | 800,000 | 308,348 |
| `completeContract` | 600,000 | 82,208 |

**Note:** Explicit gas limits required for reliable execution on Hardhat + GOWENET.

---

## 🔧 Contract Modules

### **1. ContractBase.sol**
State management for contract lifecycle.

**States:**
- `Created` → `InProgress` → `Delivered` → `Disputed` / `Paid` → `Completed`

**Key Functions:**
- `setState(State _newState)` - Update contract state
- `authorizeContract(address _contract)` - Grant permissions

---

### **2. FreelanceContract.sol**
Main contract logic for freelance agreements.

**Key Features:**
- Party authentication (client/freelancer)
- Work delivery with signature verification
- Milestone tracking
- Rating system (1-5 stars)

**Key Functions:**
- `authenticate()` - Authenticate contract parties
- `deliverWork(string calldata _deliverable, bytes calldata _signature)` - Submit work
- `approveDeliverable()` - Client approves work
- `completeContract()` - Finalize contract

---

### **3. PaymentFlow.sol**
Payment processing with escrow support.

**Payment Types:**
- `OneTime` - Direct one-time payment
- `Installment` - Multi-stage payments
- `Conditional` - Condition-based release
- `Escrow` - Trustless escrow holding

**Key Functions:**
- `makeDirectPayment(address _to, string calldata _description)` - Direct payment
- `depositEscrow(address _beneficiary)` - Deposit to escrow
- `releaseEscrow(bytes32 _escrowId)` - Release escrow funds

---

### **4. SignatureVerifier.sol**
ECDSA signature verification for secure operations.

**Key Functions:**
- `verifySignature(address _signer, bytes32 _messageHash, bytes calldata _signature)` - Verify signature
- `getMessageHash(string calldata _message)` - Generate message hash
- `getEthSignedMessageHash(bytes32 _messageHash)` - Apply Ethereum prefix

---

### **5. StakingContract.sol**
GOWE token staking and contribution scoring.

**Key Functions:**
- `stake()` - Stake GOWE tokens
- `unstake(uint256 _amount)` - Withdraw staked tokens
- `recordContribution(address _contributor, uint256 _score)` - Record contribution

---

### **6. FreelanceContractFactory.sol**
Dynamic contract instance creation using Factory pattern.

**Key Functions:**
- `createContract(address _partyA, address _partyB, uint256 _paymentAmount, string calldata _workDescription)` - Create new contract instance
- `getContractCount()` - Get total created contracts
- `getContractsByParty(address _party)` - Get contracts by participant

---

## 📁 Project Structure

```
gowenet-contract/
├── contracts/
│   ├── ContractBase.sol
│   ├── FreelanceContract.sol
│   ├── FreelanceContractFactory.sol
│   ├── FreelanceContractMonolithic.sol
│   ├── PaymentFlow.sol
│   ├── SignatureVerifier.sol
│   ├── StakingContract.sol
│   └── ValidatorIncentives.sol
├── scripts/
│   ├── freelance-contract-deploy.js      # Deploy OOP contracts
│   ├── freelance-contract-test.js        # Test OOP contracts
│   ├── freelance-contract-mono-deploy.js # Deploy monolithic version
│   └── freelance-contract-mono-test.js   # Test monolithic version
├── hardhat.config.js
├── package.json
└── README.md
```

---

## 🌐 Network Configuration

**GOWENET Blockchain:**
- **Chain ID:** 98888
- **Currency:** GOWE
- **RPC URL:** `http://192.168.3.86:9654/ext/bc/2tGwFCjwr3w6fW774ytz982h5Th9eiALrKFanmBKZjxQSqTBxW/rpc`
- **Block Time:** ~2 seconds
- **Consensus:** Proof of Stake (4 validators)

**Test Accounts:**
- **Deployer:** `0x8464d8E79A31C20bf8f909EF0Ab334744Ed6C2eA`
- **Client (User1):** `0x9740cfc1A67B5B3A5C0eA6Eea04C10923F435c9d`
- **Freelancer (User2):** `0x3BE34ca51D35094De7549731e3385A04d3cF2Fe6`

---

## 🔍 Known Issues & Solutions

### **Issue: `deliverWork` Reverts During Tests**
**Solution:** Added explicit gas limits to all transaction calls in test scripts. Gas estimation is unreliable for external contract calls in Hardhat environment.

### **Issue: Signature Verification Always Returns `true`**
**Status:** Under investigation. SignatureVerifier unit tests pass, but integration may need adjustment.

---

## 📝 License

MIT License

---

## 👥 Contributors

Developed for GOWENET research project - Avalanche L1 Subnet-based decentralized governance and contract system.


---

## 🔬 Architecture Comparison: OOP vs Monolithic

### **Load Test Results (30 contracts)**

| Metric | OOP (Factory) | Monolithic | Difference |
|--------|---------------|------------|------------|
| **Success Rate** | 100% (30/30) | 100% (30/30) | ✅ Same |
| **Avg Time per Contract** | 11.8s | 11.95s | +1.3% slower |
| **Total Gas Used** | 117,876,669 | 72,483,126 | **-38.5% 🎯** |
| **Avg Gas per Contract** | 3,929,222 | 2,416,104 | **-38.5% 🎯** |

### **Gas Usage by Operation**

| Operation | OOP | Monolithic | Savings |
|-----------|-----|------------|---------|
| `createContract/deploy` | 3,161,368 | 1,908,820 | **-39.6%** |
| `authenticate` | 149,699 | 100,848 | **-32.6%** |
| `deliverWork` | 161,983 | 143,017 | **-11.7%** |
| `approveDeliverable` | 65,615 | 57,836 | **-11.9%** |
| `makeDirectPayment` | 308,348 | 108,365 | **-64.9%** ⚡ |
| `completeContract` | 82,208 | 97,217 | +18.3% |

### **Trade-offs**

**OOP Architecture Advantages:**
- ✅ **Modularity**: Independent, reusable contracts (PaymentFlow, SignatureVerifier, etc.)
- ✅ **Maintainability**: Isolated functionality, easier debugging
- ✅ **Extensibility**: Add new features without affecting existing code
- ✅ **Reusability**: Components can be used in other projects

**Monolithic Architecture Advantages:**
- ✅ **Gas Efficiency**: 38.5% less gas per contract (~1.5 GOWE savings)
- ✅ **Simplicity**: Single contract, easier deployment
- ✅ **Lower Complexity**: No inter-contract communication overhead
- ✅ **Atomic Operations**: All state in one contract

### **Recommendation**

- **Use OOP** for production systems requiring flexibility, long-term maintenance, and multiple teams
- **Use Monolithic** for cost-sensitive applications, prototypes, or simple use cases

---


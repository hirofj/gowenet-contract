// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NativeStakingContract
 * @notice ユーザーがネイティブトークン（GOWE）をステークし、報酬を得るためのコントラクト
 * @dev ERC20トークン不要のシンプルな構成
 */
contract StakingContract is Ownable, ReentrancyGuard {

    // --- 状態変数 ---

    uint256 public totalStaked;
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public lastStakeTime;
    uint256 public rewardRate; // 1 staked tokenあたり、1秒で何weiの報酬がもらえるか
    mapping(address => uint256) public rewards;

    // ★★★★★【変更点①】貢献度スコアの変数を追加 ★★★★★
    mapping(address => uint256) public contributionScore;

    // --- イベント ---

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardRateChanged(uint256 oldRate, uint256 newRate);
    // ★★★★★ 貢献度スコア更新イベント（任意） ★★★★★
    event ContributionAdded(address indexed user, uint256 scoreAdded);

    // --- コンストラクタ ---
    /* （保留中の報酬額） = 経過時間（秒） × ユーザーのステーク量 × rewardRate ÷ 10^18
     * 例えば、「1 GOWE（1e18 wei）を100秒間ステークして、0.1 GOWEの報酬」
     * がもらえるように設定したい場合、rewardRateは以下のようになります。
     *  rewardRate = 0.1 GOWE / 100秒 = 0.001 GOWE/秒
     * これをスケーリングした値（weiベース）にすると 1000000000000000（10の15乗）となります。
     * ですので、テストをスムーズに進めるための最初の推奨値としては、
     * 1000000000000000が分かりやすく、適度な速さで報酬が溜まるのでお勧めです。
    */
    constructor(uint256 _initialRewardRate) Ownable(msg.sender) {
        rewardRate = _initialRewardRate; //入力例 1000000000000000
    }

    // ★★★★★【変更点②】貢献度を加算する関数を新規作成 ★★★★★
    /**
     * @notice 契約完了時にFreelanceContractから呼び出され、貢献度スコアを加算する
     * @param user スコアを加算するユーザーのアドレス
     * @param duration 完了した契約の期間（秒単位）
     * @dev PoCの段階では、呼び出し元の制限は実装せずシンプルにする
     */
    function addContribution(address user, uint256 duration) external {
        // 詳細設計書の思想に基づき、契約期間そのものをスコアとして加算する
        // 例：契約期間1日あたり1ポイント加算 → durationを日数に換算して加算
        contributionScore[user] = contributionScore[user] + (duration);
        emit ContributionAdded(user, duration);
    }


    // --- 外部関数 (ユーザー向け) ---

    /**
     * @notice ネイティブトークンをステークする。トランザクションに含めた量がステークされる。
     */
    function stake() external payable nonReentrant {
        require(msg.value > 0, "Cannot stake 0");

        _updateReward(msg.sender);

        stakedBalance[msg.sender] = stakedBalance[msg.sender] + (msg.value);
        totalStaked = totalStaked + (msg.value);

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @notice 指定した量のステークを解除する
     * @param _amount 解除する量 (wei単位)
     */
    function unstake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot unstake 0");
        require(stakedBalance[msg.sender] >= _amount, "Insufficient staked balance");

        _updateReward(msg.sender);

        stakedBalance[msg.sender] = stakedBalance[msg.sender] - (_amount);
        totalStaked = totalStaked - (_amount);

        // ネイティブトークンをユーザーに返却
        payable(msg.sender).transfer(_amount);

        emit Unstaked(msg.sender, _amount);
    }

    /**
     * @notice 溜まった報酬を請求する
     */
    function claimReward() external nonReentrant {
        _updateReward(msg.sender);

        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            // 報酬をユーザーに送金
            require(address(this).balance >= reward, "Insufficient contract balance for reward");
            payable(msg.sender).transfer(reward);
            emit RewardClaimed(msg.sender, reward);
        }
    }

    // --- 内部関数とビュー関数 (変更なし) ---

    function _updateReward(address _user) internal {
        if (lastStakeTime[_user] > 0) {
            uint256 pendingReward = calculateReward(_user);
            rewards[_user] = rewards[_user] + (pendingReward);
        }
        lastStakeTime[_user] = block.timestamp;
    }

    function calculateReward(address _user) public view returns (uint256) {
        if (stakedBalance[_user] == 0) {
            return rewards[_user];
        }
        uint256 timeElapsed = block.timestamp - (lastStakeTime[_user]);
        uint256 pending = timeElapsed * (stakedBalance[_user]) * (rewardRate) / (1e18);
        return rewards[_user] + (pending);
    }

    // --- 管理者用関数 (変更なし) ---

    function setRewardRate(uint256 _newRate) external onlyOwner {
        uint256 oldRate = rewardRate;
        rewardRate = _newRate;
        emit RewardRateChanged(oldRate, _newRate);
    }
}
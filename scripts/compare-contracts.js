const hre = require("hardhat");

async function main() {
    const oldContract = "0x4C127fC88d560601c6E6b4E218418c7A384979ED"; // 成功した契約
    const newContract = "0x0eFb00c025e2c434A337209C72e263084C7bB1a1"; // 失敗した契約
    
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("🔍 契約の比較分析\n");
    
    // 古い契約
    console.log("✅ 成功した契約:", oldContract);
    try {
        const oldFC = await hre.ethers.getContractAt("FreelanceContract", oldContract);
        const oldState = await oldFC.getState();
        const oldPartyA = await oldFC.partyA();
        const oldPartyB = await oldFC.partyB();
        const oldWorkStatus = await oldFC.workStatus();
        
        console.log("   状態:", oldState.toString());
        console.log("   PartyA:", oldPartyA);
        console.log("   PartyB:", oldPartyB);
        console.log("   WorkStatus:", oldWorkStatus.toString());
        
        // deliverWorkのテスト
        console.log("\n   📦 deliverWorkテスト:");
        try {
            const code = await hre.ethers.provider.getCode(oldContract);
            console.log(`   バイトコードサイズ: ${code.length / 2 - 1} bytes`);
            
            // 既に状態が2なので再実行はできないが、関数の存在は確認できる
            const hasFunction = oldFC.interface.hasFunction("deliverWork");
            console.log(`   deliverWork関数存在: ${hasFunction}`);
        } catch (e) {
            console.log(`   ⚠️ ${e.message}`);
        }
    } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
    }
    
    // 新しい契約
    console.log("\n❌ 失敗した契約:", newContract);
    try {
        const newFC = await hre.ethers.getContractAt("FreelanceContract", newContract);
        const newState = await newFC.getState();
        const newPartyA = await newFC.partyA();
        const newPartyB = await newFC.partyB();
        const newWorkStatus = await newFC.workStatus();
        
        console.log("   状態:", newState.toString());
        console.log("   PartyA:", newPartyA);
        console.log("   PartyB:", newPartyB);
        console.log("   WorkStatus:", newWorkStatus.toString());
        
        console.log("\n   📦 deliverWorkテスト:");
        try {
            const code = await hre.ethers.provider.getCode(newContract);
            console.log(`   バイトコードサイズ: ${code.length / 2 - 1} bytes`);
            
            const hasFunction = newFC.interface.hasFunction("deliverWork");
            console.log(`   deliverWork関数存在: ${hasFunction}`);
            
            // 実際に実行
            console.log("\n   🚀 実行テスト:");
            const tx = await newFC.connect(user2).deliverWork(
                "https://test.com/deliverable",
                "0x"
            );
            const receipt = await tx.wait();
            console.log(`   ✅ 成功! Gas: ${receipt.gasUsed.toString()}`);
            
        } catch (e) {
            console.log(`   ❌ 失敗: ${e.message}`);
            
            // さらに詳細な診断
            console.log("\n   🔍 詳細診断:");
            console.log(`   PartyB一致: ${newPartyB.toLowerCase() === user2.address.toLowerCase()}`);
            console.log(`   状態チェック: ${newState.toString()} === 1 ? ${newState.toString() === "1"}`);
        }
    } catch (error) {
        console.log(`   ❌ エラー: ${error.message}`);
    }
    
    // バイトコードの比較
    console.log("\n📊 バイトコード比較:");
    const oldCode = await hre.ethers.provider.getCode(oldContract);
    const newCode = await hre.ethers.provider.getCode(newContract);
    
    console.log(`   成功した契約: ${oldCode.length / 2 - 1} bytes`);
    console.log(`   失敗した契約: ${newCode.length / 2 - 1} bytes`);
    console.log(`   同一バイトコード: ${oldCode === newCode}`);
    
    if (oldCode !== newCode) {
        console.log("\n   ⚠️ バイトコードが異なります！");
        console.log("   これは異なるコントラクトコードがデプロイされていることを意味します。");
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

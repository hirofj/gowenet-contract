#!/bin/bash

# 負荷テスト設定
CONTRACT_COUNT=${1:-10}           # 第1引数: 契約数 (デフォルト: 10)
DELAY_BETWEEN=${2:-1}              # 第2引数: 契約間の待機秒数 (デフォルト: 1)
OUTPUT_DIR="load-test-results"

# 結果ディレクトリ作成
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="$OUTPUT_DIR/load-test-$TIMESTAMP.json"
LOG_FILE="$OUTPUT_DIR/load-test-$TIMESTAMP.log"

echo "============================================================" | tee "$LOG_FILE"
echo "🔥 オブジェクト指向型アーキテクチャ 負荷テスト" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📋 テスト設定:" | tee -a "$LOG_FILE"
echo "   契約数: $CONTRACT_COUNT" | tee -a "$LOG_FILE"
echo "   契約間待機: ${DELAY_BETWEEN}秒" | tee -a "$LOG_FILE"
echo "   結果ファイル: $RESULT_FILE" | tee -a "$LOG_FILE"
echo "   ログファイル: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 統計変数
SUCCESSFUL=0
FAILED=0
TOTAL_GAS=0
START_TIME=$(date +%s)

# JSON結果配列
echo "[" > "$RESULT_FILE"

echo "🚀 負荷テスト開始..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

for i in $(seq 1 $CONTRACT_COUNT); do
    echo "[$i/$CONTRACT_COUNT] 契約実行中..." | tee -a "$LOG_FILE"
    
    # Hardhatスクリプト実行
    RESULT=$(npx hardhat run scripts/single-contract-lifecycle.js --network gowenet 2>&1 | tail -1)
    
    # JSON結果を解析
    if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
        SUCCESS=$(echo "$RESULT" | jq -r '.success')
        CONTRACT_ADDR=$(echo "$RESULT" | jq -r '.contractAddress')
        GAS=$(echo "$RESULT" | jq -r '.totalGas')
        DURATION=$(echo "$RESULT" | jq -r '.duration')
        
        if [ "$SUCCESS" = "true" ]; then
            SUCCESSFUL=$((SUCCESSFUL + 1))
            TOTAL_GAS=$((TOTAL_GAS + GAS))
            echo "  ✅ 成功: $CONTRACT_ADDR (Gas: $GAS, Duration: ${DURATION}ms)" | tee -a "$LOG_FILE"
        else
            FAILED=$((FAILED + 1))
            ERRORS=$(echo "$RESULT" | jq -r '.errors[]' 2>/dev/null || echo "Unknown error")
            echo "  ❌ 失敗: $ERRORS" | tee -a "$LOG_FILE"
        fi
        
        # JSON結果に追加
        if [ $i -eq 1 ]; then
            echo "$RESULT" >> "$RESULT_FILE"
        else
            echo ",$RESULT" >> "$RESULT_FILE"
        fi
    else
        FAILED=$((FAILED + 1))
        echo "  ❌ 失敗: スクリプトエラー" | tee -a "$LOG_FILE"
        echo "{\"success\":false,\"errors\":[\"Script execution failed\"]}" >> "$RESULT_FILE"
    fi
    
    # 契約間の待機（最後の契約では待たない）
    if [ $i -lt $CONTRACT_COUNT ]; then
        sleep $DELAY_BETWEEN
    fi
done

echo "]" >> "$RESULT_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 結果サマリー
echo "" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "📊 負荷テスト結果サマリー" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "⏱️  実行時間: ${DURATION}秒" | tee -a "$LOG_FILE"
echo "📈 総契約数: $CONTRACT_COUNT" | tee -a "$LOG_FILE"
echo "✅ 成功: $SUCCESSFUL ($(echo "scale=1; $SUCCESSFUL * 100 / $CONTRACT_COUNT" | bc)%)" | tee -a "$LOG_FILE"
echo "❌ 失敗: $FAILED ($(echo "scale=1; $FAILED * 100 / $CONTRACT_COUNT" | bc)%)" | tee -a "$LOG_FILE"

if [ $SUCCESSFUL -gt 0 ]; then
    AVG_GAS=$((TOTAL_GAS / SUCCESSFUL))
    echo "⛽ 平均Gas: $AVG_GAS" | tee -a "$LOG_FILE"
    echo "⛽ 総Gas: $TOTAL_GAS" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "💾 詳細結果: $RESULT_FILE" | tee -a "$LOG_FILE"
echo "📄 ログファイル: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "🎯 負荷テスト完了!" | tee -a "$LOG_FILE"

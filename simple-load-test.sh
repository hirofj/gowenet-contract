#!/bin/bash

COUNT=${1:-10}
DELAY=${2:-1}

# タイムスタンプ生成
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="load-test-results/simple-test-${TIMESTAMP}.log"
JSON_FILE="load-test-results/simple-test-${TIMESTAMP}.json"

# load-test-resultsディレクトリを作成（存在しない場合）
mkdir -p load-test-results

# ログファイルとJSONファイルの初期化
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "🔥 簡易負荷テスト (create + authenticate)"
echo "契約数: $COUNT"
echo "待機時間: ${DELAY}秒"
echo "開始時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

SUCCESS=0
FAILED=0
TOTAL_GAS=0
START_TIME=$(date +%s)

# 詳細結果を保存する配列（JSON用）
CONTRACTS_JSON="["

for i in $(seq 1 $COUNT); do
    echo -n "[$i/$COUNT] "
    RESULT=$(npx hardhat run scripts/create-and-authenticate.js --network gowenet 2>&1 | tail -1)
    
    if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
        if [ "$(echo "$RESULT" | jq -r '.success')" = "true" ]; then
            ADDR=$(echo "$RESULT" | jq -r '.contractAddress')
            GAS=$(echo "$RESULT" | jq -r '.totalGas')
            SUCCESS=$((SUCCESS + 1))
            TOTAL_GAS=$((TOTAL_GAS + GAS))
            echo "✅ $ADDR (Gas: $GAS)"
            
            # JSON用にデータを追加
            [ $i -gt 1 ] && CONTRACTS_JSON+=","
            CONTRACTS_JSON+="{\"index\":$i,\"address\":\"$ADDR\",\"gas\":$GAS,\"status\":\"success\"}"
        else
            FAILED=$((FAILED + 1))
            echo "❌ 失敗"
            
            [ $i -gt 1 ] && CONTRACTS_JSON+=","
            CONTRACTS_JSON+="{\"index\":$i,\"status\":\"failed\"}"
        fi
    else
        FAILED=$((FAILED + 1))
        echo "❌ エラー"
        
        [ $i -gt 1 ] && CONTRACTS_JSON+=","
        CONTRACTS_JSON+="{\"index\":$i,\"status\":\"error\"}"
    fi
    
    [ $i -lt $COUNT ] && sleep $DELAY
done

CONTRACTS_JSON+="]"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "============================================================"
echo "📊 結果サマリー"
echo "============================================================"
echo "終了時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "実行時間: ${DURATION}秒"
echo "成功: $SUCCESS/$COUNT ($(echo "scale=1; $SUCCESS * 100 / $COUNT" | bc)%)"
echo "失敗: $FAILED/$COUNT"
if [ $SUCCESS -gt 0 ]; then
    AVG_GAS=$((TOTAL_GAS / SUCCESS))
    echo "平均Gas: $AVG_GAS"
    echo "総Gas: $TOTAL_GAS"
fi
echo ""
echo "📄 ログファイル: $LOG_FILE"
echo "📊 JSONファイル: $JSON_FILE"

# JSON形式で結果を保存
cat > "$JSON_FILE" << JSON_EOF
{
  "test_type": "simple-load-test",
  "timestamp": "$TIMESTAMP",
  "start_time": "$(date -d @$START_TIME '+%Y-%m-%d %H:%M:%S')",
  "end_time": "$(date -d @$END_TIME '+%Y-%m-%d %H:%M:%S')",
  "duration_seconds": $DURATION,
  "config": {
    "contract_count": $COUNT,
    "delay_seconds": $DELAY
  },
  "results": {
    "total": $COUNT,
    "successful": $SUCCESS,
    "failed": $FAILED,
    "success_rate": $(echo "scale=2; $SUCCESS * 100 / $COUNT" | bc)
  },
  "gas_usage": {
    "total_gas": $TOTAL_GAS,
    "average_gas": $([ $SUCCESS -gt 0 ] && echo $((TOTAL_GAS / SUCCESS)) || echo 0)
  },
  "contracts": $CONTRACTS_JSON
}
JSON_EOF

echo "✅ 結果を保存しました"

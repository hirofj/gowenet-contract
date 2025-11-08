#!/bin/bash

COUNT=${1:-10}
DELAY=${2:-1}

echo "🔥 簡易負荷テスト (create + authenticate)"
echo "契約数: $COUNT"
echo "待機時間: ${DELAY}秒"
echo ""

SUCCESS=0
FAILED=0
TOTAL_GAS=0

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
        else
            FAILED=$((FAILED + 1))
            echo "❌ 失敗"
        fi
    else
        FAILED=$((FAILED + 1))
        echo "❌ エラー"
    fi
    
    [ $i -lt $COUNT ] && sleep $DELAY
done

echo ""
echo "📊 結果:"
echo "成功: $SUCCESS/$COUNT"
echo "失敗: $FAILED/$COUNT"
[ $SUCCESS -gt 0 ] && echo "平均Gas: $((TOTAL_GAS / SUCCESS))"
echo "総Gas: $TOTAL_GAS"

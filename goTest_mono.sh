#!/bin/bash

# GOWENET Monolithic Architecture Load Test Script
# 300 contracts over 1 hour (60 minutes)

LOG_FILE="data/test_mono_$(date +%Y%m%d%H%M).log"

echo "🚀 Starting GOWENET Monolithic Load Test"
echo "   Contracts: 300"
echo "   Interval: 12000ms (12 seconds)"
echo "   Estimated Duration: 60 minutes"
echo "   Log file: $LOG_FILE"
echo ""

nohup bash -c "LOAD_TEST_COUNT=300 INTERVAL_MS=12000 npx hardhat run scripts/freelance-contract-mono-test.js --network gowenet" > "$LOG_FILE" 2>&1 &

PID=$!
echo "✅ Test started in background (PID: $PID)"
echo "   Monitor: tail -f $LOG_FILE"
echo "   Stop: kill $PID"

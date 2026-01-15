#!/bin/bash
# Railway Storage Bucket 環境変数設定スクリプト
# 使用方法: ./scripts/setup-railway-storage.sh <ENDPOINT> <BUCKET_NAME> <ACCESS_KEY_ID> <SECRET_ACCESS_KEY>

set -e

if [ $# -ne 4 ]; then
    echo "使用方法: $0 <ENDPOINT> <BUCKET_NAME> <ACCESS_KEY_ID> <SECRET_ACCESS_KEY>"
    echo ""
    echo "例:"
    echo "  $0 https://xxx.r2.cloudflarestorage.com wrapping-train-templates AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    exit 1
fi

ENDPOINT=$1
BUCKET_NAME=$2
ACCESS_KEY_ID=$3
SECRET_ACCESS_KEY=$4

echo "🚀 Railway Storage Bucket 環境変数を設定します..."
echo ""

# Production 環境
echo "📦 Production 環境に設定中..."
railway env production
railway service wrapping-the-train
railway variables --set "RAILWAY_STORAGE_ENDPOINT=$ENDPOINT" \
                  --set "RAILWAY_BUCKET_NAME=$BUCKET_NAME" \
                  --set "RAILWAY_ACCESS_KEY_ID=$ACCESS_KEY_ID" \
                  --set "RAILWAY_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo "✅ Production 完了"
echo ""

# Staging 環境
echo "📦 Staging 環境に設定中..."
railway env staging
railway service wrapping-the-train-staging
railway variables --set "RAILWAY_STORAGE_ENDPOINT=$ENDPOINT" \
                  --set "RAILWAY_BUCKET_NAME=$BUCKET_NAME" \
                  --set "RAILWAY_ACCESS_KEY_ID=$ACCESS_KEY_ID" \
                  --set "RAILWAY_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo "✅ Staging 完了"
echo ""

echo "🎉 全環境の設定が完了しました！"
echo ""
echo "設定された変数:"
echo "  RAILWAY_STORAGE_ENDPOINT=$ENDPOINT"
echo "  RAILWAY_BUCKET_NAME=$BUCKET_NAME"
echo "  RAILWAY_ACCESS_KEY_ID=***"
echo "  RAILWAY_SECRET_ACCESS_KEY=***"

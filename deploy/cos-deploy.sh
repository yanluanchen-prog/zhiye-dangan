#!/bin/bash
# ══ 腾讯云 COS 部署脚本 ══════════════════════════════════
# 使用前：pip install coscmd 或 npm install -g coscmd
# 配置：coscmd config -a <SecretId> -s <SecretKey> -b <BucketName> -r ap-guangzhou

BUCKET="mycareer-1300xxxxxx"    # 替换成你的 bucket 名
REGION="ap-guangzhou"            # 替换成你的地域
GAME_FILE="../index-mv.html"

echo "📦 上传游戏文件..."
coscmd upload "$GAME_FILE" /index.html \
  --headers '{"Content-Type":"text/html;charset=utf-8","Cache-Control":"max-age=300"}'

echo "🖼  上传分享封面图..."
if [ -f "../share.png" ]; then
  coscmd upload "../share.png" /share.png \
    --headers '{"Content-Type":"image/png","Cache-Control":"max-age=86400"}'
fi

echo "✅ 部署完成！访问：https://mycareer.com/"

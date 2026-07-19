#!/usr/bin/env bash
# Deploy/อัปเดตแอปบน VPS แบบบรรทัดเดียว — รันในโฟลเดอร์ marim69-next: bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

SUPABASE_URL="https://fkhfrylvronkmktlmmia.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_SoNHJNrw4yfgZI_RYHHTjg_WgQ0lan-"
IMAGE="marim69-beta:latest"
NAME="marim69-beta"
PORT="127.0.0.1:3001:3000"

echo "==> git pull"
git pull --ff-only || echo "(ข้าม pull — อาจมี local change)"

echo "==> docker build"
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  -t "$IMAGE" .

echo "==> restart container"
docker rm -f "$NAME" 2>/dev/null || true
docker run -d --name "$NAME" --restart unless-stopped -p "$PORT" "$IMAGE"

sleep 2
echo "==> health check"
curl -s -o /dev/null -w "app -> %{http_code} (คาดหวัง 200)\n" http://127.0.0.1:3001/login

#!/usr/bin/env bash
# Triển khai Frontend lên Google Cloud Run (nginx tĩnh). Chạy tay bởi người có quyền project.
#
#   GOOGLE_CLIENT_ID=... GOONG_MAPTILES_KEY=... ./deploy/deploy_frontend.sh
#
# Không có tên miền riêng: URL Cloud Run có dạng xác định trước https://<dịch vụ>-<số project>.<vùng>.run.app,
# nên tính được địa chỉ Backend ngay cả khi chưa deploy xong.
set -euo pipefail
PROJECT="${PROJECT:-veggielife-510817}"; REGION="${REGION:-asia-southeast1}"
FE_SERVICE="${FE_SERVICE:-veggielife-frontend}"; BE_SERVICE="${BE_SERVICE:-veggielife-backend}"
: "${GOOGLE_CLIENT_ID:?đặt GOOGLE_CLIENT_ID (OAuth Web client, công khai)}"
GOONG_MAPTILES_KEY="${GOONG_MAPTILES_KEY:-}"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
BE_URL="https://${BE_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/veggielife/frontend:$(git rev-parse --short HEAD)"

gcloud builds submit --project "$PROJECT" --region "$REGION" --config cloudbuild.frontend.yaml \
  --substitutions "_IMAGE=$IMAGE,_API_BASE_URL=${BE_URL}/api/v1,_HUB_BASE_URL=${BE_URL},_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},_GOONG_MAPTILES_KEY=${GOONG_MAPTILES_KEY}" .

gcloud run deploy "$FE_SERVICE" --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --port 8080 --memory 256Mi --cpu 1 --min-instances 0 --max-instances 3 --allow-unauthenticated

echo "Xong. URL Frontend (đặt vào Cors__AllowedOrigins của Backend, đã tự tính trong deploy_backend.sh):"
gcloud run services describe "$FE_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)'

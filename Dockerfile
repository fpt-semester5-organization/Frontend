# Frontend VeggieLife (Vite + React) — build tĩnh rồi phục vụ bằng nginx trên Cloud Run.
# Biến VITE_* được nhúng lúc build (không đưa bí mật phía máy chủ vào đây). Build bằng cloudbuild.frontend.yaml.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_HUB_BASE_URL=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_GOONG_MAPTILES_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_HUB_BASE_URL=$VITE_HUB_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_GOONG_MAPTILES_KEY=$VITE_GOONG_MAPTILES_KEY \
    VITE_ENABLE_MOCKS=false
# public/docs/nutrition có symlink trỏ sang repo ai-service (không có trong ngữ cảnh build) -> gỡ để Vite không lỗi.
# Hệ quả: trang xem trước PDF sách dinh dưỡng của Admin không có tệp trên bản deploy này.
RUN find public -type l -delete \
 && npm run build

FROM nginx:1.27-alpine
# nginx tự thay ${PORT} trong templates khi khởi động (Cloud Run đặt PORT=8080)
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=8080
EXPOSE 8080

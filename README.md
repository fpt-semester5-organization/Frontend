# veggielife-frontend

Web app của VeggieLife cho **Guest, Member, VIP và Admin**. Admin dùng chung app này, nằm dưới route `/admin/*`.
**React 18 · TypeScript · Vite · Tailwind CSS · React Router · Axios · TanStack Query · Zustand · React Hook Form + Zod · ZXing.**

> Repo hiện chỉ có **cây thư mục**. File `.gitkeep` chỉ giữ thư mục rỗng trong Git; khi thư mục đã có file thật thì xóa `.gitkeep` đi.
> Danh mục công nghệ đang ghi cả Tailwind lẫn Bootstrap. Repo này dùng **Tailwind**; **không** cài Bootstrap khi Leader chưa chốt.

---

## 1. Cây thư mục

```
veggielife-frontend/
├── README.md
├── .github/workflows/        CI: lint + build khi mở PR
├── public/                   favicon, ảnh tĩnh không qua bundler
└── src/
    ├── app/                  providers.tsx (QueryClient, Router, Toast) · router.tsx (khai báo toàn bộ route)
    ├── api/                  http.ts (axios instance + interceptors) · types.ts (ApiResponse, PagedResult, ApiError)
    ├── routes/               paths.ts (hằng số URL)
    │   └── guards/           RequireAuth, RequireVip, RequireAdmin, GuestOnly
    ├── layouts/              MainLayout, AuthLayout, AdminLayout
    ├── components/
    │   ├── ui/               Button, Input, Modal, Table… (không chứa logic nghiệp vụ)
    │   └── common/           Header, Footer, Loading, EmptyState, ErrorBoundary, SignupPromptModal, GuestQuotaBadge
    ├── stores/               Zustand: auth.store, guest.store (chỉ state phía client)
    ├── hooks/                hook dùng chung: useGeolocation, useCamera, useDebounce
    ├── lib/                  queryClient, format (ngày giờ VN, tiền VND), storage
    ├── constants/            roles, errorCodes (map ERR_* sang tiếng Việt), quota (chỉ để hiển thị)
    ├── styles/               index.css (Tailwind)
    ├── assets/               ảnh, icon import trong code
    └── features/             ★ code theo chức năng, mỗi feature có cùng 5 thư mục con:
        └── <feature>/
            ├── api/          <feature>.api.ts: hàm gọi endpoint
            ├── hooks/        useQuery / useMutation bọc hàm api
            ├── components/   component riêng của feature
            ├── pages/        màn hình gắn với route
            └── types/        type request/response (field camelCase giống hệt API)
```

### Danh sách feature

| Feature | Màn hình chính | Endpoint backend | Ghi chú BR |
|---|---|---|---|
| `auth` | Login, Register, VerifyOtp, ForgotPassword, ResetPassword, ChangePassword | `/auth/*` | Đăng ký bằng **Email**; OTP **5 phút**; mật khẩu ≥ 8 ký tự gồm chữ hoa, chữ thường, số, ký tự đặc biệt (BR-AUTH-001) |
| `home` | Home (feed + tìm kiếm) | `/recipes`, `/posts` | Guest xem tới bài thứ 5 thì hiện popup đăng ký (BR-GUEST-01) |
| `recipes` | List, Detail, Editor, MyRecipes | `/recipes/*` | Guest chỉ xem, không ghi (BR-GUEST-04) |
| `community` | PostFeed, PostDetail, PostEditor, MyPosts | `/posts/*`, `/comments/*`, `/reports` | Bình luận nhiều tầng, thả tim, báo cáo |
| `videos` | (component) VideoPlayer, TranscriptPanel | `/videos/{id}/transcript` | STT tính vào 05 lượt AI của Guest |
| `profile` | Profile, HealthProfile, DietaryPreferences | `/profile/*`, `/dietary-schools`, `/allergens` | BMI/TDEE; nhắc cập nhật sau 30 ngày |
| `meal-plans` | MealPlan, Generate | `/meal-plans/*` | Chỉ Member |
| `shopping-lists` | ShoppingList | `/shopping-lists/*` | Chỉ Member, chỉ online |
| `scanner` | BarcodeScan, OcrLabelScan, ScanHistory | `/barcode/scan/*`, `/products/*` | ZXing đọc camera; Guest 3 lần/ngày |
| `fridge` | Fridge (upload nhiều ảnh, danh sách nguyên liệu, gợi ý món) | `/fridge/*` | Gemini Vision |
| `venues` | VenueMap, VenueDetail, SuggestVenue | `/venues/*` | Guest 5 km / Member 10 km; chỉ trong Việt Nam; hiện nguồn + ngày cập nhật thực đơn |
| `chat` | Chat | `/chat/*`, `/surveys` | Nút đánh giá câu trả lời (lưu vào Surveys) |
| `subscription` | Pricing, Checkout, PaymentResult, MySubscription | `/vip-subscriptions`, `/payments/*` | MoMo, VietQR |
| `admin` | AdminLogin, Admin2fa (**OTP Email**), Dashboard, Users, UserDetail, PostModeration, AiModerationQueue, CommentModeration, Categories, RecipeVerification, DietarySchools, ENumbers, LlmOps, AuditLogs, SystemMaintenance | `/admin/*` | Layout riêng; tự đăng xuất sau 30 phút không thao tác |

Route và field cụ thể theo **API Master** (đang soạn). Trước khi có bản Master, xem các bản **API Specification** riêng của từng thành viên trong bộ tài liệu nhóm, và hỏi owner backend của module.

---

## 2. Quy tắc bắt buộc

1. **Gọi API chỉ qua `features/<x>/api/`**, dùng instance `src/api/http.ts`. Component không import axios trực tiếp.
2. **Interceptor trong `http.ts`** lo các việc chung:
   - gắn `Authorization: Bearer` (token Member hoặc Guest);
   - bóc envelope `ApiResponse`;
   - khi gặp 401 thì refresh token 1 lần;
   - khi gặp 403 `ERR_GUEST_QUOTA_EXCEEDED` thì mở `SignupPromptModal`.
3. **Server state** dùng TanStack Query; **Zustand** chỉ giữ auth/UI. Không copy dữ liệu API vào store.
4. **Hạn mức Guest** lấy từ `GET /guest/quota`. **Không** đếm bằng localStorage (BR-GUEST-AI-01).
5. Một feature **không import** file nội bộ của feature khác; phần dùng chung thì đưa lên `components/`, `hooks/` hoặc `lib/`.
6. **URL** dùng hằng số trong `routes/paths.ts`, không viết chuỗi rải rác.
7. **Đặt tên:**
   - component/page: `PascalCase.tsx`;
   - hook: `useXxx.ts`;
   - file api/type: `<feature>.api.ts` / `<feature>.types.ts`;
   - thư mục feature: `kebab-case`.
8. **Form** dùng React Hook Form + Zod; thông báo lỗi lấy từ `constants/errorCodes`.
9. **Không làm màn Phase 2:** Swipe, Streak, Follow, Badges, Notifications, Share, kết nối thiết bị đeo, xác thực số điện thoại.

**Muốn thêm… thì đặt ở đâu?**

| Muốn thêm | Đặt tại |
|---|---|
| Màn hình mới | `features/<x>/pages/` + khai báo route trong `app/router.tsx` + hằng số trong `routes/paths.ts` |
| Component chỉ 1 feature dùng | `features/<x>/components/` |
| Component nhiều feature dùng | `components/common/` (có logic) hoặc `components/ui/` (thuần giao diện) |
| Gọi endpoint mới | `features/<x>/api/` + hook trong `features/<x>/hooks/` |

---

## 3. Quy trình làm việc (Jira + GitHub)

- **Nhánh:** `feature/<JIRA-KEY>-<mô-tả>` tạo từ `develop`, ví dụ `feature/VL-58-recipe-detail-page`.
- **Commit:** `feat(recipes): VL-58 recipe detail page [FR-REC-02]`.
- **PR:** tiêu đề có mã Jira, kèm ảnh chụp màn hình, ghi rõ endpoint đã dùng; `tsc` và `eslint` không được còn lỗi.
- **Giao diện:** theo Figma của nhóm (link: chờ bổ sung).

---

## 4. Khởi tạo (Leader chạy 1 lần)

```bash
npm create vite@latest . -- --template react-ts      # chọn "Ignore files and continue"
npm i react-router-dom @tanstack/react-query axios zustand react-hook-form zod @hookform/resolvers
npm i @zxing/browser @react-google-maps/api @react-oauth/google
npm i -D tailwindcss @tailwindcss/vite eslint prettier
```

Sau khi chạy lệnh:
- `src/main.tsx` render providers từ `src/app/providers.tsx`;
- xóa `App.tsx` / `App.css` mặc định;
- trong `vite.config.ts`, đặt alias `@` → `src` và proxy `/api` sang backend.

Biến môi trường (file `.env.local`, không commit): `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`.

## 5. Đang chờ chốt

- **API Master:** route và field.
- **Thư viện CSS:** Tailwind hay Bootstrap.
- **Thiết kế:** link Figma / design system.
- **Lưu refresh token:** cookie HttpOnly hay bộ nhớ.
- **Jira project key.**
- **Deploy frontend:** Vercel / Netlify / Firebase Hosting.

Danh sách đầy đủ các mục còn thiếu: hỏi Leader (file tổng hợp "Dữ liệu còn thiếu" của nhóm).

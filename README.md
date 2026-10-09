# veggielife-frontend

Web app của VeggieLife cho **Khách (Guest), Thành viên (Member), VIP và Quản trị viên (Admin)**. Admin dùng chung app này, nằm dưới route `/admin/*`.
**React 18 · TypeScript · Vite · Tailwind CSS + Bootstrap 5 (qua `react-bootstrap`) · React Router · Axios · TanStack Query · Zustand · React Hook Form + Zod · ZXing · Google Maps JS.**

> Đã có khung chạy được (Vite + providers + API client + router). Cập nhật theo bộ tài liệu chuẩn ngày 09/10/2026 (Decision Log tới D119).
> Đặc tả nằm trong `docs/` (bảng số tệp ở `docs/README.md`). Màn hình, route và API cần gọi của **45 màn** nằm ở `docs/11. UI Screen Specification.docx`.

---

## 1. Nguồn sự thật

| Cần gì | Mở tệp |
|---|---|
| Màn hình: route, dữ liệu hiển thị, API, lỗi, trạng thái | `docs/11. UI Screen Specification.docx` |
| Endpoint, field, enum (sinh type) | `docs/08. OpenAPI Specification.yaml` |
| Luồng nghiệp vụ, mã lỗi của từng chức năng | `docs/09. Task Cards.docx` |
| Hằng số (hạn mức, giới hạn tệp…), thông điệp mã lỗi | `docs/10. Data Dictionary and Constants.docx` |
| Quy tắc Tailwind + Bootstrap, biến môi trường, deploy | `docs/05. Architecture and Deployment.docx` mục 2.3, 6.2, 9 |

Tài liệu mâu thuẫn thì **Decision Log thắng**. Không tự đặt route, field hay mã lỗi; thiếu thông tin thì ghi `UNSPECIFIED: <câu hỏi>` và hỏi Leader.

---

## 2. Cây thư mục

```
veggielife-frontend/
├── README.md
├── docs/                     bản sao đặc tả (xem docs/README.md)
├── .github/workflows/        CI: npm ci, gen:api không đổi, tsc, eslint, build
├── public/                   favicon, ảnh tĩnh không qua bundler
└── src/
    ├── app/                  providers.tsx (QueryClient, Router, Toast) · router.tsx (khai báo toàn bộ route)
    ├── api/                  http.ts (axios instance + interceptors) · types.ts · generated/ (type sinh từ 08. OpenAPI)
    ├── routes/               paths.ts (hằng số URL) · guards/ (RequireAuth, RequireVip, RequireAdmin, GuestOnly)
    ├── layouts/              MainLayout, AuthLayout, AdminLayout
    ├── components/
    │   ├── ui/               Button, Input, Modal, Table… (không chứa logic nghiệp vụ)
    │   └── common/           Header, Footer, Loading, EmptyState, ErrorBoundary, SignupPromptModal, GuestQuotaBadge, MedicalDisclaimer
    ├── stores/               Zustand: auth.store (access token trong bộ nhớ), guest.store — chỉ state phía client
    ├── hooks/                useGeolocation, useCamera, useDebounce
    ├── lib/                  queryClient, format (ngày giờ VN, tiền VND), storage
    ├── constants/            roles, errorCodes (map ERR_* sang tiếng Việt, sinh từ docs/10 mục 5), quota (chỉ để hiển thị)
    ├── styles/               index.css (Tailwind)
    ├── assets/               ảnh, icon import trong code
    └── features/             ★ code theo chức năng; mỗi feature có api/ · hooks/ · components/ · pages/ · types/
```

---

## 3. Feature ↔ màn hình ↔ route

Số SCR theo `docs/11. UI Screen Specification.docx`.

| Feature | Màn hình (SCR) | Route | Ghi chú nghiệp vụ |
|---|---|---|---|
| `auth` | Login, Register, VerifyOtp, ForgotPassword, ResetPassword, ChangePassword (01–06) | `/auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password` | Đăng ký bằng **Email**; OTP 6 số, 5 phút; mật khẩu ≥ 8 ký tự gồm hoa, thường, số, ký tự đặc biệt; Google OAuth |
| `profile` | Profile, HealthProfile, DietaryPreferences (07–09) | `/me`, `/me/health`, `/me/dietary-preferences` | BMI/BMR/TDEE; danh mục từ 4 GET công khai (FN-PROF-08) |
| `home` | Home (10) | `/` | Khách lướt tới mục thứ 5 thì hiện popup đăng ký (BR-GUEST-01) |
| `recipes` | RecipeList, RecipeDetail, RecipeEditor, MyRecipes (11–14) | `/recipes`, `/recipes/:id`, `/recipes/new`, `/recipes/:id/edit`, `/me/recipes` | Khách chỉ xem; Red Alert khi nhãn trường phái mâu thuẫn nguyên liệu |
| `scanner` | BarcodeScan, ScanHistory (15–16) | `/scanner`, `/scanner/history` | ZXing đọc camera + nhập tay; Khách 3 lần/ngày; **không** OCR nhãn |
| `fridge` | Fridge (17) | `/fridge` | Ảnh JPG/PNG/WEBP ≥ 640×480, ≤ 10 MB, nén trước khi gửi; FRESH / NON-FRESH; Free 10, VIP 30 ảnh/ngày |
| `venues` | VenueMap, VenueDetail, SuggestVenue (18–20) | `/venues`, `/venues/:id`, `/venues/suggest` | Khách 5 km, Thành viên 1–10 km; chỉ trong Việt Nam; không có thực đơn quán |
| `videos` | VideoPlayer + TranscriptPanel (21) | `/videos/:id` | Video MP4/MOV ≤ 100 MB, 10 giây–5 phút; chờ bóc tách công thức (PROCESSING → READY/FAILED) |
| `meal-plans` | MealPlan, Generate (22–23) | `/meal-plans`, `/meal-plans/:id`, `/meal-plans/new` | Free 1, VIP 3 thực đơn/tuần; ghi chú cho AI ≤ 200 ký tự; báo rõ khi dùng thực đơn mẫu |
| `shopping-lists` | ShoppingList (24) | `/shopping-lists/:id` | Chỉ online |
| `community` | PostFeed, PostDetail, PostEditor, MyPosts (25–28) | `/community`, `/community/posts/:id`, `/community/posts/new`, `/community/posts/:id/edit`, `/me/posts` | Bình luận nhiều tầng, thả tim, báo cáo |
| `chat` | Chat (29) | `/chat`, `/chat/:sessionId` | Luôn hiện miễn trừ y khoa; hiển thị `sources` (loại, tiêu đề) khi `ragUsed`; nút đánh giá câu trả lời; Free 20, VIP 200 câu/ngày |
| `subscription` | Pricing, Checkout, PaymentResult, MySubscription (30–33) | `/vip`, `/vip/checkout/:planId`, `/vip/result`, `/me/subscription` | MoMo, VietQR (sandbox); đơn chờ thanh toán hết hạn sau 5 phút |
| `admin` | Moderation, CommentModeration, Categories, RecipeVerification, Dashboard, Users + UserDetail, AuditLogs, LlmOps + AiQuality + KnowledgeBase, DietarySchools + ENumbers, Ingredients, SubscriptionPlans, Venues (34–45) | `/admin`, `/admin/moderation`, `/admin/moderation/comments`, `/admin/categories`, `/admin/recipe-verification`, `/admin/users`, `/admin/users/:id`, `/admin/audit-logs`, `/admin/ai`, `/admin/dietary-schools`, `/admin/e-numbers`, `/admin/ingredients`, `/admin/subscription-plans`, `/admin/venues` | Đăng nhập qua `/auth/login`; tự đăng xuất sau 30 phút không thao tác; **không** 2FA, **không** màn bảo trì |

---

## 4. Quy tắc bắt buộc

1. **Gọi API chỉ qua `features/<x>/api/`**, dùng instance `src/api/http.ts`; base URL `/api/v1`. Component không import axios trực tiếp.
2. **Type** lấy từ `src/api/generated` (sinh từ `08. OpenAPI`); field camelCase giống hệt API, không tự khai báo lại.
3. **Envelope:** thành công `{ statusCode, message, data[, meta] }`; lỗi `{ statusCode, errorCode, message[, details] }`. Không có trường `success`.
4. **Interceptor trong `http.ts`** lo các việc chung:
   - gắn `Authorization: Bearer` (token Thành viên hoặc Anonymous JWT của Khách);
   - bóc envelope;
   - gặp 401 thì gọi `POST /auth/refresh-token` một lần (gọi với `withCredentials`);
   - gặp 403 `ERR_QUOTA_AI_EXCEEDED` (hoặc mã `ERR_QUOTA_*` khác) của Khách thì mở `SignupPromptModal`.
5. **Token:**
   - access token chỉ giữ trong bộ nhớ (Zustand), **không** localStorage;
   - refresh token là cookie `HttpOnly; Secure` do Backend đặt, Frontend không đọc được.
6. **Hạn mức Khách** lấy từ `GET /guest/quota`; **không** đếm bằng localStorage (BR-GUEST-AI-01).
7. **Server state** dùng TanStack Query; Zustand chỉ giữ auth/UI. Không copy dữ liệu API vào store.
8. **Phân trang** bằng `page` / `size`, đọc `meta = { page, size, total }`. Lịch sử chat dùng `before` / `size`.
9. **Tailwind + Bootstrap (D102):**
   - Tailwind là mặc định cho bố cục, khoảng cách, màu, chữ.
   - Bootstrap 5 chỉ dùng qua `react-bootstrap` cho `Modal`, `Dropdown`, `Toast`, `Offcanvas`, `Tooltip`, `Popover`, `Tabs`, `Accordion`.
   - Không dùng class bố cục/tiện ích của Bootstrap (`container`, `row`, `col-*`, `d-*`, `m-*`, `p-*`…), không dùng `bootstrap.bundle.js` hay jQuery.
   - Nạp `bootstrap.min.css` trước `index.css`.
10. **Không import chéo feature**; phần dùng chung đưa lên `components/`, `hooks/` hoặc `lib/`.
11. **URL** dùng hằng số trong `routes/paths.ts`, đúng route ở mục 3.
12. **Form** dùng React Hook Form + Zod; thông báo lỗi lấy từ `constants/errorCodes`, không hiện mã lỗi thô.
13. **Đủ trạng thái** loading / lỗi / rỗng cho mỗi màn; dùng được ở chiều rộng 360 px.
14. **Đặt tên:**
    - component/page: `PascalCase.tsx`;
    - hook: `useXxx.ts`;
    - file api/type: `<feature>.api.ts` / `<feature>.types.ts`;
    - thư mục feature: `kebab-case`.

**Muốn thêm… thì đặt ở đâu?**

| Muốn thêm | Đặt tại |
|---|---|
| Màn hình | `features/<x>/pages/` + route trong `app/router.tsx` + hằng số trong `routes/paths.ts` |
| Component chỉ 1 feature dùng | `features/<x>/components/` |
| Component nhiều feature dùng | `components/common/` (có logic) hoặc `components/ui/` (thuần giao diện) |
| Gọi endpoint | `features/<x>/api/` + hook trong `features/<x>/hooks/` |

---

## 5. Chạy local và kiểm tra

```bash
npm ci
npm run dev
```

Biến môi trường (file `.env.local`, không commit; không đưa bí mật phía máy chủ vào biến `VITE_`):
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_MAPS_API_KEY`

Trước khi báo xong:

```bash
npm run gen:api        # khi hợp đồng API đổi
npx tsc --noEmit
npm run lint
npm run build
npm run test
```

Deploy: Vercel; rewrite SPA về `index.html`. Preview theo nhánh, production khi gắn tag `v*`.

---

## 6. Quy trình làm việc (Jira + GitHub)

- **Nhánh:** `feature/VL-<số>-<mô-tả>` tạo từ `develop`.
- **Commit:** `feat(recipes): VL-58 recipe detail page [FN-POST-02]`.
- **PR:**
  - tiêu đề có mã Jira, kèm ảnh chụp màn hình và ghi rõ endpoint đã dùng;
  - `tsc`, `eslint`, `build` không được còn lỗi;
  - cần 1 người duyệt; ≤ 400 dòng đổi.

---

## 7. Ngoài phạm vi MVP: không làm màn hình

Swipe, Streak, Follow, Badges, Notifications, Share, Bookmark, kết nối thiết bị đeo, xác thực số điện thoại (OTP SMS), CAPTCHA, Admin 2FA, chế độ bảo trì, OCR nhãn thành phần, URL-to-recipe (TikTok/Reels), thực đơn quán.

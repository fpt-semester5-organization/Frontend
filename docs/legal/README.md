# TÀI LIỆU PHÁP LÝ & QUY CHUẨN ĂN CHAY HỆ THỐNG VEGGIELIFE
*(Bộ ấn phẩm văn bản PDF chính thức cho quy trình Đăng ký tài khoản và Tuân thủ Pháp luật)*

---

## 1. Ngữ Cảnh Hệ Thống & Căn Cứ Nghiệp Vụ

**VeggieLife** là Nền tảng Công nghệ Ẩm thực và Dinh dưỡng Chay Thông minh, tích hợp các mô hình Trí tuệ Nhân tạo (AI Vision nhận diện nguyên liệu tủ lạnh, Barcode Scanner phân tích phụ gia thực phẩm quốc tế E-numbers, Trợ lý AI lập thực đơn dinh dưỡng) và Mạng xã hội chia sẻ công thức ẩm thực chay.

Tại bước **Đăng ký tài khoản (Màn hình SCR-02 · auth/Register)**, người dùng được yêu cầu xác nhận checkbox:
> *"Tôi đồng ý với **Điều khoản** và **Chính sách bảo mật**"*

Theo bộ tài liệu đặc tả hệ thống (`01. Business Rules`, `04. Nonfunctional Requirements Specification`, `06. Logical Data Model Specification`, `10. Data Dictionary and Constants`), bước đăng ký này không chỉ là thủ tục giao diện đơn thuần mà chịu sự điều chỉnh của các ràng buộc pháp lý và an toàn thực phẩm cực kỳ khắt khe:

1. **Ràng buộc Pháp lý & Quyền riêng tư theo Nghị định 13/2023/NĐ-CP (PDPD):**
   - **Tiêu chuẩn PRV-1 & Điều 2 Khoản 4 NĐ 13/2023/NĐ-CP:** Dữ liệu sức khỏe (chiều cao, cân nặng, chỉ số BMI theo chuẩn WHO/WPRO, tỷ lệ BMR, TDEE, trường phái ăn chay, danh sách đen thực phẩm gây dị ứng Allergies Blacklist) là **Dữ liệu cá nhân nhạy cảm**. Hệ thống bắt buộc phải có sự đồng thuận rõ ràng (Consent) khi đăng ký và chỉ cho phép chủ tài khoản cùng thuật toán nội bộ được đọc.
   - **Ràng buộc CO-23:** Lưu trữ và xóa tài khoản phải tuân thủ Nghị định 13/2023/NĐ-CP: có **thời gian ân hạn 30 ngày (Grace Period)**, sau đó ẩn danh hóa vĩnh viễn họ tên, email, ảnh đại diện, chỉ số thể trạng và mật khẩu (BR-ADM-USR-003; BR-ADM-USR-004).
   - **Tiêu chuẩn an toàn phiên (SEC-1, SEC-2, SEC-3, SEC-4):** Mật khẩu băm BCrypt cost 12; OTP 6 số ngẫu nhiên an toàn thời hạn 5 phút; khóa 15 phút nếu nhập sai quá 5 lần; token JWT xoay vòng trên Redis.

2. **Quy chuẩn Ẩm thực Chay Chuẩn hóa & An toàn Thực phẩm:**
   - **Quy tắc BR-ADM-MAS-001:** Hệ thống định nghĩa cố định và duy nhất **07 Trường phái Ăn chay Cốt lõi**:
     1. `VEGAN` (Thuần chay): Cấm hoàn toàn thịt động vật, gia cầm, hải sản, trứng, sữa, mật ong, phụ gia động vật.
     2. `LACTO` (Chay có sữa): Cho phép sữa & chế phẩm sữa; cấm trứng, thịt, hải sản.
     3. `OVO` (Chay có trứng): Cho phép trứng không phôi; cấm sữa, thịt, hải sản.
     4. `LACTO_OVO` (Chay có trứng & sữa): Cho phép trứng và sữa; cấm thịt, cá, gia cầm.
     5. `BUDDHIST` (Chay Phật giáo): Cấm thịt động vật, trứng, sữa + **Kiêng tuyệt đối Ngũ vị tân** (Hành, hẹ, tỏi, kiệu, hưng cừ / hành tây).
     6. `POLLOTARIAN` (Chay linh hoạt thịt trắng): Cho phép thịt gia cầm hạn chế; cấm thịt đỏ và hải sản.
     7. `PESCATARIAN` (Chay thủy hải sản): Cho phép cá, tôm, hải sản; cấm thịt gia súc và gia cầm.
   - **Quy tắc CẤM TUYỆT ĐỐI THỊT ĐỎ (D109):** Thịt đỏ bị cấm 100% trên toàn bộ hệ thống với mọi trường phái.
   - **Cơ chế Báo động đỏ (Red Alert - BR-ADM-CNT-003, D109):** Tự động phát hiện công thức gắn mác sai trường phái hoặc chứa thịt động vật, gỡ bài lập tức, chuyển vào trạng thái cách ly `QUARANTINED_HIDDEN` và báo động Quản trị viên xử lý.
   - **Từ điển Phụ gia E-Numbers:** Cảnh báo phụ gia gốc động vật (E120 Carmine, E441 Gelatin, E471...).
   - **Tuyên bố Miễn trừ Y tế (Medical Disclaimer):** Khẳng định VeggieLife không phải cơ sở y tế; thuật toán AI calo ±10% chỉ mang tính tham khảo; khuyến cáo đối tượng đặc biệt (phụ nữ mang thai, bệnh nhân mạn tính) phải tham vấn bác sĩ.

---

## 2. Danh Mục Các Tệp PDF Pháp Lý Đã Tạo

Tất cả các tài liệu đã được biên soạn đầy đủ, thiết kế trang chuẩn xuất bản A4, font tiếng Việt đầy đủ dấu (Arial Unicode), số trang 2 lớp (`Trang X / Y`), tiêu đề/chân trang và biểu mẫu chữ ký xác thực. 

Các tệp được lưu đồng thời tại:
- `D:\Frontend\docs\legal\` *(Lưu trữ tài liệu dự án)*
- `D:\Frontend\public\legal\` *(Phục vụ tải trực tiếp trên website Frontend)*

| STT | Tên tệp PDF | Mã văn bản | Tên tài liệu chính thức | Số trang / Mục đích sử dụng |
|:---:|:---|:---:|:---|:---|
| 1 | `Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.pdf` | **01/2026/VGL-TOS** | **Điều Khoản Dịch Vụ và Quy Chế Hoạt Động Cộng Đồng** *(Terms of Service & Community Guidelines)* | Quy định điều kiện đăng ký, tài khoản, bảo mật mật khẩu, bản quyền công thức UGC, tính năng quét AI tủ lạnh/mã vạch, gói VIP thanh toán & hoàn tiền 48h, chính sách ân hạn 30 ngày xóa tài khoản. |
| 2 | `Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.pdf` | **02/2026/VGL-PDPD** | **Chính Sách Bảo Mật và Bảo Vệ Dữ Liệu Cá Nhân** *(Privacy Policy & Sensitive Health Data Protection)* | Căn cứ Nghị định 13/2023/NĐ-CP; cơ chế bảo vệ đặc biệt dữ liệu sức khỏe nhạy cảm (PRV-1), kiểm toán truy cập Admin (SEC-12), bảo mật ảnh quét tủ lạnh, mã hóa TLS/BCrypt, quyền của chủ thể dữ liệu & liên hệ DPO (`privacy@veggielife.vn`). |
| 3 | `Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.pdf` | **03/2026/VGL-VEG-SPEC** | **Quy Chuẩn Ẩm Thực Chay, An Toàn Dị Ứng và Tuyên Bố Miễn Trừ Trách Nhiệm Y Tế** *(Vegetarian Standards & Medical Disclaimer)* | Chi tiết 07 trường phái ăn chay cốt lõi (BR-ADM-MAS-001), cấm tuyệt đối thịt đỏ, chế tài Báo động đỏ (Red Alert), từ điển phụ gia E-Numbers (E120, E441, E471...), quản lý rủi ro dị ứng (Allergies Blacklist) và Tuyên bố miễn trừ trách nhiệm y tế toàn diện. |
| 4 | `Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.pdf` | **04/2026/VGL-CONSENT** | **Bản Cam Kết và Thỏa Thuận Chấp Thuận Khi Đăng Ký Tài Khoản** *(Registration Consent Agreement)* | Bản thỏa thuận pháp lý điện tử tóm tắt 4 cam kết cốt lõi khi đăng ký tài khoản (TOS, PDPD NĐ 13/2023, Quy chuẩn ăn chay, Miễn trừ y tế), có biểu mẫu xác thực danh tính điện tử và chữ ký đại diện. |

---

## 3. Cách Tái Tạo Hoặc Chỉnh Sửa Tài Liệu PDF

Hệ thống đã lưu lại mã nguồn Python sinh tài liệu tại `D:\Frontend\generate_legal_pdfs.py`. Khi cần cập nhật nội dung:
```powershell
python "D:\Frontend\generate_legal_pdfs.py"
```
Toàn bộ 4 tệp PDF sẽ được cập nhật tức thì vào cả 2 thư mục `public/legal` và `docs/legal`.


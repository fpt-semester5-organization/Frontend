import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  HeartHandshake,
  Mail,
  Printer,
} from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('intro');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Điều khoản dịch vụ | VeggieLife';
  }, []);

  const sections = [
    { id: 'intro', title: '1. Giới thiệu & Phạm vi áp dụng' },
    { id: 'account', title: '2. Tài khoản & Trách nhiệm bảo mật' },
    { id: 'content', title: '3. Quyền sở hữu trí tuệ & Nội dung cộng đồng' },
    { id: 'disclaimer', title: '4. Giới hạn trách nhiệm Dinh dưỡng & Y tế' },
    { id: 'ai-features', title: '5. Tính năng AI & Quét tủ lạnh / Mã vạch' },
    { id: 'subscription', title: '6. Gói VIP & Điều khoản thanh toán' },
    { id: 'termination', title: '7. Tạm dừng, Khóa tài khoản & Xóa dữ liệu' },
    { id: 'general', title: '8. Điều khoản chung & Thông tin liên hệ' },
  ];

  const handleScrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background py-space-xl">
      <div className="mx-auto max-w-[1200px] px-margin-sm lg:px-margin">
        {/* Navigation Breadcrumb & Back */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(PATHS.HOME);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-surface-container-high bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link to={PATHS.HOME} className="hover:text-primary hover:underline">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-on-surface">Điều khoản sử dụng</span>
          </div>
        </div>

        {/* Hero Header Banner */}
        <header className="mb-10 overflow-hidden rounded-2xl border border-surface-container-high bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                <Scale className="h-3.5 w-3.5" />
                <span>Văn bản pháp lý chính thức</span>
                <span className="text-primary">• Hiệu lực từ 10/2026</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-primary">
                Điều Khoản Sử Dụng Dịch Vụ
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Chào mừng bạn đến với <strong>VeggieLife</strong> — Nền tảng ẩm thực và dinh dưỡng
                chay thông minh. Vui lòng đọc kỹ các điều khoản dưới đây trước khi đăng ký tài
                khoản hoặc sử dụng dịch vụ của chúng tôi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to={PATHS.PRIVACY}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 font-label-md text-label-md font-medium text-primary transition hover:bg-primary/10"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Chính sách bảo mật</span>
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest px-4 py-2 font-label-md text-label-md font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                title="In tài liệu"
              >
                <Printer className="h-4 w-4" />
                <span>In bản sao</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                <HeartHandshake className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Tôn trọng cộng đồng</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Cam kết chia sẻ công thức ăn chay lành mạnh, văn minh và đúng thuần phong mỹ tục.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-amber-900 dark:text-amber-200">
                Tham khảo y tế & dinh dưỡng
              </h4>
              <p className="mt-1 font-body-sm text-body-sm text-amber-800/80 dark:text-amber-300/80">
                Thực đơn và calo mang tính chất tham khảo, không thay thế chẩn đoán từ chuyên gia y tế.
              </p>
            </div>

            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-fixed text-on-secondary-fixed">
                <Sparkles className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Tính năng AI thông minh</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Quét tủ lạnh và mã vạch ứng dụng AI; dữ liệu ảnh phục vụ trích xuất nguyên liệu chay.
              </p>
            </div>

            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
                <Lock className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Bảo mật tài khoản</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Người dùng tự quản lý mật khẩu, mã OTP và chịu trách nhiệm với hoạt động tài khoản.
              </p>
            </div>
          </div>
        </header>

        {/* Content & Table of Contents Sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Sticky Sidebar: Table of contents */}
          <aside className="lg:col-span-4">
            <div className="sticky top-[90px] space-y-4">
              <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-xs">
                <h3 className="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm text-primary">
                  <FileText className="h-4 w-4" />
                  <span>Mục lục điều khoản</span>
                </h3>
                <nav className="flex flex-col gap-1">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleScrollTo(sec.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-all ${
                        activeSection === sec.id
                          ? 'bg-primary-container font-semibold text-on-primary shadow-xs'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                      }`}
                    >
                      <span className="line-clamp-1">{sec.title}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                  ))}
                </nav>
              </div>

              {/* Support Box */}
              <div className="rounded-2xl border border-surface-container-high bg-surface-container-low p-5">
                <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">
                  Cần giải đáp thắc mắc?
                </h4>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Nếu bạn có câu hỏi hoặc cần khiếu nại về điều khoản, đội ngũ pháp chế VeggieLife sẵn sàng hỗ trợ bạn.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
                  <Mail className="h-4 w-4" />
                  <span>support@veggielife.vn</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content */}
          <div className="space-y-8 lg:col-span-8">
            {/* Section 1 */}
            <section
              id="intro"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  1
                </span>
                <span>Giới thiệu & Phạm vi áp dụng</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  1.1. Điều khoản sử dụng này (sau đây gọi là <strong>&quot;Điều khoản&quot;</strong>) cấu thành thỏa thuận pháp lý có giá trị ràng buộc giữa bạn (sau đây gọi là <strong>&quot;Người dùng&quot;</strong> hoặc <strong>&quot;Thành viên&quot;</strong>) và Đội ngũ phát triển nền tảng <strong>VeggieLife</strong>.
                </p>
                <p>
                  1.2. Bằng cách tích chọn vào ô <em>&quot;Tôi đồng ý với Điều khoản và Chính sách bảo mật&quot;</em> khi đăng ký tài khoản, hoặc bằng việc tiếp tục truy cập và sử dụng bất kỳ tính năng nào của VeggieLife, bạn xác nhận đã đọc, hiểu và đồng ý vô điều kiện chịu sự ràng buộc của bản Điều khoản này.
                </p>
                <p>
                  1.3. VeggieLife cung cấp các dịch vụ bao gồm: tra cứu công thức nấu món chay, quét tủ lạnh thông minh bằng AI (Fridge Scanner), quét mã vạch sản phẩm nhận diện thành phần phụ gia E-number, tạo thực đơn dinh dưỡng cá nhân hóa, tìm kiếm địa điểm quán chay, và mạng xã hội chia sẻ công thức ăn chay.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section
              id="account"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  2
                </span>
                <span>Tài khoản & Trách nhiệm bảo mật</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  2.1. <strong>Độ tuổi sử dụng:</strong> Người dùng từ đủ 13 tuổi trở lên có thể tự đăng ký tài khoản. Người dùng dưới 13 tuổi cần có sự đồng ý hoặc giám sát từ cha mẹ/người giám hộ hợp pháp.
                </p>
                <p>
                  2.2. <strong>Thông tin đăng ký:</strong> Bạn cam kết cung cấp thông tin họ tên, email chính xác, thuộc quyền sở hữu của bạn. Mỗi email chỉ được liên kết với một tài khoản duy nhất trên hệ thống.
                </p>
                <p>
                  2.3. <strong>Bảo mật thông tin đăng nhập:</strong>
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-on-surface">
                  <li>
                    Mật khẩu phải tuân thủ chuẩn an toàn (tối thiểu 8 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt).
                  </li>
                  <li>
                    Bạn chịu trách nhiệm toàn bộ đối với việc bảo mật mật khẩu và mã OTP xác minh.
                  </li>
                  <li>
                    Sau 5 lần đăng nhập sai liên tiếp, hệ thống sẽ tự động tạm khóa tài khoản trong 15 phút theo Quy tắc Nghiệp vụ BR-AUTH-004 nhằm bảo vệ an toàn cho bạn.
                  </li>
                  <li>
                    Nếu phát hiện có dấu hiệu truy cập trái phép, bạn cần thông báo ngay cho VeggieLife để hỗ trợ xử lý.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section
              id="content"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  3
                </span>
                <span>Quyền sở hữu trí tuệ & Nội dung cộng đồng</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  3.1. <strong>Sở hữu của VeggieLife:</strong> Toàn bộ giao diện, thiết kế, logo, mã nguồn, thuật toán AI gợi ý và cơ sở dữ liệu dinh dưỡng thuộc quyền sở hữu trí tuệ độc quyền của VeggieLife. Nghiêm cấm sao chép, dịch ngược hoặc thương mại hóa khi chưa có sự cho phép bằng văn bản.
                </p>
                <p>
                  3.2. <strong>Nội dung do người dùng đăng tải (UGC):</strong> Khi bạn chia sẻ công thức món chay, hình ảnh món ăn, bình luận hoặc bài viết cộng đồng:
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-on-surface">
                  <li>
                    Bạn khẳng định sở hữu bản quyền hoặc có đủ quyền sử dụng hình ảnh/nội dung đó.
                  </li>
                  <li>
                    Bạn cấp cho VeggieLife quyền miễn phí bản quyền để lưu trữ, hiển thị và giới thiệu công thức đến cộng đồng ăn chay.
                  </li>
                  <li>
                    Nghiêm cấm đăng tải nội dung chứa thành phần thịt động vật, công thức phản khoa học, nội dung xuyên tạc, thù địch hoặc trái với văn hóa ẩm thực chay.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section
              id="disclaimer"
              className="scroll-mt-24 rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/20 md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-amber-900 dark:text-amber-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-sm font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                  4
                </span>
                <span>Giới hạn trách nhiệm Dinh dưỡng & Y tế (Quan trọng)</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
                <div className="rounded-xl border border-amber-300 bg-amber-100/60 p-4 dark:border-amber-800 dark:bg-amber-900/40 font-medium">
                  ⚠️ <strong>Cảnh báo y tế:</strong> Nền tảng VeggieLife được xây dựng với mục đích hỗ trợ định hướng lối sống xanh, tham khảo dinh dưỡng và chia sẻ công thức ẩm thực. Hệ thống <strong>không phải là một cơ sở y tế</strong> và không cung cấp dịch vụ điều trị bệnh.
                </div>
                <p>
                  4.1. <strong>Tính năng phân tích dị ứng:</strong> Hệ thống cung cấp cảnh báo thành phần dị ứng và phụ gia E-number dựa trên cơ sở dữ liệu tham khảo tiêu chuẩn quốc tế và trường phái ăn chay mà bạn khai báo (Thuần chay Vegan, Ăn chay có trứng sữa Lacto-Ovo, Ăn chay Phật giáo...). Tuy nhiên, quy trình chế biến thực tế tại nhà hoặc nhà hàng có thể tiềm ẩn nguy cơ nhiễm chéo.
                </p>
                <p>
                  4.2. <strong>Trách nhiệm cá nhân:</strong> Người dùng có tiền sử dị ứng nghiêm trọng, phụ nữ mang thai, người mắc bệnh lý mạn tính (tiểu đường, tim mạch, suy thận...) cần tham khảo ý kiến bác sĩ chuyên khoa hoặc chuyên gia dinh dưỡng được cấp phép trước khi áp dụng bất kỳ thực đơn nào. VeggieLife miễn trừ trách nhiệm đối với các rủi ro phát sinh từ việc người dùng tự ý áp dụng chế độ ăn uống không phù hợp với thể trạng.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section
              id="ai-features"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  5
                </span>
                <span>Tính năng AI & Quét tủ lạnh / Mã vạch</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  5.1. <strong>Công nghệ AI Vision:</strong> Tính năng quét tủ lạnh và quét mã vạch sử dụng mô hình thị giác máy tính và học máy để nhận diện nguyên liệu chay từ ảnh chụp thực tế.
                </p>
                <p>
                  5.2. <strong>Độ chính xác tương đối:</strong> Kết quả nhận diện phụ thuộc vào góc chụp, ánh sáng và bao bì thực phẩm. Người dùng cần luôn kiểm tra lại bảng danh sách nguyên liệu và điều chỉnh trước khi bấm lưu vào tủ lạnh hoặc gợi ý thực đơn.
                </p>
                <p>
                  5.3. <strong>Hạn mức truy vấn (Quota):</strong> Nhằm đảm bảo tài nguyên hệ thống, mỗi tài khoản Khách / Thành viên / VIP sẽ áp dụng hạn mức quét theo quy định trong từng thời kỳ (BR-SCAN-QUOTA).
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section
              id="subscription"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  6
                </span>
                <span>Gói VIP & Điều khoản thanh toán</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  6.1. <strong>Gói hội viên VIP:</strong> VeggieLife cung cấp các gói nâng cấp VIP với quyền lợi mở rộng hạn mức AI, tạo thực đơn tuần không giới hạn và công thức độc quyền.
                </p>
                <p>
                  6.2. <strong>Phương thức thanh toán:</strong> Mọi giao dịch được thanh toán bằng tiền đồng Việt Nam (VNĐ) qua các cổng thanh toán uy tín (MoMo, VietQR / chuyển khoản ngân hàng).
                </p>
                <p>
                  6.3. <strong>Chính sách hoàn tiền:</strong> Nếu có sự cố lỗi hệ thống khiến gói VIP không được kích hoạt sau khi đã thanh toán thành công, vui lòng liên hệ bộ phận hỗ trợ trong vòng 48 giờ để được kiểm tra và kích hoạt bù hoặc hoàn tiền.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section
              id="termination"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  7
                </span>
                <span>Tạm dừng, Khóa tài khoản & Xóa dữ liệu</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  7.1. <strong>Xử lý vi phạm:</strong> VeggieLife có quyền cảnh cáo, tạm dừng hoặc khóa vĩnh viễn tài khoản nếu người dùng có hành vi gian lận, tấn công hệ thống mạng, quấy rối thành viên khác, hoặc phát tán nội dung vi phạm tiêu chuẩn cộng đồng chay.
                </p>
                <p>
                  7.2. <strong>Yêu cầu xóa tài khoản:</strong> Bạn có quyền yêu cầu xóa tài khoản tại trang Cài đặt hồ sơ cá nhân. Hệ thống áp dụng <strong>thời gian ân hạn 30 ngày</strong>: trong thời gian này, bạn có thể đăng nhập lại để khôi phục tài khoản nếu đổi ý. Hết 30 ngày, toàn bộ thông tin cá nhân sẽ bị xóa vĩnh viễn theo quy định.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section
              id="general"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  8
                </span>
                <span>Điều khoản chung & Thông tin liên hệ</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  8.1. <strong>Sửa đổi điều khoản:</strong> VeggieLife có thể cập nhật bản Điều khoản này khi có sự thay đổi về pháp lý hoặc tính năng sản phẩm. Mọi sửa đổi quan trọng sẽ được thông báo đến người dùng qua email hoặc biểu ngữ trên website.
                </p>
                <p>
                  8.2. <strong>Luật điều chỉnh:</strong> Điều khoản này được điều chỉnh và giải thích theo quy định của pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.
                </p>
                <p>
                  8.3. <strong>Liên hệ:</strong>
                </p>
                <div className="rounded-xl bg-surface-container-low p-4 text-on-surface">
                  <p className="font-semibold text-primary">Dự án VeggieLife — Ẩm thực & Dinh dưỡng Chay</p>
                  <p className="mt-1">Địa chỉ email: <a href="mailto:support@veggielife.vn" className="text-primary underline">support@veggielife.vn</a></p>
                  <p>Website: <a href="https://veggielife.vn" className="text-primary underline">https://veggielife.vn</a></p>
                </div>
              </div>
            </section>

            {/* Footer actions inside content */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-surface-container-high bg-surface-container-low p-6 sm:flex-row">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-headline-sm text-headline-sm text-primary">
                  Tìm hiểu thêm về quyền riêng tư?
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Xem chi tiết cách chúng tôi bảo vệ thông tin sức khỏe và dữ liệu của bạn.
                </p>
              </div>
              <Link
                to={PATHS.PRIVACY}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-5 py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-xs transition hover:bg-primary"
              >
                <span>Xem Chính sách bảo mật</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

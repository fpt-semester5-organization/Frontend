import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { useLegalDocuments } from '../hooks/useLegalDocuments';
import { formatDateTime } from '@/lib/format';
import type { LegalDocType } from '../types/legal.types';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  ArrowLeft,
  ChevronRight,
  Mail,
  Printer,
  CheckCircle2,
  ExternalLink,
  Download,
  Calendar,
} from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('collection');
  const [selectedScanDoc, setSelectedScanDoc] = useState<LegalDocType>('PRIVACY');

  const { data: legalDocs } = useLegalDocuments();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Chính sách bảo mật | VeggieLife';
  }, []);

  const sections = [
    { id: 'collection', title: '1. Dữ liệu chúng tôi thu thập' },
    { id: 'official-docs', title: '2. Văn bản pháp lý số hóa (Cloudinary)' },
    { id: 'purpose', title: '3. Mục đích sử dụng dữ liệu' },
    { id: 'ai-vision', title: '4. Xử lý ảnh Quét tủ lạnh & Mã vạch' },
    { id: 'health-profile', title: '5. Dữ liệu dinh dưỡng & Hồ sơ dị ứng' },
    { id: 'sharing', title: '6. Chia sẻ thông tin & Bên thứ ba' },
    { id: 'security', title: '7. Bảo mật và Lưu trữ dữ liệu' },
    { id: 'user-rights', title: '8. Quyền của bạn với dữ liệu cá nhân' },
    { id: 'contact', title: '9. Thay đổi chính sách & Kênh khiếu nại' },
  ];

  const scanTabs: Array<{
    id: LegalDocType;
    label: string;
    url: string | undefined;
    pdfPath: string;
  }> = [
    {
      id: 'PRIVACY',
      label: 'Chính sách bảo mật',
      url: legalDocs?.privacyPolicyUrl,
      pdfPath: '/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.pdf',
    },
    {
      id: 'TERMS',
      label: 'Điều khoản dịch vụ',
      url: legalDocs?.termsOfServiceUrl,
      pdfPath: '/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.pdf',
    },
    {
      id: 'USER_AGREEMENT',
      label: 'Bản cam kết người dùng',
      url: legalDocs?.userAgreementUrl,
      pdfPath: '/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.pdf',
    },
    {
      id: 'VEGAN_DISCLAIMER',
      label: 'Quy định AI & Miễn trừ (NĐ 142/2026/NĐ-CP)',
      url: legalDocs?.veganDisclaimerUrl,
      pdfPath: '/legal/Quy_Dinh_AI_Va_Mien_Tru_Nghi_Dinh_142_2026.pdf',
    },
  ];

  const currentScan = scanTabs.find((t) => t.id === selectedScanDoc) ?? scanTabs[0];

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
            className="inline-flex items-center gap-2 rounded-lg border border-surface-container-high bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link to={PATHS.HOME} className="hover:text-primary hover:underline">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-on-surface">Chính sách bảo mật</span>
          </div>
        </div>

        {/* Hero Header Banner */}
        <header className="mb-10 overflow-hidden rounded-2xl border border-surface-container-high bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Cam kết an toàn dữ liệu cá nhân</span>
                <span className="text-primary">
                  • {legalDocs?.updatedAt ? `Cập nhật: ${formatDateTime(legalDocs.updatedAt)}` : 'Cập nhật 10/2026'}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-primary">
                Chính Sách Bảo Mật Quyền Riêng Tư
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                <strong>VeggieLife</strong> coi trọng và cam kết bảo vệ dữ liệu cá nhân, thông tin
                sức khỏe và hình ảnh nguyên liệu thực phẩm của bạn bằng các tiêu chuẩn bảo mật nghiêm
                ngặt nhất.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to={PATHS.TERMS}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 font-label-md text-label-md font-medium text-primary transition hover:bg-primary/10"
              >
                <FileText className="h-4 w-4" />
                <span>Điều khoản sử dụng</span>
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest px-4 py-2 font-label-md text-label-md font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface cursor-pointer"
                title="In chính sách"
              >
                <Printer className="h-4 w-4" />
                <span>In bản sao</span>
              </button>
            </div>
          </div>

          {/* Core Privacy Principles */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                <Eye className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Minh bạch 100%</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Luôn nêu rõ lý do và loại dữ liệu thu thập; không thu thập lén lút dữ liệu nhạy cảm.
              </p>
            </div>

            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-fixed text-on-secondary-fixed">
                <Lock className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Mã hóa an toàn</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Mật khẩu băm chuẩn ngành, dữ liệu truyền tải bảo mật qua HTTPS/TLS mã hóa cao cấp.
              </p>
            </div>

            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Tuân thủ PDPD</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân nhạy cảm và thời gian chờ xóa 30 ngày (có thể khôi phục).
              </p>
            </div>

            <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest/80 p-4">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">Quyền kiểm soát</h4>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Bạn toàn quyền cập nhật thông tin dị ứng hoặc gửi yêu cầu xóa tài khoản bất cứ lúc nào.
              </p>
            </div>
          </div>
        </header>

        {/* Content & Table of Contents Sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Sticky Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-[90px] space-y-4">
              <div className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-5 shadow-xs">
                <h3 className="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm text-primary">
                  <FileText className="h-4 w-4" />
                  <span>Mục lục chính sách</span>
                </h3>
                <nav className="flex flex-col gap-1">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleScrollTo(sec.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-all cursor-pointer ${
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

              {/* Data Protection Officer contact */}
              <div className="rounded-2xl border border-surface-container-high bg-surface-container-low p-5">
                <h4 className="font-label-lg text-label-lg font-semibold text-on-surface">
                  Cán bộ bảo vệ dữ liệu (DPO)
                </h4>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  Nếu bạn cần hỗ trợ về quyền riêng tư, truy xuất hoặc yêu cầu xóa dữ liệu cá nhân, vui lòng liên hệ:
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
                  <Mail className="h-4 w-4" />
                  <span>privacy@veggielife.vn</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content */}
          <div className="space-y-8 lg:col-span-8">
            {/* Section 1 */}
            <section
              id="collection"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  1
                </span>
                <span>Dữ liệu chúng tôi thu thập</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  Chúng tôi chỉ thu thập các thông tin thực sự cần thiết nhằm cung cấp và cá nhân hóa trải nghiệm ẩm thực chay cho bạn:
                </p>
                <ul className="list-disc space-y-2 pl-6 text-on-surface">
                  <li>
                    <strong>Thông tin tài khoản:</strong> Họ và tên, địa chỉ email, mật khẩu (được mã hóa một chiều qua thuật toán bcrypt/Argon2 an toàn), ảnh đại diện (nếu bạn tải lên hoặc đăng nhập qua Google OAuth).
                  </li>
                  <li>
                    <strong>Thông tin sở thích dinh dưỡng & sức khỏe:</strong> Trường phái ăn chay (Thuần chay Vegan, Lacto, Ovo-Lacto, Ăn chay kỳ, Chay thực dưỡng), danh sách dị ứng thực phẩm (đậu phộng, gluten, đậu nành...), mục tiêu calo và cân nặng.
                  </li>
                  <li>
                    <strong>Dữ liệu hình ảnh tải lên:</strong> Ảnh chụp bên trong tủ lạnh và ảnh mã vạch bao bì sản phẩm thực phẩm bạn gửi lên để AI phân tích.
                  </li>
                  <li>
                    <strong>Dữ liệu kỹ thuật & nhật ký:</strong> Địa chỉ IP, trình duyệt, thời gian truy cập nhằm ngăn chặn tấn công spam hoặc brute force mật khẩu.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2: Official Digitized Documents from Backend */}
            <section
              id="official-docs"
              className="scroll-mt-24 rounded-2xl border border-primary/20 bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                    2
                  </span>
                  <span>Văn bản pháp lý số hóa (Cloudinary)</span>
                </h2>
                {legalDocs?.updatedAt && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Cập nhật: {formatDateTime(legalDocs.updatedAt)}</span>
                  </span>
                )}
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                Xem bản scan văn bản chính thức được quản lý tập trung trên máy chủ Cloudinary của hệ thống:
              </p>

              {/* Document selection tabs */}
              <div className="flex flex-wrap gap-2 mb-4 border-b border-surface-container-high pb-3">
                {scanTabs.map((tab) => {
                  const isSelected = selectedScanDoc === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedScanDoc(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs md:text-sm font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-on-primary font-semibold shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Document Preview Card */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-low/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-label-md text-label-md font-semibold text-primary">
                    {currentScan.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {currentScan.url && (
                      <a
                        href={currentScan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Mở ảnh gốc Cloudinary</span>
                      </a>
                    )}
                    <a
                      href={currentScan.pdfPath}
                      download
                      className="inline-flex items-center gap-1 rounded bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-on-surface-variant border border-surface-container-high hover:bg-surface-container transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Tải file PDF</span>
                    </a>
                  </div>
                </div>

                {currentScan.url ? (
                  <div className="overflow-hidden rounded-lg border border-surface-container-high bg-white shadow-xs flex justify-center">
                    <img
                      src={currentScan.url}
                      alt={currentScan.label}
                      className="w-full max-h-[550px] object-contain object-top"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-on-surface-variant">
                    Đang kết nối API máy chủ Backend...
                  </div>
                )}
              </div>
            </section>

            {/* Section 3 */}
            <section
              id="purpose"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  3
                </span>
                <span>Mục đích sử dụng dữ liệu</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>Dữ liệu thu thập được sử dụng cho các mục đích hợp pháp sau:</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5">
                    <p className="font-semibold text-primary">Cá nhân hóa thực đơn</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Gợi ý món ăn và tuần ăn phù hợp chính xác với trường phái ăn chay và loại trừ các món gây dị ứng cho bạn.
                    </p>
                  </div>
                  <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5">
                    <p className="font-semibold text-primary">Phục vụ tính năng Tủ lạnh thông minh</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Lưu trữ danh sách nguyên liệu bạn đang có để gợi ý công thức tận dụng thực phẩm tránh lãng phí.
                    </p>
                  </div>
                  <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5">
                    <p className="font-semibold text-primary">Xác thực & Bảo vệ tài khoản</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Gửi mã OTP xác minh email, khôi phục mật khẩu và ngăn ngừa đăng nhập trái phép.
                    </p>
                  </div>
                  <div className="rounded-xl border border-surface-container-high bg-surface-container-low p-3.5">
                    <p className="font-semibold text-primary">Nâng cao chất lượng AI</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Cải thiện độ chính xác của mô hình nhận diện nguyên liệu chay Việt Nam từ phản hồi của người dùng.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section
              id="ai-vision"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  4
                </span>
                <span>Xử lý ảnh Quét tủ lạnh & Mã vạch (AI Vision)</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  Tính năng <strong>Fridge Scanner (Quét tủ lạnh)</strong> và <strong>Barcode Scanner (Quét mã vạch)</strong> áp dụng quy trình xử lý hình ảnh bảo mật đặc thù:
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-on-surface">
                  <li>
                    Ảnh chụp từ thiết bị của bạn được nén và mã hóa trước khi gửi tới cụm dịch vụ AI Vision (FastAPI & Google Gemini Vision).
                  </li>
                  <li>
                    <strong>Phạm vi trích xuất:</strong> Mô hình AI chỉ tập trung nhận dạng tên thực phẩm, rau củ quả, nhãn mác gia vị và trạng thái tươi/héo. Chúng tôi <strong>không nhận diện khuôn mặt người</strong> hay các vật dụng nhạy cảm khác trong ảnh.
                  </li>
                  <li>
                    Sau khi hoàn tất quá trình nhận diện và trả về danh sách nguyên liệu, ảnh gốc tạm thời sẽ được tự động dọn dẹp theo chính sách lưu trữ bảo mật.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section
              id="health-profile"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  5
                </span>
                <span>Dữ liệu dinh dưỡng & Hồ sơ dị ứng</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  Thông tin về dị ứng thực phẩm và tình trạng sức khỏe cá nhân của bạn là dữ liệu đặc biệt nhạy cảm:
                </p>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-on-surface">
                  <p className="font-semibold text-primary">Cam kết bảo mật dữ liệu sức khỏe:</p>
                  <p className="mt-1 text-sm">
                    Dữ liệu này chỉ được lưu trữ nội bộ nhằm phục vụ việc lọc và cảnh báo tự động khi bạn xem công thức nấu ăn hoặc quét thực phẩm. Dữ liệu này tuyệt đối <strong>không bao giờ</strong> được chia sẻ công khai trên trang cá nhân của bạn hoặc cung cấp cho bất kỳ đối tác thương mại nào.
                  </p>
                </div>
                {legalDocs?.medicalDisclaimer && (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    ⚠️ <strong>Khuyến cáo y khoa chuẩn hệ thống:</strong> {legalDocs.medicalDisclaimer}
                  </div>
                )}
              </div>
            </section>

            {/* Section 6 */}
            <section
              id="sharing"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  6
                </span>
                <span>Chia sẻ thông tin & Bên thứ ba</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>Chúng tôi chỉ chia sẻ dữ liệu trong các trường hợp giới hạn sau:</p>
                <ul className="list-disc space-y-1.5 pl-6 text-on-surface">
                  <li>
                    <strong>Cổng thanh toán điện tử (MoMo, VietQR):</strong> Khi bạn mua gói VIP, các thông tin đơn hàng được truyền tải trực tiếp qua giao thức an toàn đến cổng thanh toán. VeggieLife không lưu trữ số thẻ ngân hàng hoặc mật khẩu ví của bạn.
                  </li>
                  <li>
                    <strong>Dịch vụ bản đồ (Goong Maps / Google Maps):</strong> Khi bạn tìm kiếm quán chay gần đây, vị trí địa lý của bạn chỉ được dùng trên trình duyệt để hiển thị khoảng cách và không được lưu giữ cố định.
                  </li>
                  <li>
                    <strong>Yêu cầu pháp luật:</strong> Chúng tôi chỉ cung cấp thông tin khi có yêu cầu hợp pháp bằng văn bản từ cơ quan thực thi pháp luật có thẩm quyền theo quy định của pháp luật Việt Nam.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section
              id="security"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  7
                </span>
                <span>Bảo mật và Lưu trữ dữ liệu</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  Hệ thống VeggieLife áp dụng các biện pháp phòng vệ nhiều lớp:
                </p>
                <div className="space-y-2 text-on-surface">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                    <span>Mã hóa đường truyền dữ liệu SSL/TLS trên toàn bộ hệ thống web và API.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                    <span>Kiểm soát phân quyền nghiêm ngặt theo mô hình RBAC (Role-Based Access Control).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                    <span>Ghi nhận Audit Log mọi thao tác quản trị viên đối với tài khoản và dữ liệu hệ thống.</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section
              id="user-rights"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  8
                </span>
                <span>Quyền của bạn với dữ liệu cá nhân</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>Bạn có toàn bộ các quyền cơ bản đối với dữ liệu của mình:</p>
                <ul className="list-disc space-y-1.5 pl-6 text-on-surface">
                  <li>
                    <strong>Quyền truy cập & chỉnh sửa:</strong> Bạn có thể xem và cập nhật hồ sơ, sở thích ăn chay bất cứ lúc nào trong trang Hồ sơ cá nhân.
                  </li>
                  <li>
                    <strong>Quyền rút lại sự đồng ý:</strong> Bạn có thể ngừng sử dụng dịch vụ hoặc tắt quyền truy cập camera/vị trí trên trình duyệt.
                  </li>
                  <li>
                    <strong>Quyền xóa tài khoản (Right to be Forgotten):</strong> Bạn có thể gửi yêu cầu xóa tài khoản tại phần cài đặt bảo mật. Hệ thống áp dụng <strong>thời gian chờ 30 ngày</strong> trước khi tiến hành xóa vĩnh viễn toàn bộ dữ liệu cá nhân liên quan khỏi cơ sở dữ liệu.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 9 */}
            <section
              id="contact"
              className="scroll-mt-24 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-6 shadow-xs md:p-8"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-headline-sm text-headline-sm font-bold text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-fixed text-sm font-bold text-on-primary-fixed">
                  9
                </span>
                <span>Thay đổi chính sách & Kênh khiếu nại</span>
              </h2>
              <div className="space-y-3 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                <p>
                  Chính sách này có thể được điều chỉnh để phản ánh các thay đổi trong dịch vụ hoặc yêu cầu pháp luật mới. Chúng tôi sẽ thông báo rõ ràng cho bạn khi có cập nhật quan trọng.
                </p>
                <div className="rounded-xl bg-surface-container-low p-4 text-on-surface">
                  <p className="font-semibold text-primary">Bộ phận Tiếp nhận Khiếu nại Quyền Riêng Tư</p>
                  <p className="mt-1">Email: <a href="mailto:privacy@veggielife.vn" className="text-primary underline">privacy@veggielife.vn</a></p>
                  <p>Hỗ trợ người dùng: <a href="mailto:support@veggielife.vn" className="text-primary underline">support@veggielife.vn</a></p>
                </div>
              </div>
            </section>

            {/* Footer actions inside content */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-surface-container-high bg-surface-container-low p-6 sm:flex-row">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-headline-sm text-headline-sm text-primary">
                  Bạn muốn tìm hiểu thêm về Điều khoản dịch vụ?
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Xem quy định đầy đủ về quyền và trách nhiệm khi sử dụng VeggieLife.
                </p>
              </div>
              <Link
                to={PATHS.TERMS}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-5 py-2.5 font-label-md text-label-md font-semibold text-on-primary shadow-xs transition hover:bg-primary"
              >
                <span>Xem Điều khoản dịch vụ</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

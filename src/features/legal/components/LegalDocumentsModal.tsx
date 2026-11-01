import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PATHS } from '@/routes/paths';
import { formatDateTime } from '@/lib/format';
import { useLegalDocuments } from '../hooks/useLegalDocuments';
import type { LegalDocType } from '../types/legal.types';
import {
  FileText,
  ShieldCheck,
  Scale,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  HeartHandshake,
  Mail,
  Printer,
  Download,
  Eye,
} from 'lucide-react';

export interface LegalDocumentsModalProps {
  show: boolean;
  onHide: () => void;
  initialDoc?: LegalDocType;
  onAgree?: () => void;
}

export function LegalDocumentsModal({
  show,
  onHide,
  initialDoc = 'TERMS',
  onAgree,
}: LegalDocumentsModalProps) {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);
  const { data: legalDocs, isFetching } = useLegalDocuments(show);

  useEffect(() => {
    if (show) {
      setActiveDoc(initialDoc);
    }
  }, [show, initialDoc]);

  const isTerms = activeDoc === 'TERMS';

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            {isTerms ? (
              <Scale className="h-5 w-5 text-primary" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-primary" />
            )}
            <span className="font-headline-sm text-headline-sm">
              {isTerms ? 'Điều Khoản Dịch Vụ' : 'Chính Sách Bảo Mật'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveDoc('TERMS')}
              className={`rounded-lg px-3 py-1 text-xs md:text-sm font-medium transition-colors cursor-pointer ${
                isTerms
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              Điều khoản
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('PRIVACY')}
              className={`rounded-lg px-3 py-1 text-xs md:text-sm font-medium transition-colors cursor-pointer ${
                !isTerms
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              Chính sách bảo mật
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col max-h-[82vh]">
        {/* Scrollable Document Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-surface-container-lowest">
          {/* Hero Header Banner (Directly matches the user design) */}
          <header className="overflow-hidden rounded-2xl border border-surface-container-high bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-surface-container-lowest p-5 shadow-xs md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                  {isTerms ? <Scale className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  <span>{isTerms ? 'Văn bản pháp lý chính thức' : 'Cam kết an toàn dữ liệu cá nhân'}</span>
                  <span className="text-primary">
                    • {legalDocs?.updatedAt ? `Cập nhật: ${formatDateTime(legalDocs.updatedAt)}` : 'Hiệu lực từ 10/2026'}
                  </span>
                </div>
                <h2 className="font-headline-lg text-headline-lg font-bold text-primary">
                  {isTerms ? 'Điều Khoản Sử Dụng Dịch Vụ' : 'Chính Sách Bảo Mật Quyền Riêng Tư'}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {isTerms ? (
                    <>
                      Chào mừng bạn đến với <strong>VeggieLife</strong> — Nền tảng ẩm thực và dinh dưỡng
                      chay thông minh. Vui lòng đọc kỹ các điều khoản dưới đây trước khi đăng ký tài
                      khoản hoặc sử dụng dịch vụ của chúng tôi.
                    </>
                  ) : (
                    <>
                      <strong>VeggieLife</strong> coi trọng và cam kết bảo vệ dữ liệu cá nhân, thông tin
                      sức khỏe và hình ảnh nguyên liệu thực phẩm của bạn bằng các tiêu chuẩn bảo mật nghiêm ngặt nhất.
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDoc(isTerms ? 'PRIVACY' : 'TERMS')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-1.5 font-label-md text-label-md font-medium text-primary transition hover:bg-primary/10 cursor-pointer"
                >
                  {isTerms ? <ShieldCheck className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  <span>{isTerms ? 'Chính sách bảo mật' : 'Điều khoản dịch vụ'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-container-high bg-surface-container-lowest px-3.5 py-1.5 font-label-md text-label-md font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface cursor-pointer"
                  title="In bản sao"
                >
                  <Printer className="h-4 w-4" />
                  <span>In bản sao</span>
                </button>
              </div>
            </div>

            {/* Quick Summary Cards (Exactly matching screenshot) */}
            {isTerms ? (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    {legalDocs?.medicalDisclaimer ||
                      'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.'}
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
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân nhạy cảm và thời gian ân hạn xóa.
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
            )}
          </header>

          {/* Detailed Document Clauses */}
          {isTerms ? (
            <div className="space-y-6">
              {/* Clause 1 */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  1. Giới thiệu & Phạm vi áp dụng
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <p>
                    1.1. Điều khoản này cấu thành thỏa thuận có giá trị ràng buộc giữa bạn và Nền tảng VeggieLife.
                  </p>
                  <p>
                    1.2. Bằng cách tích chọn <em>&quot;Tôi đồng ý với Điều khoản và Chính sách bảo mật&quot;</em> khi đăng ký tài khoản, bạn xác nhận đã đọc, hiểu và đồng ý vô điều kiện chịu sự ràng buộc của bản Điều khoản này.
                  </p>
                  <p>
                    1.3. VeggieLife cung cấp: tra cứu công thức món chay, trợ lý AI quét tủ lạnh & mã vạch sản phẩm, gợi ý thực đơn tuần, tìm quán chay và chia sẻ cộng đồng.
                  </p>
                </div>
              </div>

              {/* Clause 2 */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  2. Tài khoản & Trách nhiệm bảo mật
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <p>
                    2.1. <strong>Độ tuổi sử dụng:</strong> Người dùng từ đủ 13 tuổi trở lên có thể tự đăng ký tài khoản.
                  </p>
                  <p>
                    2.2. <strong>Bảo mật tài khoản:</strong> Bạn có trách nhiệm tự bảo vệ mật khẩu, mã OTP xác thực và thiết bị cá nhân. Không chia sẻ mã OTP cho bất kỳ ai.
                  </p>
                  <p>
                    2.3. <strong>Tính xác thực:</strong> Bạn cam kết cung cấp email chính chủ để nhận mã OTP kích hoạt và các thông báo vận hành.
                  </p>
                </div>
              </div>

              {/* Clause 3 */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  3. Quyền sở hữu trí tuệ & Tiêu chuẩn cộng đồng
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <p>
                    3.1. Toàn bộ thiết kế, logo, thuật toán AI gợi ý và cơ sở dữ liệu dinh dưỡng thuộc quyền sở hữu của VeggieLife.
                  </p>
                  <p>
                    3.2. <strong>Quy tắc cấm kỵ (D109):</strong> Nghiêm cấm đăng tải nội dung chứa thịt động vật hoặc cố ý gắn nhãn sai lệch trường phái ăn chay; nội dung kích động bạo lực, xúc phạm thành viên khác.
                  </p>
                </div>
              </div>

              {/* Clause 4 */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-amber-900 dark:text-amber-200">
                  4. Giới hạn trách nhiệm Dinh dưỡng & Y tế (Quan trọng)
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-amber-950/90 dark:text-amber-200/90 leading-relaxed">
                  <p className="font-semibold">
                    ⚠️ {legalDocs?.medicalDisclaimer ||
                      'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.'}
                  </p>
                  <p>
                    4.1. Hệ thống không phải là cơ sở y tế. Phụ nữ mang thai hoặc bệnh nhân mạn tính cần tham vấn chuyên gia dinh dưỡng hoặc bác sĩ có chứng chỉ hành nghề trước khi áp dụng thực đơn ăn chay nghiêm ngặt.
                  </p>
                </div>
              </div>

              {/* Clause 5 */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  5. Tạm dừng, Khóa tài khoản & Xóa dữ liệu (Thời gian ân hạn 30 ngày)
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <p>
                    5.1. Bạn có quyền yêu cầu xóa tài khoản tại trang Cài đặt bảo mật.
                  </p>
                  <p>
                    5.2. Hệ thống áp dụng <strong>thời gian ân hạn 30 ngày</strong>: trong 30 ngày này, bạn có thể đăng nhập lại để khôi phục tài khoản nếu đổi ý. Hết 30 ngày, toàn bộ thông tin cá nhân sẽ bị xóa vĩnh viễn theo Nghị định 13/2023/NĐ-CP.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Privacy 1 */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  1. Dữ liệu chúng tôi thu thập
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <ul className="list-disc space-y-1.5 pl-6 text-on-surface">
                    <li><strong>Thông tin tài khoản:</strong> Họ tên, email, mật khẩu băm mã hóa một chiều.</li>
                    <li><strong>Dữ liệu sức khỏe & dinh dưỡng nhạy cảm:</strong> Trường phái ăn chay, danh sách thực phẩm gây dị ứng, mục tiêu calo.</li>
                    <li><strong>Dữ liệu hình ảnh AI Vision:</strong> Ảnh chụp tủ lạnh và mã vạch bao bì sản phẩm (chỉ trích xuất nguyên liệu chay, không nhận diện khuôn mặt).</li>
                  </ul>
                </div>
              </div>

              {/* Privacy 2 */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  2. Cam kết bảo mật dữ liệu sức khỏe cá nhân (Nghị định 13/2023/NĐ-CP)
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface leading-relaxed">
                  <p>
                    Thông tin dị ứng và thể trạng cá nhân được lưu trữ nội bộ nhằm phục vụ lọc món ăn an toàn. Dữ liệu này tuyệt đối <strong>không bao giờ</strong> được chia sẻ công khai hoặc bán cho bên thứ ba.
                  </p>
                  {legalDocs?.medicalDisclaimer && (
                    <div className="mt-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                      ⚠️ {legalDocs.medicalDisclaimer}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy 3 */}
              <div className="rounded-xl border border-surface-container-high bg-surface-container-lowest p-5">
                <h3 className="mb-2 font-headline-sm text-headline-sm font-bold text-primary">
                  3. Quyền của bạn & Kênh khiếu nại DPO
                </h3>
                <div className="space-y-2 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  <p>
                    Bạn có quyền truy cập, chỉnh sửa, hoặc gửi yêu cầu xóa tài khoản (thời gian ân hạn 30 ngày) bất cứ lúc nào.
                  </p>
                  <p>
                    Mọi thắc mắc và khiếu nại về quyền riêng tư, vui lòng liên hệ: <a href="mailto:privacy@veggielife.vn" className="text-primary font-semibold underline">privacy@veggielife.vn</a>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Official Signed Document Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-container-high bg-surface-container-low p-4 text-xs">
            <div className="flex items-center gap-2 text-on-surface">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Bản quyền văn bản chính thức được lưu trữ trên Cloudinary của VeggieLife.</span>
            </div>
            <div className="flex items-center gap-2">
              {(isTerms ? legalDocs?.termsOfServiceUrl : legalDocs?.privacyPolicyUrl) && (
                <a
                  href={isTerms ? legalDocs?.termsOfServiceUrl : legalDocs?.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Xem ảnh scan gốc</span>
                </a>
              )}
              <a
                href={isTerms ? '/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.pdf' : '/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.pdf'}
                download
                className="inline-flex items-center gap-1 font-semibold text-on-surface-variant hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải PDF</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-container-high bg-surface-container-lowest p-4">
          <Link
            to={isTerms ? PATHS.TERMS : PATHS.PRIVACY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Mở trang đầy đủ trong tab mới</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onHide}>
              Đóng
            </Button>
            {onAgree && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAgree();
                  onHide();
                }}
              >
                Tôi đồng ý với điều khoản này
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

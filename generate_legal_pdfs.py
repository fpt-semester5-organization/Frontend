# -*- coding: utf-8 -*-
"""
Generator for VeggieLife Legal & Vegetarian Policy PDF Documents.
Creates 4 official PDF documents in:
 - D:/Exported_Legal_PDFs/
 - D:/Frontend/docs/legal/
"""

import os
import sys
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Arial Fonts from Windows Fonts
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic', r'C:\Windows\Fonts\ariali.ttf'))
pdfmetrics.registerFont(TTFont('Arial-BoldItalic', r'C:\Windows\Fonts\arialbi.ttf'))

# Palette
PRIMARY = colors.HexColor('#1b4d3e')          # Deep Forest Green
PRIMARY_CONTAINER = colors.HexColor('#e8f5e9')
PRIMARY_LIGHT = colors.HexColor('#2d6a4f')
ACCENT_AMBER = colors.HexColor('#b45309')
AMBER_BG = colors.HexColor('#fffbeb')
AMBER_BORDER = colors.HexColor('#f59e0b')
RED_ALERT_BG = colors.HexColor('#fef2f2')
RED_ALERT_BORDER = colors.HexColor('#ef4444')
TEXT_MAIN = colors.HexColor('#1f2937')
TEXT_MUTED = colors.HexColor('#4b5563')
BORDER_COLOR = colors.HexColor('#d1d5db')
BG_LIGHT = colors.HexColor('#f9fafb')
LINE_COLOR = colors.HexColor('#9ca3af')

class CustomNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, doc_title="VĂN BẢN PHÁP LÝ CHÍNH THỨC", **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.doc_title = doc_title

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.setFont('Arial', 8)
            self.setFillColor(TEXT_MUTED)
            self.drawString(54, 802, "VEGGIELIFE PLATFORM · NỀN TẢNG DINH DƯỠNG & ẨM THỰC CHAY THÔNG MINH")
            self.drawRightString(541, 802, self.doc_title)
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.6)
            self.line(54, 796, 541, 796)

        # Footer (All pages)
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.6)
        self.line(54, 45, 541, 45)

        self.setFont('Arial-Italic', 8)
        self.setFillColor(TEXT_MUTED)
        self.drawString(54, 32, "VeggieLife Legal & Compliance • Tuân thủ Nghị định 13/2023/NĐ-CP • Phiên bản 10/2026")
        self.drawRightString(541, 32, f"Trang {self._pageNumber} / {page_count}")
        self.restoreState()

def get_doc_styles():
    base = getSampleStyleSheet()
    return {
        'DocHeaderNation': ParagraphStyle(
            'DocHeaderNation', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=9.5, leading=13.5, alignment=TA_CENTER, textColor=TEXT_MAIN
        ),
        'DocHeaderMotto': ParagraphStyle(
            'DocHeaderMotto', parent=base['Normal'],
            fontName='Arial', fontSize=9, leading=13, alignment=TA_CENTER, textColor=TEXT_MAIN
        ),
        'DocPlatformHeader': ParagraphStyle(
            'DocPlatformHeader', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=9.5, leading=13.5, alignment=TA_CENTER, textColor=PRIMARY
        ),
        'DocTitle': ParagraphStyle(
            'DocTitle', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=15, leading=20, alignment=TA_CENTER, textColor=PRIMARY, spaceAfter=5
        ),
        'DocSubtitle': ParagraphStyle(
            'DocSubtitle', parent=base['Normal'],
            fontName='Arial-Italic', fontSize=9, leading=13.5, alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=14
        ),
        'Heading1': ParagraphStyle(
            'Heading1', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=11, leading=15, textColor=PRIMARY, spaceBefore=10, spaceAfter=5, keepWithNext=True
        ),
        'Heading2': ParagraphStyle(
            'Heading2', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=9.5, leading=13.5, textColor=PRIMARY_LIGHT, spaceBefore=7, spaceAfter=3, keepWithNext=True
        ),
        'Body': ParagraphStyle(
            'Body', parent=base['Normal'],
            fontName='Arial', fontSize=8.8, leading=13, alignment=TA_JUSTIFY, textColor=TEXT_MAIN, spaceAfter=5
        ),
        'Bullet': ParagraphStyle(
            'Bullet', parent=base['Normal'],
            fontName='Arial', fontSize=8.8, leading=12.5, leftIndent=14, firstLineIndent=-10, alignment=TA_JUSTIFY, textColor=TEXT_MAIN, spaceAfter=3
        ),
        'NoticeBoxText': ParagraphStyle(
            'NoticeBoxText', parent=base['Normal'],
            fontName='Arial', fontSize=8.5, leading=12.5, alignment=TA_JUSTIFY, textColor=colors.HexColor('#78350f')
        ),
        'RedAlertText': ParagraphStyle(
            'RedAlertText', parent=base['Normal'],
            fontName='Arial', fontSize=8.5, leading=12.5, alignment=TA_JUSTIFY, textColor=colors.HexColor('#991b1b')
        ),
        'ConsentBoxText': ParagraphStyle(
            'ConsentBoxText', parent=base['Normal'],
            fontName='Arial', fontSize=8.8, leading=13, alignment=TA_JUSTIFY, textColor=PRIMARY
        ),
        'TableHeader': ParagraphStyle(
            'TableHeader', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=8, leading=11, alignment=TA_CENTER, textColor=colors.white
        ),
        'TableCell': ParagraphStyle(
            'TableCell', parent=base['Normal'],
            fontName='Arial', fontSize=7.8, leading=10.5, textColor=TEXT_MAIN
        ),
        'TableCellBold': ParagraphStyle(
            'TableCellBold', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=7.8, leading=10.5, textColor=TEXT_MAIN
        ),
        'SignRole': ParagraphStyle(
            'SignRole', parent=base['Normal'],
            fontName='Arial-Bold', fontSize=9, leading=13, alignment=TA_CENTER, textColor=PRIMARY
        ),
        'SignNote': ParagraphStyle(
            'SignNote', parent=base['Normal'],
            fontName='Arial-Italic', fontSize=8, leading=11, alignment=TA_CENTER, textColor=TEXT_MUTED
        )
    }

def make_header_banner(styles, doc_number="01/2026/VGL-PL"):
    data = [
        [
            Paragraph("<b>HỆ THỐNG NỀN TẢNG VEGGIELIFE</b><br/>Ban Pháp chế & An toàn Ẩm thực Chay<br/><i>Mã văn bản: SỐ " + doc_number + "</i>", styles['DocPlatformHeader']),
            Paragraph("<b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br/><b>Độc lập – Tự do – Hạnh phúc</b><br/><i>TP. Hồ Chí Minh, ngày 30 tháng 10 năm 2026</i>", styles['DocHeaderMotto'])
        ]
    ]
    t = Table(data, colWidths=[240, 247])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    return t

def make_callout_box(styles, text, title="LƯU Ý QUAN TRỌNG", bg_color=AMBER_BG, border_color=AMBER_BORDER, icon="⚠️"):
    style = styles['NoticeBoxText'] if bg_color == AMBER_BG else (styles['RedAlertText'] if bg_color == RED_ALERT_BG else styles['ConsentBoxText'])
    p = Paragraph(f"<b>{icon} {title}:</b> {text}", style)
    t = Table([[p]], colWidths=[487])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_color),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    return t


def build_terms_doc(output_path):
    styles = get_doc_styles()
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54
    )
    story = []

    # Header Banner
    story.append(make_header_banner(styles, "01/2026/VGL-TOS"))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=12, spaceBefore=4))

    # Title
    story.append(Paragraph("ĐIỀU KHOẢN DỊCH VỤ VÀ QUY CHẾ HOẠT ĐỘNG CỘNG ĐỒNG", styles['DocTitle']))
    story.append(Paragraph("<b>(TERMS OF SERVICE & COMMUNITY CODE OF CONDUCT)</b><br/>Áp dụng bắt buộc đối với toàn bộ người dùng khi đăng ký tài khoản trên Nền tảng VeggieLife", styles['DocSubtitle']))

    # Callout Summary
    summary_text = (
        "Bằng việc tích chọn vào ô <i>'Tôi đồng ý với Điều khoản và Chính sách bảo mật'</i> tại bước Đăng ký "
        "(màn hình SCR-02), bạn xác nhận đã đủ điều kiện theo luật định, đã đọc hiểu toàn bộ nội dung và cam kết tuân thủ "
        "vô điều kiện các quy tắc được nêu trong văn bản này. Mọi hành vi vi phạm chuẩn mực ẩm thực chay, đăng tải thịt động vật "
        "hoặc gian lận tài khoản sẽ bị xử lý nghiêm khắc theo quy chế Báo động đỏ (Red Alert)."
    )
    story.append(make_callout_box(styles, summary_text, title="THỎA THUẬN PHÁP LÝ RÀNG BUỘC", bg_color=PRIMARY_CONTAINER, border_color=PRIMARY, icon="📌"))
    story.append(Spacer(1, 8))

    # Điều 1
    story.append(Paragraph("Điều 1. Giới thiệu chung và Định nghĩa thuật ngữ", styles['Heading1']))
    story.append(Paragraph("<b>1.1. Giới thiệu nền tảng:</b> VeggieLife là hệ sinh thái công nghệ số chuyên sâu về ẩm thực và dinh dưỡng chay thông minh, tích hợp các mô hình Trí tuệ nhân tạo (AI Vision nhận diện tủ lạnh, Barcode Scanner phân tích phụ gia thực phẩm E-numbers, Trợ lý AI lập thực đơn cá nhân hóa), cùng mạng xã hội chia sẻ công thức ẩm thực chay và bản đồ quán ăn chay tại Việt Nam.", styles['Body']))
    story.append(Paragraph("<b>1.2. Định nghĩa các vai trò và thuật ngữ cốt lõi:</b>", styles['Body']))
    story.append(Paragraph("• <i>Khách vãng lai (Guest):</i> Người dùng chưa đăng nhập, sử dụng phiên ẩn danh (Anonymous JWT 24h) với hạn mức dùng thử AI tối đa 03 lượt/phiên và tra cứu bản đồ quán chay bán kính 5 km tối đa 03 lượt (BR-GUEST-03).", styles['Bullet']))
    story.append(Paragraph("• <i>Thành viên chính thức (Authorized Member):</i> Người dùng đã hoàn tất đăng ký tài khoản qua Email/Mật khẩu hoặc Google OAuth, đã xác thực mã OTP và thiết lập Hồ sơ dinh dưỡng ban đầu theo chuẩn quy định (BR-USR-01).", styles['Bullet']))
    story.append(Paragraph("• <i>Hội viên VIP (VIP Subscriber):</i> Thành viên trả phí định kỳ để sở hữu các quyền lợi nâng cao: quét ảnh tủ lạnh và mã vạch không giới hạn lượt, gợi ý thực đơn tuần chuyên sâu và công thức độc quyền.", styles['Bullet']))
    story.append(Paragraph("• <i>Danh mục 07 Trường phái Ăn chay Cốt lõi (BR-ADM-MAS-001):</i> Bộ tiêu chuẩn bất biến gồm Vegan, Lacto, Ovo, Lacto-Ovo, Chay kiêng ngũ vị tân (Buddhist), Pollotarian và Pescatarian.", styles['Bullet']))
    story.append(Paragraph("• <i>Báo động đỏ (Red Alert):</i> Cơ chế kiểm soát khẩn cấp tự động kích hoạt khi phát hiện công thức gắn nhãn trường phái chay nhưng lại chứa thành phần động vật hoặc thịt cấm.", styles['Bullet']))

    # Điều 2
    story.append(Paragraph("Điều 2. Điều kiện tham gia và Quy chuẩn bảo mật tài khoản", styles['Heading1']))
    story.append(Paragraph("<b>2.1. Độ tuổi quy định:</b> Người dùng từ đủ 13 tuổi trở lên được tự do đăng ký tài khoản. Người dùng dưới 13 tuổi phải có sự giám sát hoặc đồng ý rõ ràng từ cha mẹ/người giám hộ hợp pháp.", styles['Body']))
    story.append(Paragraph("<b>2.2. Tính duy nhất của tài khoản:</b> Mỗi địa chỉ email hợp lệ chỉ được liên kết với một tài khoản duy nhất trên hệ thống (BR-AUTH-001). Trường hợp đăng nhập qua Google OAuth trùng email đã có sẵn mật khẩu, hệ thống sẽ yêu cầu xác thực mật khẩu cũ để liên kết an toàn.", styles['Body']))
    story.append(Paragraph("<b>2.3. Tiêu chuẩn mật khẩu và xác thực (SEC-1, SEC-4):</b>", styles['Body']))
    story.append(Paragraph("• Mật khẩu bắt buộc có tối thiểu 08 ký tự, bao gồm ít nhất một chữ in hoa, một chữ in thường, một chữ số và một ký tự đặc biệt. Mật khẩu được băm một chiều an toàn bằng thuật toán BCrypt (cost factor 12).", styles['Bullet']))
    story.append(Paragraph("• Mã xác thực Email OTP bao gồm 06 chữ số ngẫu nhiên an toàn mã hóa (CSPRNG), có hiệu lực trong vòng 05 phút. Nghiêm cấm chia sẻ mã OTP cho bất kỳ ai.", styles['Bullet']))
    story.append(Paragraph("<b>2.4. Khóa bảo vệ tài khoản tự động (SEC-3, BR-AUTH-005):</b> Nhằm ngăn ngừa tấn công dò quét mật khẩu (brute-force), nếu người dùng nhập sai mật khẩu quá 05 lần liên tiếp, tài khoản sẽ tự động bị tạm khóa đăng nhập trong 15 phút.", styles['Body']))
    story.append(Paragraph("<b>2.5. Hợp nhất dữ liệu phiên Khách (PRV-3, BR-GUEST-AUTH-01):</b> Khi khách vãng lai hoàn tất đăng ký tài khoản trong cùng phiên, lịch sử tìm kiếm món ăn và ngữ cảnh hội thoại AI gần nhất sẽ được tự động tích hợp trọn vẹn vào hồ sơ tài khoản mới.", styles['Body']))

    # Điều 3
    story.append(Paragraph("Điều 3. Quyền sở hữu trí tuệ và Nội dung cộng đồng (UGC)", styles['Heading1']))
    story.append(Paragraph("<b>3.1. Tài sản trí tuệ của VeggieLife:</b> Toàn bộ giao diện người dùng, mã nguồn, thuật toán AI gợi ý thực đơn, cơ sở dữ liệu dinh dưỡng, nhãn hiệu và logo VeggieLife thuộc quyền sở hữu độc quyền của Ban phát triển dự án VeggieLife.", styles['Body']))
    story.append(Paragraph("<b>3.2. Nội dung người dùng đóng góp (UGC):</b> Khi người dùng đăng tải công thức món chay, hình ảnh nguyên liệu hoặc bài viết cộng đồng:", styles['Body']))
    story.append(Paragraph("• Người dùng khẳng định sở hữu bản quyền hoặc có quyền hợp pháp đối với hình ảnh và nội dung đó.", styles['Bullet']))
    story.append(Paragraph("• Người dùng cấp cho VeggieLife quyền sử dụng phi độc quyền, vĩnh viễn, miễn phí bản quyền trên phạm vi toàn cầu để lưu trữ, hiển thị, dịch thuật và giới thiệu món ăn tới cộng đồng.", styles['Bullet']))
    story.append(Paragraph("• Tiêu chuẩn cấp huy hiệu <i>'Công Thức Chay Chuẩn (Verified Recipe)'</i>: Công thức phải có định lượng chi tiết, tối thiểu 2 bước thực hiện, vượt qua kiểm duyệt AI không chứa thành phần cấm, đạt tối thiểu 10 lượt thích từ cộng đồng và không có báo cáo vi phạm.", styles['Bullet']))

    # Điều 4
    story.append(Paragraph("Điều 4. Tiêu chuẩn văn hóa cộng đồng và Quy chế Báo động đỏ (Red Alert)", styles['Heading1']))
    story.append(Paragraph("<b>4.1. QUY TẮC CẤM TUYỆT ĐỐI THỊT ĐỎ:</b> Nền tảng VeggieLife CẤM TUYỆT ĐỐI mọi hành vi đăng tải công thức, chia sẻ hình ảnh hoặc buôn bán các loại thịt đỏ (thịt bò, thịt heo, thịt cừu, thịt dê, thịt thú...). Quy tắc này áp dụng không ngoại lệ cho tất cả 07 trường phái.", styles['Body']))
    story.append(Paragraph("<b>4.2. Cơ chế Báo động đỏ (Red Alert - BR-ADM-CNT-003, D109):</b>", styles['Body']))
    red_alert_desc = (
        "Nếu hệ thống kiểm duyệt AI hoặc Quản trị viên phát hiện bài viết gắn nhãn trường phái ăn chay A nhưng thực tế "
        "lại chứa nguyên liệu của trường phái cấm B (ví dụ: gắn nhãn Vegan nhưng dùng mỡ động vật, gelatin, trứng, sữa "
        "hoặc thịt cá), hệ thống sẽ lập tức kích hoạt cờ <b>Red Alert</b>: Gỡ bài ngay lập tức khỏi feed công khai, đưa vào danh sách "
        "cách ly kiểm dịch <b>QUARANTINED_HIDDEN</b> và phát cảnh báo khẩn cấp tới kênh giám sát của Quản trị viên."
    )
    story.append(make_callout_box(styles, red_alert_desc, title="CHẾ TÀI BÁO ĐỘNG ĐỎ (RED ALERT POLICY)", bg_color=RED_ALERT_BG, border_color=RED_ALERT_BORDER, icon="🚨"))
    story.append(Paragraph("<b>4.3. Các hình thức kỷ luật người dùng:</b> Tùy theo mức độ vi phạm, Ban Quản trị áp dụng các chế tài: (1) Cảnh cáo bằng văn bản; (2) Tước huy hiệu Bếp trưởng/Verified; (3) Khóa tính năng đăng bài từ 07 đến 30 ngày; (4) Khóa tài khoản vĩnh viễn và đưa địa chỉ email vào danh sách đen.", styles['Body']))

    # Điều 5
    story.append(Paragraph("Điều 5. Quy chế sử dụng các tính năng Trí tuệ nhân tạo (AI Features)", styles['Heading1']))
    story.append(Paragraph("<b>5.1. Mô hình AI thị giác và xử lý ảnh (Fridge Scanner & Barcode):</b> Tính năng quét tủ lạnh và quét mã vạch bao bì ứng dụng học máy để nhận diện nguyên liệu chay. Người dùng đồng ý cho phép hệ thống tải ảnh lên máy chủ an toàn để xử lý trích xuất dữ liệu.", styles['Body']))
    story.append(Paragraph("<b>5.2. Hạn mức truy vấn (Quota Management):</b> Để bảo đảm tài nguyên máy chủ, hệ thống thực thi chính sách phân bổ hạn mức truy vấn AI chặt chẽ theo từng vai trò (BR-TECH-GUEST-03). Khách vãng lai tối đa 03 lần; Thành viên thường áp dụng hạn ngạch ngày; Hội viên VIP không giới hạn lượt quét.", styles['Body']))
    story.append(Paragraph("<b>5.3. Trách nhiệm người dùng đối với kết quả AI:</b> Do tính chất công nghệ thị giác máy tính phụ thuộc vào góc chụp, ánh sáng và bao bì thực phẩm, người dùng bắt buộc phải kiểm tra và xác nhận lại danh sách nguyên liệu trước khi lưu vào tủ lạnh hoặc tiến hành nấu ăn.", styles['Body']))

    # Điều 6
    story.append(Paragraph("Điều 6. Gói dịch vụ VIP và Điều khoản thanh toán", styles['Heading1']))
    story.append(Paragraph("<b>6.1. Dịch vụ gói VIP:</b> VeggieLife cung cấp các gói dịch vụ mở rộng theo tháng hoặc theo năm. Giá dịch vụ được niêm yết công khai bằng Việt Nam Đồng (VNĐ) và đã bao gồm thuế phí hiện hành.", styles['Body']))
    story.append(Paragraph("<b>6.2. Cổng thanh toán hợp pháp & Bảo mật giao dịch:</b> Giao dịch được xử lý an toàn qua các đối tác thanh toán trung gian được cấp phép tại Việt Nam (MoMo, VietQR Napas). Mọi gói tin webhook thanh toán đều được ký số xác thực HMAC SHA-256 bảo đảm tính toàn vẹn (SEC-8).", styles['Body']))
    story.append(Paragraph("<b>6.3. Chính sách khiếu nại & Hoàn tiền:</b> Nếu sau khi thanh toán thành công mà quyền lợi gói VIP không được kích hoạt do lỗi hệ thống, người dùng có quyền khiếu nại qua email hỗ trợ trong vòng 48 giờ làm việc. VeggieLife sẽ tiến hành kích hoạt bù hoặc hoàn trả 100% số tiền giao dịch.", styles['Body']))

    # Điều 7
    story.append(Paragraph("Điều 7. Chấm dứt tài khoản và Chính sách Ân hạn 30 ngày (Grace Period)", styles['Heading1']))
    story.append(Paragraph("<b>7.1. Quyền yêu cầu xóa tài khoản:</b> Thành viên có quyền yêu cầu xóa tài khoản của mình bất cứ lúc nào tại trang Cài đặt hồ sơ cá nhân.", styles['Body']))
    story.append(Paragraph("<b>7.2. Chính sách Ân hạn 30 ngày (CO-23, BR-ADM-USR-003):</b> Tuân thủ quy định của Nghị định 13/2023/NĐ-CP, khi người dùng gửi lệnh xóa tài khoản, hệ thống áp dụng thời gian ân hạn 30 ngày. Trong thời gian này, tài khoản chuyển sang trạng thái chờ xóa; nếu đăng nhập lại, người dùng có thể khôi phục tài khoản nguyên vẹn.", styles['Body']))
    story.append(Paragraph("<b>7.3. Ẩn danh hóa vĩnh viễn:</b> Sau 30 ngày ân hạn, toàn bộ dữ liệu cá nhân định danh (Họ tên, Email, Mật khẩu, Ảnh đại diện, Chỉ số thể trạng chiều cao/cân nặng) sẽ bị ẩn danh hóa vĩnh viễn hoặc xóa sạch khỏi hệ thống mà không thể đảo ngược.", styles['Body']))

    # Điều 8
    story.append(Paragraph("Điều 8. Luật điều chỉnh, Hiệu lực và Thông tin liên hệ", styles['Heading1']))
    story.append(Paragraph("<b>8.1. Luật áp dụng:</b> Bản Điều khoản này được giải thích và điều chỉnh theo quy định của pháp luật Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp nếu không thương lượng được sẽ đưa ra Tòa án nhân dân có thẩm quyền tại TP. Hồ Chí Minh.", styles['Body']))
    story.append(Paragraph("<b>8.2. Sửa đổi điều khoản:</b> VeggieLife có quyền cập nhật bản Điều khoản này khi có sự điều chỉnh tính năng kỹ thuật hoặc pháp luật. Nội dung thay đổi sẽ được công bố trên website trước ít nhất 07 ngày làm việc.", styles['Body']))
    story.append(Paragraph("<b>8.3. Thông tin liên hệ Ban Quản trị:</b>", styles['Body']))
    story.append(Paragraph("• Tên dự án: <b>VeggieLife - Nền tảng Dinh dưỡng & Ẩm thực Chay Thông minh</b><br/>• Địa chỉ hỗ trợ kỹ thuật & pháp lý: <font color='#1b4d3e'><u>support@veggielife.vn</u></font><br/>• Website chính thức: <font color='#1b4d3e'><u>https://veggielife.vn</u></font>", styles['Body']))

    story.append(Spacer(1, 15))
    # Signature Box
    sig_data = [
        [
            Paragraph("<b>ĐẠI DIỆN HỘI ĐỒNG PHÁP CHẾ VEGGIELIFE</b><br/><i>(Ký tên và đóng dấu điện tử)</i>", styles['SignRole']),
            Paragraph("<b>NGƯỜI DÙNG ĐĂNG KÝ THÀNH VIÊN</b><br/><i>(Xác nhận điện tử qua bước bấm Đăng ký)</i>", styles['SignRole'])
        ],
        [
            Paragraph("<br/><br/><b>BAN QUẢN TRỊ VEGGIELIFE</b><br/><i>Chứng thực số ký hợp lệ</i>", styles['SignNote']),
            Paragraph("<br/><br/><b>ĐÃ TÍCH CHỌN ĐỒNG Ý</b><br/><i>Xác nhận điện tử tại màn hình SCR-02</i>", styles['SignNote'])
        ]
    ]
    sig_table = Table(sig_data, colWidths=[240, 247])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(KeepTogether([sig_table]))

    doc.build(story, canvasmaker=lambda *a, **k: CustomNumberedCanvas(*a, doc_title="ĐIỀU KHOẢN DỊCH VỤ VEGGIELIFE", **k))
    print(f"Built Terms Doc: {output_path}")


def build_privacy_doc(output_path):
    styles = get_doc_styles()
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54
    )
    story = []

    # Header Banner
    story.append(make_header_banner(styles, "02/2026/VGL-PDPD"))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=12, spaceBefore=4))

    # Title
    story.append(Paragraph("CHÍNH SÁCH BẢO MẬT VÀ BẢO VỆ DỮ LIỆU CÁ NHÂN", styles['DocTitle']))
    story.append(Paragraph("<b>(PRIVACY POLICY & SENSITIVE HEALTH DATA PROTECTION)</b><br/>Ban hành tuân thủ Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân của Chính phủ Việt Nam", styles['DocSubtitle']))

    # Callout Consent Notice
    consent_notice = (
        "VeggieLife cam kết bảo vệ dữ liệu cá nhân và <b>Dữ liệu sức khỏe nhạy cảm</b> của bạn bằng các biện pháp an ninh mạng "
        "nghiêm ngặt nhất. Bằng việc đăng ký tài khoản, bạn xác nhận đã được thông báo, hiểu rõ và đồng ý cho phép VeggieLife "
        "xử lý dữ liệu cá nhân của bạn theo đúng mục đích, phạm vi và quyền hạn được quy định tại bản Chính sách này."
    )
    story.append(make_callout_box(styles, consent_notice, title="THÔNG BÁO XỬ LÝ DỮ LIỆU CÁ NHÂN THEO NGHỊ ĐỊNH 13/2023/NĐ-CP", bg_color=PRIMARY_CONTAINER, border_color=PRIMARY, icon="🛡️"))
    story.append(Spacer(1, 8))

    # Điều 1
    story.append(Paragraph("Điều 1. Căn cứ pháp lý và Nguyên tắc bảo vệ dữ liệu", styles['Heading1']))
    story.append(Paragraph("<b>1.1. Căn cứ pháp lý:</b> Chính sách này được xây dựng trên cơ sở tuân thủ nghiêm túc các văn bản quy phạm pháp luật hiện hành của Nước CHXHCN Việt Nam: (1) Nghị định số 13/2023/NĐ-CP ngày 17/04/2023 về Bảo vệ dữ liệu cá nhân (PDPD); (2) Luật An toàn thông tin mạng số 86/2015/QH13; (3) Luật Công nghệ thông tin số 67/2006/QH11; và (4) Luật Giao dịch điện tử số 20/2023/QH15.", styles['Body']))
    story.append(Paragraph("<b>1.2. Các nguyên tắc xử lý dữ liệu bất biến:</b>", styles['Body']))
    story.append(Paragraph("• <i>Nguyên tắc hợp pháp & minh bạch:</i> Mọi hoạt động thu thập dữ liệu đều có thông báo trước và có sự đồng thuận rõ ràng của chủ thể dữ liệu.", styles['Bullet']))
    story.append(Paragraph("• <i>Nguyên tắc giới hạn mục đích:</i> Dữ liệu chỉ được sử dụng cho mục đích cá nhân hóa dinh dưỡng chay và vận hành hệ thống, tuyệt đối không phục vụ mục đích thương mại ngoài phạm vi cam kết.", styles['Bullet']))
    story.append(Paragraph("• <i>Nguyên tắc toàn vẹn và bảo mật (Confidentiality & Integrity):</i> Áp dụng các tiêu chuẩn mã hóa hiện đại trong lưu trữ và truyền tải dữ liệu.", styles['Bullet']))

    # Điều 2
    story.append(Paragraph("Điều 2. Phân loại Dữ liệu cá nhân thu thập", styles['Heading1']))
    story.append(Paragraph("Hệ thống phân định rõ ràng 02 nhóm dữ liệu theo quy định của Nghị định 13/2023/NĐ-CP:", styles['Body']))
    story.append(Paragraph("<b>2.1. Dữ liệu cá nhân cơ bản:</b>", styles['Body']))
    story.append(Paragraph("• Họ và tên hiển thị của người dùng (Full Name);", styles['Bullet']))
    story.append(Paragraph("• Địa chỉ thư điện tử xác thực (Email Address);", styles['Bullet']))
    story.append(Paragraph("• Mật khẩu đăng nhập (chỉ lưu trữ dưới dạng băm một chiều an toàn qua BCrypt cost 12);", styles['Bullet']))
    story.append(Paragraph("• Ảnh đại diện (Avatar) và ảnh chụp công thức người dùng tải lên;", styles['Bullet']))
    story.append(Paragraph("• Dữ liệu kỹ thuật nhật ký: Địa chỉ IP, chuỗi định danh User-Agent, nhật ký đăng nhập nhằm ngăn chặn tấn công spam.", styles['Bullet']))
    story.append(Paragraph("<b>2.2. DỮ LIỆU CÁ NHÂN NHẠY CẢM VỀ SỨC KHỎE (Quy định tại Khoản 4 Điều 2 Nghị định 13/2023/NĐ-CP & Tiêu chuẩn PRV-1):</b>", styles['Body']))
    story.append(Paragraph("• <i>Chỉ số nhân trắc học:</i> Chiều cao, cân nặng, độ tuổi, giới tính sinh học;", styles['Bullet']))
    story.append(Paragraph("• <i>Chỉ số sức khỏe tính toán:</i> Chỉ số khối cơ thể (BMI theo chuẩn WHO dành cho người Tây Thái Bình Dương WPRO), tỷ lệ tiêu hao năng lượng cơ bản (BMR), và tổng năng lượng tiêu thụ hàng ngày (TDEE);", styles['Bullet']))
    story.append(Paragraph("• <i>Trường phái ăn chay khai báo:</i> Lựa chọn duy nhất trong 07 trường phái (Vegan, Lacto, Ovo, Lacto-Ovo, Buddhist, Pollotarian, Pescatarian);", styles['Bullet']))
    story.append(Paragraph("• <i>Danh sách đen dị ứng thực phẩm (Allergies Blacklist):</i> Các dị nguyên gây phản ứng dị ứng nghiêm trọng được người dùng tích chọn (Đậu nành, Gluten lúa mì, Đậu phộng, Quả hạch/Hạt cây, Mè, v.v.).", styles['Bullet']))

    # Điều 3
    story.append(Paragraph("Điều 3. Mục đích và Phạm vi sử dụng dữ liệu", styles['Heading1']))
    story.append(Paragraph("Dữ liệu thu thập được sử dụng giới hạn trong các nghiệp vụ sau:", styles['Body']))
    story.append(Paragraph("<b>3.1. Cá nhân hóa thuật toán AI dinh dưỡng:</b> Thuật toán AI kết hợp trường phái ăn chay và danh sách đen dị ứng làm ràng buộc cứng (Hard Constraints) để lập kế hoạch thực đơn tuần, bảo đảm tuyệt đối không gợi ý món ăn có thành phần gây dị ứng cho người dùng.", styles['Body']))
    story.append(Paragraph("<b>3.2. Quản lý kho thực phẩm Tủ lạnh thông minh:</b> Lưu trữ danh sách nguyên liệu bạn sở hữu từ tính năng quét ảnh hoặc nhập tay để gợi ý công thức chế biến tận dụng thực phẩm tránh hư hao lãng phí.", styles['Body']))
    story.append(Paragraph("<b>3.3. Xác thực an toàn và kiểm toán an ninh:</b> Gửi mã OTP xác minh, xoay vòng Access Token (15 phút) và Refresh Token trên Redis (SEC-2), phát hiện và ngăn chặn các hành vi gian lận.", styles['Body']))
    story.append(Paragraph("<b>3.4. Thống kê nghiên cứu ẩn danh (PRV-2):</b> Các báo cáo thống kê dành cho Quản trị viên chỉ được phép hiển thị dữ liệu tổng hợp theo ngày với độ trễ tối đa 24 giờ và tuyệt đối không đính kèm thông tin định danh cá nhân.", styles['Body']))

    # Điều 4
    story.append(Paragraph("Điều 4. Cơ chế bảo vệ đặc biệt đối với Dữ liệu sức khỏe nhạy cảm (PRV-1)", styles['Heading1']))
    sensitive_callout = (
        "<b>QUY ĐỊNH BẢO VỆ DỮ LIỆU SỨC KHỎE (TIÊU CHUẨN PRV-1):</b> Dữ liệu sức khỏe (chiều cao, cân nặng, BMI, BMR, TDEE, "
        "tiền sử dị ứng thực phẩm) là dữ liệu cá nhân đặc biệt nhạy cảm. <b>Chỉ có chủ sở hữu tài khoản và thuật toán hệ thống "
        "được quyền đọc dữ liệu này.</b> Quản trị viên (Admin) chỉ được phép tra cứu trong trường hợp xử lý khiếu nại hoặc điều tra vi phạm an toàn; "
        "mọi hành vi xem dữ liệu sức khỏe của Admin bắt buộc phải được ghi nhận vào Nhật ký kiểm toán không thể xóa sửa (SEC-12)."
    )
    story.append(make_callout_box(styles, sensitive_callout, title="CAM KẾT BẢO VỆ DỮ LIỆU SỨC KHỎE", bg_color=AMBER_BG, border_color=AMBER_BORDER, icon="🔒"))
    story.append(Paragraph("<b>4.1. Cam kết KHÔNG bán dữ liệu:</b> VeggieLife cam kết tuyệt đối không bán, cho thuê, thương mại hóa hoặc chuyển giao dữ liệu sức khỏe của người dùng cho các hãng bảo hiểm, công ty dược phẩm hoặc mạng lưới quảng cáo của bên thứ ba dưới bất kỳ hình thức nào.", styles['Body']))

    # Điều 5
    story.append(Paragraph("Điều 5. Quy chế xử lý dữ liệu hình ảnh (AI Vision - Quét tủ lạnh & Mã vạch)", styles['Heading1']))
    story.append(Paragraph("<b>5.1. Kiểm tra an toàn tệp tải lên (SEC-7):</b> Mọi hình ảnh gửi lên hệ thống được kiểm tra tính hợp lệ bằng chữ ký tệp (magic bytes), giới hạn dung lượng ≤ 5 MB (tối đa 10 MB cho ảnh AI), định dạng hỗ trợ gồm JPEG, PNG, WEBP.", styles['Body']))
    story.append(Paragraph("<b>5.2. Tính bảo mật của hình ảnh:</b> Ảnh chụp tủ lạnh và ảnh chụp bao bì mã vạch chỉ phục vụ mục đích trích xuất danh mục nguyên liệu thực phẩm và phân tích phụ gia thực phẩm E-numbers. Hình ảnh được xử lý trên phân vùng bộ nhớ an toàn và không bị công khai trên mạng xã hội cộng đồng.", styles['Body']))

    # Điều 6
    story.append(Paragraph("Điều 6. Lưu trữ dữ liệu và Chính sách Ân hạn xóa tài khoản 30 ngày (CO-23)", styles['Heading1']))
    story.append(Paragraph("<b>6.1. Thời gian lưu trữ:</b> Dữ liệu cá nhân được lưu trữ trong suốt thời gian tài khoản người dùng hoạt động trên hệ thống VeggieLife.", styles['Body']))
    story.append(Paragraph("<b>6.2. Cơ chế xóa tài khoản có ân hạn (Grace Period) theo Nghị định 13/2023/NĐ-CP:</b>", styles['Body']))
    story.append(Paragraph("• Khi người dùng gửi yêu cầu xóa tài khoản, hệ thống áp dụng thời gian ân hạn chính xác <b>30 ngày</b>.", styles['Bullet']))
    story.append(Paragraph("• Trong 30 ngày này, dữ liệu tài khoản bị tạm khóa truy cập công khai nhưng được giữ nguyên trạng thái; người dùng có thể đổi ý bằng cách đăng nhập lại để khôi phục tài khoản.", styles['Bullet']))
    story.append(Paragraph("• <b>Hết thời hạn 30 ngày:</b> Hệ thống tự động kích hoạt quy trình xóa dữ liệu: toàn bộ họ tên, email, mật khẩu băm, ảnh đại diện và các chỉ số sức khỏe sẽ bị xóa sạch hoặc ẩn danh hóa vĩnh viễn (anonymized) trong cơ sở dữ liệu theo Tiêu chuẩn CO-23.", styles['Bullet']))

    # Điều 7
    story.append(Paragraph("Điều 7. Các biện pháp bảo vệ kỹ thuật và An ninh thông tin", styles['Heading1']))
    story.append(Paragraph("VeggieLife triển khai hệ thống an ninh phòng thủ đa lớp tuân thủ tiêu chuẩn quốc tế và OWASP Top 10:", styles['Body']))
    story.append(Paragraph("• <i>Mã hóa đường truyền:</i> Toàn bộ kết nối giữa trình duyệt Frontend và máy chủ Backend bắt buộc chạy qua giao thức HTTPS mã hóa TLS 1.3.", styles['Bullet']))
    story.append(Paragraph("• <i>Bảo vệ phiên xác thực:</i> Access Token JWT có thời hạn 15 phút; Refresh Token được lưu trữ trên bộ nhớ đệm Redis, có cơ chế xoay vòng (token rotation) và thu hồi toàn bộ phiên đăng nhập khi phát hiện dấu hiệu bất thường (SEC-2).", styles['Bullet']))
    story.append(Paragraph("• <i>Tiêu đề bảo mật HTTP (SEC-14):</i> Thiết lập chính sách bảo mật nội dung chặt chẽ gồm Content-Security-Policy (CSP), X-Content-Type-Options: nosniff, X-Frame-Options: DENY nhằm ngăn chặn tấn công clickjacking và XSS.", styles['Bullet']))
    story.append(Paragraph("• <i>Chống tiêm lệnh AI Prompt Injection (SEC-15):</i> Thiết lập ranh giới bảo vệ nghiêm ngặt giữa dữ liệu người dùng nhập vào và chỉ dẫn hệ thống (System Instruction), ngăn chặn mã độc can thiệp vào ràng buộc dị ứng và trường phái.", styles['Bullet']))

    # Điều 8
    story.append(Paragraph("Điều 8. Quyền của Chủ thể dữ liệu và Kênh tiếp nhận khiếu nại (DPO)", styles['Heading1']))
    story.append(Paragraph("<b>8.1. Các quyền hợp pháp của bạn theo Điều 9 Nghị định 13/2023/NĐ-CP:</b>", styles['Body']))
    story.append(Paragraph("• Quyền được biết về hoạt động xử lý dữ liệu của mình;", styles['Bullet']))
    story.append(Paragraph("• Quyền đồng ý hoặc rút lại sự đồng ý đã cấp trước đó;", styles['Bullet']))
    story.append(Paragraph("• Quyền truy cập, xem và tải về bản sao dữ liệu dinh dưỡng cá nhân;", styles['Bullet']))
    story.append(Paragraph("• Quyền yêu cầu chỉnh sửa hoặc cập nhật các chỉ số sức khỏe, trường phái ăn chay và danh sách dị ứng;", styles['Bullet']))
    story.append(Paragraph("• Quyền yêu cầu xóa dữ liệu hoặc hạn chế xử lý dữ liệu cá nhân;", styles['Bullet']))
    story.append(Paragraph("• Quyền khiếu nại, tố cáo hoặc khởi kiện theo quy định của pháp luật.", styles['Bullet']))
    story.append(Paragraph("<b>8.2. Thông tin liên hệ Cán bộ Bảo vệ Dữ liệu (DPO):</b> Mọi yêu cầu trích xuất dữ liệu, rút lại chấp thuận hoặc khiếu nại liên quan đến quyền riêng tư, vui lòng liên hệ trực tiếp Bộ phận DPO:", styles['Body']))
    story.append(Paragraph("• <b>Bộ phận Tiếp nhận:</b> Đội ngũ Bảo vệ Dữ liệu Cá nhân (Data Protection Officer - DPO)<br/>• <b>Hòm thư điện tử chuyên trách:</b> <font color='#1b4d3e'><u>privacy@veggielife.vn</u></font><br/>• <b>Thời hạn phản hồi cam kết:</b> Tối đa 72 giờ làm việc kể từ thời điểm tiếp nhận văn bản yêu cầu.", styles['Body']))

    story.append(Spacer(1, 15))
    # Signature Box
    sig_data = [
        [
            Paragraph("<b>ĐẠI DIỆN ĐỘI NGŨ BẢO VỆ DỮ LIỆU (DPO)</b><br/><i>(Ký duyệt bảo mật thông tin)</i>", styles['SignRole']),
            Paragraph("<b>CHỦ THỂ DỮ LIỆU (NGƯỜI DÙNG)</b><br/><i>(Xác nhận đồng thuận tại bước Đăng ký)</i>", styles['SignRole'])
        ],
        [
            Paragraph("<br/><br/><b>VEGGIELIFE DATA COMPLIANCE</b><br/><i>Chứng thực tuân thủ NĐ 13/2023/NĐ-CP</i>", styles['SignNote']),
            Paragraph("<br/><br/><b>ĐÃ ĐỒNG THUẬN ĐIỆN TỬ</b><br/><i>Lưu trữ phiên xác thực an toàn</i>", styles['SignNote'])
        ]
    ]
    sig_table = Table(sig_data, colWidths=[240, 247])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(KeepTogether([sig_table]))

    doc.build(story, canvasmaker=lambda *a, **k: CustomNumberedCanvas(*a, doc_title="CHÍNH SÁCH BẢO MẬT DỮ LIỆU VEGGIELIFE", **k))
    print(f"Built Privacy Doc: {output_path}")


def build_vegetarian_standards_doc(output_path):
    styles = get_doc_styles()
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54
    )
    story = []

    # Header Banner
    story.append(make_header_banner(styles, "03/2026/VGL-VEG-SPEC"))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=12, spaceBefore=4))

    # Title
    story.append(Paragraph("QUY CHUẨN ẨM THỰC CHAY, AN TOÀN DỊ ỨNG VÀ TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM Y TẾ", styles['DocTitle']))
    story.append(Paragraph("<b>(VEGETARIAN DIETARY STANDARDS, ALLERGEN SAFETY & MEDICAL DISCLAIMER)</b><br/>Bộ tiêu chuẩn nghiệp vụ vận hành toàn hệ thống theo Quy tắc BR-ADM-MAS-001, BR-ADM-CNT-003 và Hướng dẫn WHO", styles['DocSubtitle']))

    # Callout Highlight
    story.append(make_callout_box(
        styles,
        "Quy chuẩn này là nền tảng cốt lõi chi phối toàn bộ thuật toán gợi ý món ăn AI, kiểm duyệt công thức, "
        "quản lý tủ lạnh và phân loại sản phẩm trên hệ thống VeggieLife. Mọi thành viên bắt buộc phải nắm rõ danh mục thực phẩm cấm "
        "của từng trường phái và giới hạn trách nhiệm y tế trước khi xuất bản nội dung hoặc áp dụng thực đơn.",
        title="BỘ TIÊU CHUẨN ẨM THỰC CHAY CHUẨN HÓA",
        bg_color=PRIMARY_CONTAINER,
        border_color=PRIMARY,
        icon="🥗"
    ))
    story.append(Spacer(1, 8))

    # Điều 1
    story.append(Paragraph("Điều 1. Mục đích và Triết lý ẩm thực chay tại VeggieLife", styles['Heading1']))
    story.append(Paragraph("<b>1.1. Triết lý phát triển:</b> Nền tảng VeggieLife được xây dựng với mục tiêu phổ biến lối sống xanh, tôn trọng quyền sống của muôn loài, hỗ trợ bảo vệ môi trường và nâng cao thể chất cộng đồng người Việt thông qua dinh dưỡng thực vật khoa học và tiện lợi.", styles['Body']))
    story.append(Paragraph("<b>1.2. Thống nhất cơ sở dữ liệu trường phái (BR-ADM-MAS-001):</b> Toàn bộ vi dịch vụ Backend, AI Vision, Trợ lý AI và ứng dụng di động/web trong hệ thống bắt buộc phải sử dụng chung một bộ Danh mục 07 Trường phái Ăn chay Cốt lõi duy nhất từ cơ sở dữ liệu Master; nghiêm cấm tự ý bổ sung hoặc diễn giải sai lệch.", styles['Body']))

    # Điều 2
    story.append(Paragraph("Điều 2. Bảng Danh mục Chuẩn hóa 07 Trường phái Ăn chay Cốt lõi (BR-ADM-MAS-001)", styles['Heading1']))
    story.append(Paragraph("Hệ thống định nghĩa cố định và duy nhất 07 trường phái ăn chay gốc. Người ăn chay linh hoạt (Flexitarian) khi đăng ký bắt buộc phải chọn 01 trong 07 trường phái này làm chuẩn thiết lập hồ sơ dinh dưỡng ban đầu:", styles['Body']))

    # Table of 7 Diet Schools
    diet_table_data = [
        [
            Paragraph("STT", styles['TableHeader']),
            Paragraph("Trường phái chay<br/>(School Code)", styles['TableHeader']),
            Paragraph("Thực phẩm CHO PHÉP", styles['TableHeader']),
            Paragraph("Thực phẩm BỊ CẤM TUYỆT ĐỐI<br/>(Forbidden Food Rules)", styles['TableHeader'])
        ],
        [
            Paragraph("1", styles['TableCellBold']),
            Paragraph("<b>Thuần chay</b><br/>(VEGAN)", styles['TableCell']),
            Paragraph("100% nguyên liệu từ thực vật: rau củ, quả, ngũ cốc, đậu nành, hạt, các loại nấm, men thực phẩm.", styles['TableCell']),
            Paragraph("<b>CẤM HOÀN TOÀN:</b> Thịt gia súc, gia cầm, thủy hải sản, trứng, sữa, bơ động vật, mật ong, mỡ động vật, gelatin, phẩm màu carmine.", styles['TableCell'])
        ],
        [
            Paragraph("2", styles['TableCellBold']),
            Paragraph("<b>Ăn chay có Sữa</b><br/>(LACTO)", styles['TableCell']),
            Paragraph("Thực vật + Sữa và các chế phẩm từ sữa: sữa bò, phô mai chay, bơ, sữa chua, váng sữa.", styles['TableCell']),
            Paragraph("<b>CẤM:</b> Thịt gia súc, gia cầm, thủy hải sản, trứng gia cầm, các sản phẩm chứa phôi trứng động vật.", styles['TableCell'])
        ],
        [
            Paragraph("3", styles['TableCellBold']),
            Paragraph("<b>Ăn chay có Trứng</b><br/>(OVO)", styles['TableCell']),
            Paragraph("Thực vật + Các loại trứng gia cầm sạch không phôi (trứng gà, trứng vịt công nghiệp không trống).", styles['TableCell']),
            Paragraph("<b>CẤM:</b> Thịt gia súc, gia cầm, thủy hải sản, sữa và toàn bộ các chế phẩm từ sữa động vật.", styles['TableCell'])
        ],
        [
            Paragraph("4", styles['TableCellBold']),
            Paragraph("<b>Chay có Trứng & Sữa</b><br/>(LACTO_OVO)", styles['TableCell']),
            Paragraph("Thực vật + Sữa động vật và các chế phẩm từ sữa + Trứng gia cầm không phôi.", styles['TableCell']),
            Paragraph("<b>CẤM:</b> Thịt gia súc, gia cầm, cá và toàn bộ các loài thủy hải sản.", styles['TableCell'])
        ],
        [
            Paragraph("5", styles['TableCellBold']),
            Paragraph("<b>Chay Phật giáo</b><br/>(BUDDHIST)", styles['TableCell']),
            Paragraph("Thực vật thuần khiết theo giáo lý Phật giáo. Một số nhánh cho phép dùng sữa thực vật.", styles['TableCell']),
            Paragraph("<b>CẤM:</b> Toàn bộ động vật, trứng, sữa + <b>KIÊNG NGŨ VỊ TÂN</b> (Hành, Hẹ, Tỏi, Kiệu, Hưng cừ/Hành tây).", styles['TableCell'])
        ],
        [
            Paragraph("6", styles['TableCellBold']),
            Paragraph("<b>Chay Linh hoạt Thịt trắng</b><br/>(POLLOTARIAN)", styles['TableCell']),
            Paragraph("Thực vật chủ đạo + Trứng, sữa + Cho phép lượng thịt gia cầm trắng vừa phải (ức gà, vịt).", styles['TableCell']),
            Paragraph("<b>CẤM TUYỆT ĐỐI THỊT ĐỎ</b> (thịt bò, heo, dê, cừu) và cấm mọi loài thủy hải sản sông/biển.", styles['TableCell'])
        ],
        [
            Paragraph("7", styles['TableCellBold']),
            Paragraph("<b>Chay Thủy hải sản</b><br/>(PESCATARIAN)", styles['TableCell']),
            Paragraph("Thực vật chủ đạo + Trứng, sữa + Cho phép các loại cá, tôm, sò, ốc, hải sản đánh bắt/nuôi trồng.", styles['TableCell']),
            Paragraph("<b>CẤM TUYỆT ĐỐI:</b> Thịt thú, thịt gia súc (bò, heo, dê, cừu) và thịt gia cầm bốn chân/hai chân.", styles['TableCell'])
        ],
    ]
    diet_table = Table(diet_table_data, colWidths=[24, 100, 160, 203])
    diet_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(diet_table)
    story.append(Spacer(1, 8))

    # Điều 3
    story.append(Paragraph("Điều 3. Quy chuẩn Bất biến về Thực phẩm & Cơ chế Báo động đỏ (Red Alert)", styles['Heading1']))
    story.append(Paragraph("<b>3.1. NGUYÊN TẮC BẤT BIẾN - CẤM TUYỆT ĐỐI THỊT ĐỎ (D109):</b> Bất kỳ nội dung nào có sự xuất hiện của thịt đỏ (thịt gia súc) đều bị nghiêm cấm trên toàn bộ hệ thống VeggieLife. Bài viết vi phạm sẽ bị từ chối xuất bản ngay từ vòng lọc đầu tiên.", styles['Body']))
    story.append(Paragraph("<b>3.2. Chế tài Báo động đỏ đối với sự sai lệch trường phái:</b>", styles['Body']))
    story.append(Paragraph("• Nếu người dùng cố tình gắn nhãn Vegan nhưng nguyên liệu sử dụng trứng, sữa, gelatin hoặc mỡ động vật;", styles['Bullet']))
    story.append(Paragraph("• Nếu người dùng gắn nhãn Chay Phật giáo nhưng đưa gia vị Ngũ vị tân vào công thức mà không cảnh báo;", styles['Bullet']))
    story.append(Paragraph("• Hệ thống AI tự động phát hiện, gán nhãn <b>Red_Alert</b>, chuyển trạng thái bài sang <b>QUARANTINED_HIDDEN</b> (cách ly, ẩn khỏi feed cộng đồng) và gửi thông báo khẩn cấp đến Quản trị viên để tiến hành khóa tính năng tác giả theo BR-ADM-CNT-003.", styles['Bullet']))

    # Điều 4
    story.append(Paragraph("Điều 4. Danh mục Cảnh báo Phụ gia Thực phẩm Quốc tế (E-Numbers Guide)", styles['Heading1']))
    story.append(Paragraph("Hệ thống tích hợp Từ điển Phụ gia thực phẩm quốc tế E-numbers trong tính năng quét mã vạch (Barcode Scanner). Người dùng ăn chay cần đặc biệt lưu ý các chất phụ gia gốc động vật hoặc nghi vấn sau:", styles['Body']))

    enum_data = [
        [
            Paragraph("Mã E-Number", styles['TableHeader']),
            Paragraph("Tên phụ gia quốc tế", styles['TableHeader']),
            Paragraph("Nguồn gốc chiết xuất thực tế", styles['TableHeader']),
            Paragraph("Đánh giá độ an toàn chay", styles['TableHeader'])
        ],
        [
            Paragraph("<b>E120</b>", styles['TableCellBold']),
            Paragraph("Carmine / Cochineal", styles['TableCell']),
            Paragraph("Chiết xuất từ xác bọ cánh kiến đỏ (côn trùng)", styles['TableCell']),
            Paragraph("<font color='#b91c1c'><b>CẤM TUYỆT ĐỐI</b></font> với người ăn thuần chay", styles['TableCell'])
        ],
        [
            Paragraph("<b>E441</b>", styles['TableCellBold']),
            Paragraph("Gelatin", styles['TableCell']),
            Paragraph("Nấu từ da, xương, gân của heo, bò động vật", styles['TableCell']),
            Paragraph("<font color='#b91c1c'><b>CẤM TUYỆT ĐỐI</b></font> với người ăn chay", styles['TableCell'])
        ],
        [
            Paragraph("<b>E471</b>", styles['TableCellBold']),
            Paragraph("Mono- & Diglycerides", styles['TableCell']),
            Paragraph("Chiết xuất từ axit béo mỡ động vật hoặc dầu thực vật", styles['TableCell']),
            Paragraph("<font color='#b45309'><b>NGHI VẤN</b></font> (chỉ dùng nếu ghi rõ 100% từ cọ/đậu nành)", styles['TableCell'])
        ],
        [
            Paragraph("<b>E542</b>", styles['TableCellBold']),
            Paragraph("Bone Phosphate", styles['TableCell']),
            Paragraph("Phốt phát chiết xuất từ xương động vật nghiền", styles['TableCell']),
            Paragraph("<font color='#b91c1c'><b>CẤM TUYỆT ĐỐI</b></font> với mọi trường phái chay", styles['TableCell'])
        ],
        [
            Paragraph("<b>E901</b>", styles['TableCellBold']),
            Paragraph("Beeswax", styles['TableCell']),
            Paragraph("Sáp ong tự nhiên do ong thợ tiết ra", styles['TableCell']),
            Paragraph("Không phù hợp với người ăn thuần chay (Vegan)", styles['TableCell'])
        ],
        [
            Paragraph("<b>E904</b>", styles['TableCellBold']),
            Paragraph("Shellac", styles['TableCell']),
            Paragraph("Nhựa cánh kiến đỏ tiết ra từ dịch côn trùng Kerria lacca", styles['TableCell']),
            Paragraph("<font color='#b91c1c'><b>KHÔNG CHAY</b></font> (nguồn gốc côn trùng)", styles['TableCell'])
        ],
        [
            Paragraph("<b>E920</b>", styles['TableCellBold']),
            Paragraph("L-Cysteine", styles['TableCell']),
            Paragraph("Axit amin xử lý bột mì trích từ lông vũ gia cầm/tóc", styles['TableCell']),
            Paragraph("<font color='#b45309'><b>NGHI VẤN CAO</b></font> (chỉ dùng nếu lên men tổng hợp)", styles['TableCell'])
        ],
    ]
    enum_table = Table(enum_data, colWidths=[65, 120, 172, 130])
    enum_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_LIGHT),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(enum_table)
    story.append(Spacer(1, 8))

    # Điều 5
    story.append(Paragraph("Điều 5. Quản lý Rủi ro Dị ứng Thực phẩm & Nguy cơ Nhiễm chéo (Cross-Contamination)", styles['Heading1']))
    story.append(Paragraph("<b>5.1. Danh mục Dị ứng thực phẩm cốt lõi (Allergies Blacklist):</b> Hệ thống hỗ trợ người dùng thiết lập danh sách các thực phẩm gây phản ứng dị ứng gồm: Đậu nành, Gluten lúa mì, Đậu phộng, Quả hạch (hạt điều, óc chó, hạnh nhân), Mè, Đậu lăng, Sulfite.", styles['Body']))
    story.append(Paragraph("<b>5.2. Ràng buộc cứng thuật toán (Hard Constraints):</b> Khi lập thực đơn hoặc gợi ý món ăn, mô hình AI bắt buộc phải loại trừ 100% nguyên liệu nằm trong Danh sách đen dị ứng của người dùng. Tuy nhiên, thuật toán chỉ hoạt động dựa trên cơ sở dữ liệu số hóa.", styles['Body']))
    story.append(Paragraph("<b>5.3. Cảnh báo nhiễm chéo thực tế:</b> Trong quá trình thu hoạch, vận chuyển, xay xát và chế biến tại gia đình hoặc nhà hàng, nguy cơ nhiễm chéo vi lượng (ví dụ: máy xay chung cho mè và đậu phộng) hoàn toàn có thể xảy ra. Thành viên có tiền sử sốc phản vệ hoặc dị ứng nghiêm trọng bắt buộc phải chủ động kiểm tra kỹ lưỡng thực tế trước khi dùng.", styles['Body']))

    # Điều 6
    story.append(Paragraph("Điều 6. Tuyên bố Miễn trừ Trách nhiệm Dinh dưỡng & Y tế (Medical Disclaimer)", styles['Heading1']))
    disclaimer_text = (
        "<b>CẢNH BÁO PHÁP LÝ VÀ MIỄN TRỪ TRÁCH NHIỆM Y TẾ TOÀN DIỆN:</b><br/>"
        "1. Nền tảng VeggieLife <b>KHÔNG PHẢI LÀ MỘT CƠ SỞ KHÁM BỆNH, CHỮA BỆNH</b> và không cung cấp dịch vụ điều trị y khoa. "
        "Mọi thông tin, công thức nấu ăn, gợi ý thực đơn, tính toán chỉ số calo, BMI, BMR, TDEE và trợ lý AI chatbot "
        "chỉ mang <b>TÍNH CHẤT THAM KHẢO VÀ GIÁO DỤC ĐỊNH HƯỚNG LỐI SỐNG</b>.<br/>"
        "2. <b>Dung sai tính toán:</b> Các công thức tính toán năng lượng calo áp dụng tiêu chuẩn quốc tế của WHO và WPRO "
        "với dung sai cho phép trong khoảng ±10%. Nhu cầu dinh dưỡng thực tế của từng cá nhân phụ thuộc vào chuyển hóa, di truyền và bệnh lý.<br/>"
        "3. <b>Khuyến cáo nhóm đối tượng đặc biệt:</b> Phụ nữ mang thai, bà mẹ đang cho con bú, trẻ em dưới 18 tuổi đang tuổi dậy thì, "
        "người cao tuổi và các bệnh nhân có bệnh lý nền mạn tính (đái tháo đường, suy tim, suy thận, gout, ung thư...) "
        "<b>BẮT BUỘC PHẢI THAM VẤN BÁC SĨ CHUYÊN KHOA HOẶC CHUYÊN GIA DINH DƯỠNG LÂM SÀNG ĐƯỢC CẤP PHÉP</b> trước khi áp dụng bất kỳ thực đơn ăn chay nào.<br/>"
        "4. <b>Miễn trừ trách nhiệm:</b> VeggieLife hoàn toàn miễn trừ mọi trách nhiệm pháp lý, trách nhiệm bồi thường đối với các sự cố "
        "dị ứng thực phẩm, thiếu hụt vi chất, hoặc các ảnh hưởng tiêu cực tới sức khỏe do người dùng tự ý áp dụng chế độ ăn uống không phù hợp "
        "hoặc tự ý dừng các chỉ định điều trị y tế của bác sĩ chuyên khoa."
    )
    story.append(make_callout_box(styles, disclaimer_text, title="TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM Y TẾ & DINH DƯỠNG", bg_color=AMBER_BG, border_color=AMBER_BORDER, icon="⚠️"))

    story.append(Spacer(1, 15))
    # Signature Box
    sig_data = [
        [
            Paragraph("<b>BAN THẨM ĐỊNH AN TOÀN ẨM THỰC CHAY</b><br/><i>(Hội đồng khoa học VeggieLife)</i>", styles['SignRole']),
            Paragraph("<b>CAM KẾT CỦA THÀNH VIÊN HỆ THỐNG</b><br/><i>(Xác nhận tuân thủ trường phái và an toàn)</i>", styles['SignRole'])
        ],
        [
            Paragraph("<br/><br/><b>VEGGIELIFE NUTRITION BOARD</b><br/><i>Tiêu chuẩn dinh dưỡng thực vật 2026</i>", styles['SignNote']),
            Paragraph("<br/><br/><b>ĐÃ ĐỌC VÀ HOÀN TOÀN ĐỒNG THUẬN</b><br/><i>Áp dụng trong suốt thời gian sử dụng dịch vụ</i>", styles['SignNote'])
        ]
    ]
    sig_table = Table(sig_data, colWidths=[240, 247])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(KeepTogether([sig_table]))

    doc.build(story, canvasmaker=lambda *a, **k: CustomNumberedCanvas(*a, doc_title="QUY CHUẨN ẨM THỰC CHAY & MIỄN TRỪ Y TẾ", **k))
    print(f"Built Vegetarian Standards Doc: {output_path}")


def build_registration_agreement_doc(output_path):
    styles = get_doc_styles()
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54
    )
    story = []

    # Header Banner
    story.append(make_header_banner(styles, "04/2026/VGL-CONSENT"))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=12, spaceBefore=4))

    # Title
    story.append(Paragraph("BẢN CAM KẾT VÀ THỎA THUẬN CHẤP THUẬN KHI ĐĂNG KÝ TÀI KHOẢN", styles['DocTitle']))
    story.append(Paragraph("<b>(USER REGISTRATION CONSENT & COMMITMENT AGREEMENT)</b><br/>Văn bản tổng hợp thỏa thuận pháp lý điện tử ràng buộc giữa Người dùng và Nền tảng VeggieLife", styles['DocSubtitle']))

    # Intro
    story.append(Paragraph(
        "Văn bản này tổng hợp và chứng thực các cam kết pháp lý bắt buộc mà Người dùng đã tích chọn chấp thuận tại màn hình "
        "<b>Đăng ký tài khoản (SCR-02)</b> trên Nền tảng VeggieLife. Bản thỏa thuận này có giá trị pháp lý tương đương hợp đồng dịch vụ "
        "điện tử theo quy định của Luật Giao dịch điện tử số 20/2023/QH15 và Nghị định số 13/2023/NĐ-CP.",
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    # User Profile Box Mockup
    profile_data = [
        [Paragraph("<b>Họ và tên thành viên:</b> [Họ và tên khai báo]", styles['TableCell']), Paragraph("<b>Địa chỉ Email:</b> [Địa chỉ email xác thực OTP]", styles['TableCell'])],
        [Paragraph("<b>Mã định danh tài khoản:</b> USR-[UUID]", styles['TableCell']), Paragraph("<b>Trường phái chay ban đầu:</b> [1 trong 07 trường phái]", styles['TableCell'])],
        [Paragraph("<b>Thời điểm xác nhận:</b> 2026-10-30T17:56:00+07:00", styles['TableCell']), Paragraph("<b>Phương thức xác nhận:</b> Tích chọn điện tử + Email OTP", styles['TableCell'])],
    ]
    pt = Table(profile_data, colWidths=[240, 247])
    pt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(pt)
    story.append(Spacer(1, 10))

    # 4 Core Commitments
    story.append(Paragraph("BỐN CAM KẾT TRỌNG TÂM KHI KHỞI TẠO TÀI KHOẢN", styles['Heading1']))

    # Item 1
    story.append(Paragraph("☑ <b>Cam kết 1: Chấp thuận toàn bộ Điều khoản Dịch vụ và Quy chế Cộng đồng</b>", styles['Heading2']))
    story.append(Paragraph("Tôi xác nhận đã đọc, hiểu và đồng ý vô điều kiện với bản <i>Điều khoản Dịch vụ và Quy chế Hoạt động Cộng đồng</i> (Văn bản số 01/2026/VGL-TOS). Tôi cam kết bảo mật mật khẩu tài khoản (SEC-1), chấp hành quy định tạm khóa 15 phút nếu nhập sai quá 5 lần (SEC-3), tuân thủ bản quyền nội dung người dùng (UGC), và hoàn toàn chấp nhận thời hạn ân hạn 30 ngày trước khi dữ liệu tài khoản bị xóa vĩnh viễn (CO-23).", styles['Body']))

    # Item 2
    story.append(Paragraph("☑ <b>Cam kết 2: Đồng ý xử lý Dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP</b>", styles['Heading2']))
    story.append(Paragraph("Tôi hiểu rõ và đưa ra sự đồng thuận tự nguyện, minh bạch cho phép VeggieLife thu thập và xử lý các <b>Dữ liệu cá nhân nhạy cảm về y tế & sức khỏe</b> của tôi (bao gồm chiều cao, cân nặng, chỉ số BMI theo chuẩn WHO/WPRO, tỷ lệ BMR, TDEE, trường phái ăn chay và danh sách đen thực phẩm dị ứng). Tôi hiểu rằng dữ liệu này được bảo vệ theo tiêu chuẩn PRV-1, chỉ dùng cho mục đích cá nhân hóa thực đơn và không bao giờ bị thương mại hóa hay bán cho bên thứ ba.", styles['Body']))

    # Item 3
    story.append(Paragraph("☑ <b>Cam kết 3: Tuân thủ Bộ Quy chuẩn Ẩm thực Chay & Chế tài Báo động đỏ (Red Alert)</b>", styles['Heading2']))
    story.append(Paragraph("Tôi cam kết tôn trọng triết lý ẩm thực xanh của cộng đồng VeggieLife. Khi chia sẻ công thức hoặc đóng góp bài viết, tôi cam kết: (1) <b>TUYỆT ĐỐI KHÔNG ĐĂNG TẢI NỘI DUNG CHỨA THỊT ĐỎ</b>; (2) Không gian dối thành phần hoặc vi phạm chuẩn mực của 07 trường phái ăn chay; (3) Chấp hành việc bài viết bị gỡ bỏ ngay lập tức và đưa vào danh sách kiểm dịch <i>QUARANTINED_HIDDEN</i> nếu vi phạm cờ Báo động đỏ (Red Alert theo BR-ADM-CNT-003).", styles['Body']))

    # Item 4
    story.append(Paragraph("☑ <b>Cam kết 4: Xác nhận Tuyên bố Miễn trừ Trách nhiệm Dinh dưỡng & Y tế</b>", styles['Heading2']))
    story.append(Paragraph("Tôi xác nhận đã đọc kỹ và hoàn toàn đồng thuận với <i>Tuyên bố Miễn trừ Trách nhiệm Y tế</i> của VeggieLife. Tôi hiểu rõ nền tảng là công cụ tham khảo công nghệ và <b>không thay thế cho phác đồ điều trị y tế hoặc tư vấn của bác sĩ chuyên khoa</b>. Tôi tự chịu trách nhiệm về thể trạng sức khỏe cá nhân và việc áp dụng thực đơn dinh dưỡng chay.", styles['Body']))

    story.append(Spacer(1, 12))
    # Summary Table of Legal PDFs
    story.append(Paragraph("DANH MỤC CÁC TÀI LIỆU PHÁP LÝ LIÊN QUAN ĐƯỢC LƯU CHIỂU", styles['Heading1']))
    legal_files_data = [
        [Paragraph("Mã số", styles['TableHeader']), Paragraph("Tên tài liệu văn bản", styles['TableHeader']), Paragraph("Định dạng", styles['TableHeader']), Paragraph("Kênh lưu chiểu chính thức", styles['TableHeader'])],
        [Paragraph("VGL-TOS", styles['TableCellBold']), Paragraph("Điều khoản Dịch vụ và Quy chế Cộng đồng", styles['TableCell']), Paragraph("PDF / In ấn", styles['TableCell']), Paragraph("/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.pdf", styles['TableCell'])],
        [Paragraph("VGL-PDPD", styles['TableCellBold']), Paragraph("Chính sách Bảo mật và Bảo vệ Dữ liệu Cá nhân", styles['TableCell']), Paragraph("PDF / In ấn", styles['TableCell']), Paragraph("/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.pdf", styles['TableCell'])],
        [Paragraph("VGL-VEG", styles['TableCellBold']), Paragraph("Quy chuẩn Ẩm thực Chay & Tuyên bố Miễn trừ Y tế", styles['TableCell']), Paragraph("PDF / In ấn", styles['TableCell']), Paragraph("/legal/Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.pdf", styles['TableCell'])],
        [Paragraph("VGL-AGR", styles['TableCellBold']), Paragraph("Bản Cam kết Chấp thuận khi Đăng ký Thành viên", styles['TableCell']), Paragraph("PDF / Ký điện tử", styles['TableCell']), Paragraph("/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.pdf", styles['TableCell'])],
    ]
    lt = Table(legal_files_data, colWidths=[55, 172, 60, 200])
    lt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(lt)

    story.append(Spacer(1, 15))
    # Signature Box
    sig_data = [
        [
            Paragraph("<b>ĐẠI DIỆN NỀN TẢNG VEGGIELIFE</b><br/><i>(Xác thực chứng thư số hệ thống)</i>", styles['SignRole']),
            Paragraph("<b>CHỦ THỂ TÀI KHOẢN (NGƯỜI DÙNG)</b><br/><i>(Xác nhận cam kết qua tài khoản)</i>", styles['SignRole'])
        ],
        [
            Paragraph("<br/><br/><b>VEGGIELIFE SYSTEM ENGINE</b><br/><i>Mã chứng thực OTP hợp lệ</i>", styles['SignNote']),
            Paragraph("<br/><br/><b>ĐÃ ĐỒNG THUẬN HOÀN TOÀN</b><br/><i>Ghi nhận nhật ký đăng ký thành công</i>", styles['SignNote'])
        ]
    ]
    sig_table = Table(sig_data, colWidths=[240, 247])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(KeepTogether([sig_table]))

    doc.build(story, canvasmaker=lambda *a, **k: CustomNumberedCanvas(*a, doc_title="BẢN CAM KẾT ĐĂNG KÝ VEGGIELIFE", **k))
    print(f"Built Registration Agreement Doc: {output_path}")


def main():
    export_dir = r"D:\Exported_Legal_PDFs"
    docs_dir = r"D:\Frontend\docs\legal"
    os.makedirs(export_dir, exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)

    pdf_files = [
        ("Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.pdf", build_terms_doc),
        ("Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.pdf", build_privacy_doc),
        ("Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.pdf", build_vegetarian_standards_doc),
        ("Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.pdf", build_registration_agreement_doc),
    ]

    for filename, builder in pdf_files:
        export_path = os.path.join(export_dir, filename)
        doc_path = os.path.join(docs_dir, filename)
        print(f"\n--- Generating {filename} ---")
        builder(export_path)
        shutil.copy2(export_path, doc_path)
        print(f"Copied to: {doc_path} (Size: {os.path.getsize(doc_path)} bytes)")

    print(f"\nALL 4 PDF DOCUMENTS EXPORTED TO {export_dir} SUCCESSFULLY!")

if __name__ == "__main__":
    main()


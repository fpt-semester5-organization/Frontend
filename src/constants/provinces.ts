/**
 * 34 đơn vị hành chính cấp tỉnh từ 01/07/2025 (Nghị quyết 202/2025/QH15): 6 thành phố trực thuộc trung ương và 28 tỉnh.
 * Cấp huyện đã bỏ nên màn bản đồ không còn ô quận/huyện.
 *
 * UNSPECIFIED: spec chưa có danh mục tỉnh/thành. `name` là giá trị gửi lên tham số province của GET /venues/nearby,
 * cần BE khớp đúng các tên này. `center` là tọa độ gần đúng của trung tâm hành chính, chỉ dùng để căn giữa bản đồ.
 */
export interface Province {
  name: string;
  /** Tên hiển thị trong ô chọn. */
  label: string;
  center: { lat: number; lng: number };
}

const city = (name: string, lat: number, lng: number): Province => ({ name, label: `TP. ${name}`, center: { lat, lng } });
const province = (name: string, lat: number, lng: number): Province => ({ name, label: name, center: { lat, lng } });

export const PROVINCES: Province[] = [
  // Thành phố trực thuộc trung ương
  city('Hà Nội', 21.0285, 105.8542),
  city('Hồ Chí Minh', 10.7769, 106.7009),
  city('Hải Phòng', 20.8449, 106.6881),
  city('Đà Nẵng', 16.0544, 108.2022),
  city('Huế', 16.4637, 107.5909),
  city('Cần Thơ', 10.0452, 105.7469),
  // Tỉnh
  province('An Giang', 10.0125, 105.0809),
  province('Bắc Ninh', 21.2731, 106.1946),
  province('Cà Mau', 9.1769, 105.1524),
  province('Cao Bằng', 22.6657, 106.2579),
  province('Đắk Lắk', 12.6667, 108.05),
  province('Điện Biên', 21.386, 103.023),
  province('Đồng Nai', 10.9574, 106.8426),
  province('Đồng Tháp', 10.36, 106.36),
  province('Gia Lai', 13.782, 109.2192),
  province('Hà Tĩnh', 18.3428, 105.9057),
  province('Hưng Yên', 20.6464, 106.0511),
  province('Khánh Hòa', 12.2388, 109.1967),
  province('Lai Châu', 22.3964, 103.4582),
  province('Lâm Đồng', 11.9404, 108.4583),
  province('Lạng Sơn', 21.8537, 106.7615),
  province('Lào Cai', 21.7229, 104.9113),
  province('Nghệ An', 18.6796, 105.6813),
  province('Ninh Bình', 20.2506, 105.9745),
  province('Phú Thọ', 21.3227, 105.402),
  province('Quảng Ngãi', 15.1214, 108.8044),
  province('Quảng Ninh', 20.9517, 107.08),
  province('Quảng Trị', 17.4689, 106.6223),
  province('Sơn La', 21.327, 103.9141),
  province('Tây Ninh', 10.5359, 106.4137),
  province('Thái Nguyên', 21.5942, 105.8482),
  province('Thanh Hóa', 19.8075, 105.7764),
  province('Tuyên Quang', 21.8237, 105.2141),
  province('Vĩnh Long', 10.2537, 105.9722),
];

export const findProvince = (name: string) => PROVINCES.find((item) => item.name === name);

/** Danh sách các quận/huyện phổ biến theo từng tỉnh/thành để hỗ trợ lọc */
export const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  'Hồ Chí Minh': [
    'Quận 1',
    'Quận 3',
    'Quận 4',
    'Quận 5',
    'Quận 6',
    'Quận 7',
    'Quận 8',
    'Quận 10',
    'Quận 11',
    'Quận 12',
    'Bình Thạnh',
    'Phú Nhuận',
    'Gò Vấp',
    'Tân Bình',
    'Tân Phú',
    'Bình Tân',
    'TP. Thủ Đức',
    'Hóc Môn',
    'Bình Chánh',
    'Củ Chi',
    'Nhà Bè',
    'Cần Giờ',
  ],
  'Hà Nội': [
    'Ba Đình',
    'Hoàn Kiếm',
    'Đống Đa',
    'Hai Bà Trưng',
    'Cầu Giấy',
    'Tây Hồ',
    'Thanh Xuân',
    'Hoàng Mai',
    'Long Biên',
    'Nam Từ Liêm',
    'Bắc Từ Liêm',
    'Hà Đông',
    'Sơn Tây',
    'Gia Lâm',
    'Đông Anh',
    'Sóc Sơn',
    'Thanh Trì',
  ],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'],
  'Hải Phòng': ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Hải An', 'Kiến An', 'Đồ Sơn', 'Dương Kinh', 'Thủy Nguyên'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt', 'Phong Điền'],
  'Huế': ['TP. Huế', 'Hương Thủy', 'Hương Trà', 'Phú Vang', 'Quảng Điền', 'Phong Điền'],
  'Lâm Đồng': ['TP. Đà Lạt', 'TP. Bảo Lộc', 'Đức Trọng', 'Đơn Dương', 'Di Linh'],
  'Khánh Hòa': ['TP. Nha Trang', 'TP. Cam Ranh', 'Ninh Hòa', 'Diên Khánh'],
  'Đồng Nai': ['TP. Biên Hòa', 'TP. Long Khánh', 'Long Thành', 'Nhơn Trạch', 'Trảng Bom'],
};

export const getDistrictsForProvince = (provinceName: string): string[] => {
  return DISTRICTS_BY_PROVINCE[provinceName] ?? [];
};


import { bypass, http } from 'msw';
import { api, currentUser, fail, latency, ok, validationError } from '../utils';

// Mô phỏng FN-BAR-01 / FN-BAR-02 (docs/09. Task Cards). Giống BE thật, sản phẩm tra trên Open Food Facts
// (timeout 3 giây) nên quét thử được sản phẩm thật khi chưa có backend. Mã 200000000001x là dữ liệu mẫu dùng offline.

type AdditiveStatus = 'VEGAN' | 'DOUBTFUL' | 'NON_VEGAN';
type Verdict = 'GREEN' | 'YELLOW' | 'RED';

const GUEST_DAILY_LIMIT = 3;
const OFF_TIMEOUT_MS = 3000;
const OFF_FIELDS = 'product_name,product_name_vi,brands,additives_tags,ingredients_analysis_tags,allergens_tags,ingredients_text';

/** Một phần từ điển E-numbers (BR-ADM-MAS-002, BR-SCI-05); mã không có trong bảng coi là nguồn thực vật/tổng hợp. */
const E_NUMBERS: Record<string, { name: string; status: AdditiveStatus }> = {
  E120: { name: 'Carmine (phẩm đỏ từ côn trùng)', status: 'NON_VEGAN' },
  E428: { name: 'Gelatin', status: 'NON_VEGAN' },
  E441: { name: 'Gelatin', status: 'NON_VEGAN' },
  E542: { name: 'Phốt phát từ xương', status: 'NON_VEGAN' },
  E901: { name: 'Sáp ong', status: 'NON_VEGAN' },
  E904: { name: 'Shellac (cánh kiến)', status: 'NON_VEGAN' },
  E913: { name: 'Lanolin (mỡ lông cừu)', status: 'NON_VEGAN' },
  E966: { name: 'Lactitol (từ sữa)', status: 'NON_VEGAN' },
  E1105: { name: 'Lysozyme (từ trứng)', status: 'NON_VEGAN' },
  E322: { name: 'Lecithin', status: 'DOUBTFUL' },
  E422: { name: 'Glycerol', status: 'DOUBTFUL' },
  E470: { name: 'Muối của axit béo', status: 'DOUBTFUL' },
  E471: { name: 'Mono- và diglyceride của axit béo', status: 'DOUBTFUL' },
  E472: { name: 'Este của mono- và diglyceride', status: 'DOUBTFUL' },
  E570: { name: 'Axit stearic', status: 'DOUBTFUL' },
  E572: { name: 'Magie stearat', status: 'DOUBTFUL' },
  E627: { name: 'Dinatri guanylat', status: 'DOUBTFUL' },
  E631: { name: 'Dinatri inosinat', status: 'DOUBTFUL' },
  E635: { name: 'Dinatri ribonucleotide', status: 'DOUBTFUL' },
  E920: { name: 'L-cysteine', status: 'DOUBTFUL' },
  E150D: { name: 'Màu caramel amoni sunfit', status: 'VEGAN' },
  E160A: { name: 'Beta-caroten', status: 'VEGAN' },
  E270: { name: 'Axit lactic', status: 'VEGAN' },
  E320: { name: 'BHA (chống oxy hóa)', status: 'VEGAN' },
  E321: { name: 'BHT (chống oxy hóa)', status: 'VEGAN' },
  E330: { name: 'Axit citric', status: 'VEGAN' },
  E338: { name: 'Axit photphoric', status: 'VEGAN' },
  E418: { name: 'Gôm gellan', status: 'VEGAN' },
  E451: { name: 'Triphosphat', status: 'VEGAN' },
  E500: { name: 'Natri cacbonat', status: 'VEGAN' },
  E501: { name: 'Kali cacbonat', status: 'VEGAN' },
  E503: { name: 'Amoni cacbonat', status: 'VEGAN' },
  E621: { name: 'Mì chính (MSG)', status: 'VEGAN' },
};

/** Nhóm dị ứng của Open Food Facts → tên tiếng Việt (GET /allergens). */
const ALLERGENS: Record<string, { allergenId: number; code: string; allergenName: string }> = {
  'en:peanuts': { allergenId: 1, code: 'PEANUT', allergenName: 'Đậu phộng' },
  'en:soybeans': { allergenId: 2, code: 'SOY', allergenName: 'Đậu nành' },
  'en:gluten': { allergenId: 3, code: 'GLUTEN', allergenName: 'Gluten (lúa mì)' },
  'en:nuts': { allergenId: 4, code: 'TREE_NUT', allergenName: 'Quả hạch' },
  'en:sesame-seeds': { allergenId: 5, code: 'SESAME', allergenName: 'Mè (vừng)' },
  'en:milk': { allergenId: 6, code: 'MILK', allergenName: 'Sữa' },
  'en:eggs': { allergenId: 7, code: 'EGG', allergenName: 'Trứng' },
  'en:crustaceans': { allergenId: 8, code: 'CRUSTACEAN', allergenName: 'Giáp xác' },
};
/** Danh sách dị ứng đã khai báo của người dùng giả (UserAllergies). */
const USER_ALLERGIES: Record<number, string[]> = { 1024: ['en:nuts', 'en:soybeans'], 2048: ['en:gluten'] };

/**
 * Bổ sung so với FN-BAR-01 (chỉ xét mã E): xét cả thành phần để sản phẩm có sữa/trứng/thịt không bị Xanh,
 * đúng tinh thần BR-USR-09 ("100% nguồn gốc thực vật mới xanh").
 */
const PLANT_PHRASES = /(cocoa|shea|peanut|nut|coconut|almond|soy|oat|rice)\s+(butter|milk|cream)|sữa\s+(đậu nành|dừa|hạt|yến mạch|gạo)|bơ\s+(thực vật|đậu phộng)/giu;
const ANIMAL_WORDS: [RegExp, string][] = [
  [/(^|[^\p{L}])(milk|whey|casein|lactose|cheese|butter|cream|latte|lait|milch|sữa|phô mai)([^\p{L}]|$)/iu, 'sữa'],
  [/(^|[^\p{L}])(eggs?|uova|oeufs?|trứng)([^\p{L}]|$)/iu, 'trứng'],
  [/(^|[^\p{L}])(honey|miele|miel|honig|mật ong)([^\p{L}]|$)/iu, 'mật ong'],
  [/(^|[^\p{L}])(gelatine?|gelatina)([^\p{L}]|$)/iu, 'gelatin'],
  [/(^|[^\p{L}])(beef|pork|chicken|meat|lard|tallow|thịt|mỡ heo|mỡ lợn)([^\p{L}]|$)/iu, 'thịt/mỡ động vật'],
  [/(^|[^\p{L}])(fish|anchov(y|ies)|shrimp|prawns?|tôm|cá cơm|nước mắm)([^\p{L}]|$)/iu, 'thủy sản'],
];

interface ProductRecord {
  barcode: string;
  productName: string;
  brand: string | null;
  additiveTags: string[];
  analysisTags: string[];
  allergenTags: string[];
  ingredientsText: string;
}

/** Sản phẩm mẫu (mã nội bộ 200…, không trùng sản phẩm thật) để thử offline đủ 3 màu. */
const LOCAL_PRODUCTS: ProductRecord[] = [
  { barcode: '2000000000015', productName: 'Sữa đậu nành nguyên chất (dữ liệu mẫu)', brand: 'VeggieLife', additiveTags: [], analysisTags: ['en:vegan'], allergenTags: ['en:soybeans'], ingredientsText: 'nước, đậu nành, đường mía' },
  { barcode: '2000000000022', productName: 'Bánh quy bơ thực vật (dữ liệu mẫu)', brand: 'VeggieLife', additiveTags: ['en:e471', 'en:e500'], analysisTags: ['en:maybe-vegan'], allergenTags: ['en:gluten'], ingredientsText: 'bột mì, dầu cọ, đường, chất nhũ hóa (E471), bột nở (E500)' },
  { barcode: '2000000000039', productName: 'Kẹo dẻo trái cây (dữ liệu mẫu)', brand: 'VeggieLife', additiveTags: ['en:e441', 'en:e120'], analysisTags: ['en:non-vegan'], allergenTags: [], ingredientsText: 'đường, si-rô glucose, gelatin, phẩm màu carmine (E120)' },
];

const productCache = new Map<string, ProductRecord | null>();

class OffUnavailableError extends Error {}

async function findProduct(barcode: string): Promise<ProductRecord | null> {
  const local = LOCAL_PRODUCTS.find((product) => product.barcode === barcode);
  if (local) return local;
  if (productCache.has(barcode)) return productCache.get(barcode) ?? null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
    const res = await fetch(bypass(url, { signal: controller.signal }));
    if (res.status === 404) {
      productCache.set(barcode, null);
      return null;
    }
    if (!res.ok) throw new OffUnavailableError();
    const body = (await res.json()) as { status?: number; product?: Record<string, unknown> };
    if (body.status !== 1 || !body.product) {
      productCache.set(barcode, null);
      return null;
    }
    const product = body.product;
    const record: ProductRecord = {
      barcode,
      productName: String(product.product_name_vi || product.product_name || `Sản phẩm ${barcode}`),
      brand: product.brands ? String(product.brands).split(',')[0].trim() : null,
      additiveTags: Array.isArray(product.additives_tags) ? (product.additives_tags as string[]) : [],
      analysisTags: Array.isArray(product.ingredients_analysis_tags) ? (product.ingredients_analysis_tags as string[]) : [],
      allergenTags: Array.isArray(product.allergens_tags) ? (product.allergens_tags as string[]) : [],
      ingredientsText: typeof product.ingredients_text === 'string' ? product.ingredients_text : '',
    };
    productCache.set(barcode, record);
    return record;
  } catch {
    throw new OffUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}

/** "en:e322i" → "E322", "en:e150d" → "E150D". */
function toAdditives(tags: string[]) {
  const codes = new Set<string>();
  for (const tag of tags) {
    const match = /^en:e(\d{3,4})([a-z]?)/.exec(tag);
    if (!match) continue;
    const withLetter = `E${match[1]}${match[2].toUpperCase()}`;
    codes.add(E_NUMBERS[withLetter] ? withLetter : `E${match[1]}`);
  }
  return [...codes].map((code) => ({
    code,
    name: E_NUMBERS[code]?.name ?? `Phụ gia ${code}`,
    veganStatus: E_NUMBERS[code]?.status ?? ('VEGAN' as AdditiveStatus),
  }));
}

function classify(product: ProductRecord) {
  const additives = toAdditives(product.additiveTags);
  const nonVegan = additives.filter((item) => item.veganStatus === 'NON_VEGAN');
  const doubtful = additives.filter((item) => item.veganStatus === 'DOUBTFUL');
  const text = product.ingredientsText.replace(PLANT_PHRASES, ' ');
  const animal = ANIMAL_WORDS.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  const tags = product.analysisTags;
  const list = (items: { code: string; name: string }[]) => items.map((item) => `${item.code} (${item.name})`).join(', ');

  let verdict: Verdict;
  let verdictText: string;
  if (nonVegan.length > 0) {
    verdict = 'RED';
    verdictText = `Chứa phụ gia có nguồn gốc động vật: ${list(nonVegan)}.`;
  } else if (animal.length > 0) {
    verdict = 'RED';
    verdictText = `Thành phần có nguồn gốc động vật: ${animal.join(', ')}.`;
  } else if (tags.includes('en:non-vegan')) {
    verdict = 'RED';
    verdictText = 'Dữ liệu thành phần cho thấy sản phẩm có nguyên liệu từ động vật.';
  } else if (tags.includes('en:vegan')) {
    verdict = 'GREEN';
    verdictText =
      doubtful.length > 0
        ? `Thành phần đều từ thực vật; phụ gia ${doubtful.map((item) => item.code).join(', ')} đã được xác định nguồn thực vật.`
        : 'Thành phần và phụ gia đều có nguồn gốc thực vật.';
  } else if (doubtful.length > 0) {
    verdict = 'YELLOW';
    verdictText = `Chứa phụ gia nghi vấn nguồn gốc: ${list(doubtful)}. Cần xác minh với nhà sản xuất.`;
  } else if (!product.ingredientsText) {
    verdict = 'YELLOW';
    verdictText = 'Chưa có dữ liệu thành phần để xác nhận sản phẩm thuần chay.';
  } else if (tags.includes('en:maybe-vegan') || tags.includes('en:vegan-status-unknown')) {
    verdict = 'YELLOW';
    verdictText = 'Một số thành phần chưa rõ nguồn gốc (ví dụ hương liệu), hãy đọc kỹ nhãn.';
  } else {
    verdict = 'GREEN';
    verdictText = 'Không phát hiện thành phần hay phụ gia có nguồn gốc động vật.';
  }
  return { verdict, verdictText, additives };
}

/** Hạn mức quét của Khách trong ngày (Redis guest_quota:{guestId}:barcode ở bản thật). */
const guestScans = { day: '', used: 0 };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

interface ScanRecord {
  scanId: number;
  userId: number;
  barcode: string;
  productName: string;
  veganVerdict: Verdict;
  isAllergenTriggered: boolean;
  scannedAt: string;
}
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
let nextScanId = 9100;
const scans: ScanRecord[] = [
  { scanId: 9001, userId: 1024, barcode: '8934563138165', productName: 'Mì Hảo Hảo tôm chua cay', veganVerdict: 'RED', isAllergenTriggered: false, scannedAt: hoursAgo(3) },
  { scanId: 9002, userId: 1024, barcode: '5411188110835', productName: 'Alpro sữa hạnh nhân', veganVerdict: 'GREEN', isAllergenTriggered: true, scannedAt: hoursAgo(26) },
  { scanId: 9003, userId: 1024, barcode: '5449000000996', productName: 'Coca-Cola Original', veganVerdict: 'YELLOW', isAllergenTriggered: false, scannedAt: hoursAgo(50) },
  { scanId: 9004, userId: 1024, barcode: '2000000000039', productName: 'Kẹo dẻo trái cây (dữ liệu mẫu)', veganVerdict: 'RED', isAllergenTriggered: false, scannedAt: hoursAgo(75) },
  { scanId: 9005, userId: 1024, barcode: '2000000000015', productName: 'Sữa đậu nành nguyên chất (dữ liệu mẫu)', veganVerdict: 'GREEN', isAllergenTriggered: true, scannedAt: hoursAgo(98) },
  { scanId: 9006, userId: 2048, barcode: '2000000000022', productName: 'Bánh quy bơ thực vật (dữ liệu mẫu)', veganVerdict: 'YELLOW', isAllergenTriggered: true, scannedAt: hoursAgo(10) },
];

export const barcodeHandlers = [
  // GET /products/barcode/{barcode} — FN-BAR-01
  http.get(api('/products/barcode/:barcode'), async ({ request, params }) => {
    await latency();
    const barcode = String(params.barcode);
    const method = new URL(request.url).searchParams.get('method') ?? 'CAMERA_BARCODE';
    // 1. Định dạng mã
    if (!/^\d{8,14}$/.test(barcode)) {
      return validationError([{ field: 'barcode', message: 'Mã vạch phải gồm 8–14 chữ số (EAN-8, EAN-13, UPC-A).' }]);
    }
    if (method !== 'CAMERA_BARCODE' && method !== 'MANUAL_INPUT') {
      return validationError([{ field: 'method', message: 'method là CAMERA_BARCODE hoặc MANUAL_INPUT.' }]);
    }
    // 2. Hạn mức Khách: 03 lượt/ngày
    const me = currentUser(request);
    if (!me) {
      if (guestScans.day !== today()) Object.assign(guestScans, { day: today(), used: 0 });
      if (guestScans.used >= GUEST_DAILY_LIMIT) {
        return fail(403, 'ERR_QUOTA_BARCODE_EXCEEDED', 'Bạn đã dùng hết 03 lượt quét hôm nay. Đăng ký để quét không giới hạn.');
      }
    }
    // 3–4. Tra sản phẩm (nội bộ → Open Food Facts); không có thì 404 và không trừ lượt
    let product: ProductRecord | null;
    try {
      product = await findProduct(barcode);
    } catch {
      return fail(503, 'ERR_EXT_OPENFOODFACTS_FAILED', 'Dịch vụ tra cứu sản phẩm Open Food Facts không phản hồi, vui lòng thử lại.');
    }
    if (!product) return fail(404, 'ERR_PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm với mã vạch này. Lượt quét không bị tính.');

    // 5–6. Phụ gia & kết luận; 7. Dị ứng cá nhân của Thành viên
    const { verdict, verdictText, additives } = classify(product);
    const allergenWarnings = me
      ? product.allergenTags.filter((tag) => USER_ALLERGIES[me.userId]?.includes(tag)).map((tag) => ALLERGENS[tag]).filter(Boolean)
      : [];

    // 8–9. Lưu lịch sử (Thành viên) hoặc trừ lượt (Khách)
    let quota: { used: number; limit: number; remaining: number } | undefined;
    if (me) {
      scans.unshift({
        scanId: nextScanId++,
        userId: me.userId,
        barcode,
        productName: product.productName,
        veganVerdict: verdict,
        isAllergenTriggered: allergenWarnings.length > 0,
        scannedAt: new Date().toISOString(),
      });
    } else {
      guestScans.used += 1;
      quota = { used: guestScans.used, limit: GUEST_DAILY_LIMIT, remaining: GUEST_DAILY_LIMIT - guestScans.used };
    }

    return ok(
      {
        barcode,
        productName: product.productName,
        brand: product.brand,
        veganVerdict: verdict,
        verdictText,
        detectedAdditives: additives,
        personalAllergyCheck: !!me,
        allergenWarnings,
        ...(quota ? { quota } : {}),
      },
      'Tra cứu mã vạch thành công.'
    );
  }),

  // GET /users/me/scans — FN-BAR-02
  http.get(api('/users/me/scans'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return fail(403, 'ERR_GUEST_PERSONALIZATION_RESTRICTED', 'Khách không có lịch sử quét. Đăng ký để lưu lịch sử.');
    const url = new URL(request.url);
    const verdict = url.searchParams.get('verdict');
    const allergenOnly = url.searchParams.get('allergenOnly') === 'true';
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 20);
    if (verdict && !['RED', 'YELLOW', 'GREEN'].includes(verdict)) {
      return validationError([{ field: 'verdict', message: 'verdict là RED, YELLOW hoặc GREEN.' }]);
    }
    if (!Number.isInteger(size) || size < 1 || size > 50) return validationError([{ field: 'size', message: 'size trong khoảng 1–50.' }]);

    const mine = scans
      .filter((scan) => scan.userId === me.userId)
      .filter((scan) => !verdict || scan.veganVerdict === verdict)
      .filter((scan) => !allergenOnly || scan.isAllergenTriggered)
      .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
    const items = mine.slice((page - 1) * size, page * size).map(({ userId: _userId, ...item }) => item);
    return ok(items, 'OK', 200, { page, size, total: mine.length });
  }),
];

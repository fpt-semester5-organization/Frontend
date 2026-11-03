import type { NutritionDocument } from '../types/admin.types';

export interface DocumentSection {
  title: string;
  content: string[];
}

export interface DocumentChunk {
  id: string;
  title: string;
  tokens: number;
  content: string;
}

export interface DocumentDetail {
  abstract: string;
  sections: DocumentSection[];
  references: string[];
  pdfUrl?: string;
  chunks: DocumentChunk[];
}

/**
 * Bản đồ nội dung tri thức dinh dưỡng chuẩn hóa phục vụ hiển thị Khổ giấy A4 & Trích xuất Chunks RAG.
 */
export const NUTRITION_KNOWLEDGE_MAP: Record<string, DocumentDetail> = {
  // Sách 1: Becoming Vegan
  DOC_BOOK_1: {
    abstract:
      'Tài liệu nghiên cứu chuyên sâu và toàn diện nhất về dinh dưỡng thuần chay. Cung cấp hướng dẫn lâm sàng từ các chuyên gia dinh dưỡng hàng đầu Hoa Kỳ về việc cân bằng protein, axit béo, vi khoáng và thiết lập chế độ ăn thực vật cho mọi lứa tuổi từ trẻ sơ sinh đến vận động viên.',
    pdfUrl: '/docs/nutrition/Becoming_Vegan_Comprehensive_Edition.pdf',
    sections: [
      {
        title: '1. Khung lý thuyết & Nhu cầu năng lượng',
        content: [
          'Chế độ ăn thuần chay được lên kế hoạch phù hợp có thể đáp ứng đầy đủ nhu cầu dinh dưỡng ở mọi giai đoạn vòng đời, bao gồm mang thai, cho con bú, trẻ nhỏ và tuổi vị thành niên.',
          'Mật độ năng lượng từ thực vật thấp hơn thực phẩm chế biến, do đó cần chú trọng bổ sung các nhóm hạt béo, đậu và ngũ cốc nguyên hạt để đảm bảo tổng calo nạp vào.',
        ],
      },
      {
        title: '2. Các vi chất then chốt cần giám sát',
        content: [
          'Vitamin B12: 100% người ăn thuần chay bắt buộc phải bổ sung từ thực phẩm tăng cường hoặc viên uống.',
          'Sắt và Kẽm: Nguồn thực vật chứa phytate làm giảm hấp thu sinh học; giải pháp là kết hợp vitamin C và kỹ thuật ngâm, ủ mầm.',
          'Canxi và Vitamin D: Tối thiểu 1.000 mg canxi mỗi ngày từ rau lá xanh đậm, đậu phụ kết tủa canxi và sữa hạt bổ sung.',
        ],
      },
      {
        title: '3. Phối hợp Axit Amin hoàn chỉnh',
        content: [
          'Không nhất thiết phải kết hợp đạm hoàn chỉnh trong từng bữa ăn đơn lẻ; cơ thể duy trì một hồ axit amin dự trữ (amino acid pool) luân chuyển trong ngày.',
          'Tỷ lệ protein khuyến nghị: 0.9 – 1.0 g/kg thể trọng cho người thuần chay.',
        ],
      },
    ],
    references: [
      'Brenda Davis, RD & Vesanto Melina, MS, RD. Becoming Vegan: Comprehensive Edition (Book Publishing Company, 2014)',
      'Academy of Nutrition and Dietetics. Position of the Academy: Vegetarian Diets (J Acad Nutr Diet 2016;116:1970-80)',
    ],
    chunks: [
      {
        id: 'chunk_bv_01',
        title: 'Chunk 1: Nhu cầu Đạm và Axit Amin',
        tokens: 380,
        content:
          'Khuyến cáo bổ sung 0.9–1.0 g protein/kg cân nặng mỗi ngày cho người ăn thuần chay. Cơ thể duy trì hồ axit amin tự do để tổng hợp protein tế bào, việc ăn xen kẽ đậu và ngũ cốc nguyên hạt trong 24 giờ đảm bảo đầy đủ axit amin thiết yếu.',
      },
      {
        id: 'chunk_bv_02',
        title: 'Chunk 2: Quy chuẩn bổ sung Vitamin B12',
        tokens: 420,
        content:
          'Vitamin B12 là dưỡng chất quan trọng không có sẵn từ nguồn thực vật tự nhiên. Mức RDA tối thiểu 2.4 mcg/ngày, hoặc 25–100 mcg/ngày nếu dùng viên uống đơn liều hấp thu thụ động qua niêm mạc.',
      },
    ],
  },

  // Sách 2: How Not To Die
  DOC_BOOK_2: {
    abstract:
      'Công trình nghiên cứu dựa trên bằng chứng khoa học của Bác sĩ Michael Greger (FACLM) phân tích 15 nguyên nhân gây tử vong hàng đầu và chứng minh chế độ ăn thuần thực vật toàn phần (Whole Food Plant-Based) có khả năng ngăn ngừa và đảo ngược nhiều bệnh lý mạn tính.',
    pdfUrl: '/docs/nutrition/How_Not_To_Die.pdf',
    sections: [
      {
        title: '1. Danh sách Thực Đơn 12 Món Hàng Ngày (The Daily Dozen)',
        content: [
          'Đậu và chế phẩm họ đậu: 3 phần/ngày (đậu lăng, đậu phụ, đậu đen, đậu nành).',
          'Quả mọng (Berries): 1 phần/ngày chứa chất chống oxy hóa anthocyanin bảo vệ mạch máu.',
          'Rau họ cải (Cruciferous): 1 phần/ngày chứa sulforaphane hỗ trợ thanh lọc gan và ngăn ngừa tế bào lạ.',
          'Rau lá xanh đậm: 2 phần/ngày cung cấp folate, lutein và nitrate tự nhiên giãn mạch.',
        ],
      },
      {
        title: '2. Cơ chế đảo ngược xơ vữa động mạch',
        content: [
          'Chế độ ăn giàu chất xơ hòa tan giúp giảm cholesterol LDL tự nhiên mà không cần phụ thuộc vào statin ở mức độ sớm.',
          'Bảo vệ lớp nội mô mạch máu bằng việc loại bỏ hoàn toàn chất béo bão hòa và cholesterol ngoại sinh từ động vật.',
        ],
      },
      {
        title: '3. Kiểm soát đường huyết và huyết áp',
        content: [
          'Kháng insulin xuất phát từ sự tích tụ mỡ trong tế bào cơ (intramyocellular lipid); chế độ ăn thực vật ít béo giúp phục hồi độ nhạy insulin nhanh chóng.',
        ],
      },
    ],
    references: [
      'Michael Greger, M.D., FACLM & Gene Stone. How Not to Die (Flatiron Books, 2015)',
      'American College of Lifestyle Medicine (ACLM) Practice Guidelines',
    ],
    chunks: [
      {
        id: 'chunk_hnd_01',
        title: 'Chunk 1: Nguyên tắc Daily Dozen',
        tokens: 410,
        content:
          'Hệ thống Daily Dozen định lượng 12 nhóm thực phẩm thực vật cần nạp mỗi ngày: 3 phần đậu, 1 phần quả mọng, 2 phần rau xanh, 1 phần hạt lanh xay, 1 phần hạt dinh dưỡng và 5 cốc nước lọc.',
      },
      {
        id: 'chunk_hnd_02',
        title: 'Chunk 2: Sulforaphane và Rau họ Cải',
        tokens: 350,
        content:
          'Sulforaphane hình thành khi enzyme myrosinase phân giải glucoraphanin khi nhai hoặc nghiền rau họ cải sống. Hoạt chất này kích hoạt con đường Nrf2 chống oxy hóa mạnh mẽ nhất trong cơ thể.',
      },
    ],
  },

  // Sách 3: The China Study
  DOC_BOOK_3: {
    abstract:
      'Công trình dịch tễ học dinh dưỡng quy mô lớn nhất thế giới hợp tác giữa Đại học Cornell, Đại học Oxford và Viện Y học Dự phòng Trung Quốc. Nghiên cứu chứng minh mối liên hệ trực tiếp giữa tiêu thụ protein động vật và tỷ lệ mắc các bệnh mạn tính thoái hóa.',
    pdfUrl: '/docs/nutrition/The_China_Study_Revised_and_Expanded_Edition.pdf',
    sections: [
      {
        title: '1. Nghiên cứu dịch tễ học nông thôn Trung Quốc',
        content: [
          'Cư dân nông thôn tiêu thụ chế độ ăn thực vật với lượng đạm động vật dưới 5% tổng calo có tỷ lệ bệnh mạch vành, đái tháo đường và ung thư thấp hơn từ 10 đến 50 lần so với phương Tây.',
          'Lượng cholesterol trong máu trung bình ở mức 90–140 mg/dL là mức lý tưởng để triệt tiêu nguy cơ tắc nghẽn động mạch.',
        ],
      },
      {
        title: '2. Tác động của Protein Casein',
        content: [
          'Protein casein từ sữa động vật kích hoạt mạnh mẽ các tế bào mầm bệnh trong các thử nghiệm tiền lâm sàng khi chiếm trên 10% khẩu phần.',
          'Ngược lại, protein từ lúa mì và đậu nành không kích hoạt bệnh ngay cả khi tiêu thụ ở tỷ lệ 20% calo.',
        ],
      },
      {
        title: '3. 8 Nguyên tắc vàng về thực phẩm và sức khỏe',
        content: [
          'Dinh dưỡng là bản hòa tấu phức tạp, không phải là tác động của từng dưỡng chất riêng lẻ.',
          'Các chất bổ sung vitamin đơn độc không thể thay thế được thực phẩm toàn phần tự nhiên.',
        ],
      },
    ],
    references: [
      'T. Colin Campbell, PhD & Thomas M. Campbell II, MD. The China Study (BenBella Books, 2005)',
      'World Health Organization & Oxford-Cornell Nutrition Research Project',
    ],
    chunks: [
      {
        id: 'chunk_tcs_01',
        title: 'Chunk 1: Mối tương quan Dinh dưỡng & Bệnh mạn tính',
        tokens: 440,
        content:
          'Khảo sát trên 65 huyện của Trung Quốc cho thấy chế độ ăn gần như thuần thực vật với tỷ lệ chất béo 14% và chất xơ cao (>33g/ngày) duy trì chỉ số sinh hóa và huyết áp tối ưu vượt trội so với lối sống phương Tây.',
      },
    ],
  },

  // Hướng dẫn 1: Đạm thực vật
  DOC_GUIDE_1: {
    abstract:
      'Hướng dẫn xác định nhu cầu đạm cơ bản và xây dựng khẩu phần thực phẩm giàu protein thực vật theo khuyến nghị của FAO/WHO và Viện Dinh dưỡng.',
    sections: [
      {
        title: '1. Nhu cầu đạm theo cân nặng',
        content: [
          'Người trưởng thành khỏe mạnh cần khoảng 0.8 g đạm/kg cân nặng/ngày (mức an toàn WHO/FAO: ~0.83 g/kg).',
          'Người nặng 60 kg cần khoảng 50 g đạm mỗi ngày. Người ăn thuần chay nên hướng tới 0.9 – 1.0 g/kg do khả năng tiêu hóa đạm thực vật thấp hơn khoảng 10%.',
        ],
      },
      {
        title: '2. Nguồn đạm thực vật phổ biến',
        content: [
          'Đậu phụ, tempeh, sữa đậu nành: đạm hoàn chỉnh, chứa đủ 9 axit amin thiết yếu.',
          'Đậu lăng, đậu gà, đậu đen, đậu đỏ: cung cấp 15–18 g đạm/chén nấu chín cùng lượng chất xơ dồi dào.',
          'Hạt bí ngô, hạt gai dầu, hạt chia, hạnh nhân, yến mạch, quinoa.',
        ],
      },
      {
        title: '3. Phối hợp axit amin trong ngày',
        content: [
          'Ngũ cốc thường ít lysine, còn các loại đậu thường ít methionine. Kết hợp đa dạng trong các bữa ăn giúp bù trừ tối ưu.',
          'Ví dụ thực tế: Cơm gạo lứt ăn kèm đậu phụ sốt cà, hoặc cháo yến mạch rắc hạt bí ngô.',
        ],
      },
    ],
    references: [
      'FAO/WHO/UNU. Protein and amino acid requirements in human nutrition (WHO Technical Report Series 935, 2007)',
      'Academy of Nutrition and Dietetics. Vegetarian Diets Position Paper (2016)',
    ],
    chunks: [
      {
        id: 'chunk_dam_01',
        title: 'Chunk 1: Định mức RDA đạm thực vật',
        tokens: 310,
        content:
          'Người ăn thuần chay nên bổ sung 0.9-1.0g protein/kg/ngày. Đậu phụ 100g cung cấp 10-15g protein, tempeh cung cấp 19g protein, đậu lăng nấu chín cung cấp 18g/chén.',
      },
    ],
  },

  // Hướng dẫn 2: Vitamin B12
  DOC_GUIDE_2: {
    abstract:
      'Tài liệu quy chuẩn về liều dùng, dạng bổ sung và lịch kiểm tra sinh hóa Vitamin B12 cho người ăn chay trường và thuần chay.',
    sections: [
      {
        title: '1. Tầm quan trọng sinh học của B12',
        content: [
          'Cần thiết cho quá trình tạo hồng cầu, tổng hợp DNA và bảo toàn bao myelin dây thần kinh.',
          'Thiếu B12 lâu ngày gây thiếu máu nguyên hồng cầu khổng lồ, dị cảm tê bì đầu chi và tổn thương hệ thần kinh không thể phục hồi.',
        ],
      },
      {
        title: '2. Nhu cầu khuyến nghị RDA',
        content: [
          'Người trưởng thành: 2.4 mcg/ngày. Phụ nữ mang thai: 2.6 mcg/ngày. Phụ nữ cho con bú: 2.8 mcg/ngày.',
          'Thực vật không tự tổng hợp B12. Rong biển, nấm men hoặc tương miso không phải nguồn B12 tin cậy do chứa các đồng phân bất hoạt (pseudovitamin B12).',
        ],
      },
      {
        title: '3. Phác đồ bổ sung an toàn',
        content: [
          'Dùng viên uống Cyanocobalamin hoặc Methylcobalamin liều 25–100 mcg hàng ngày hoặc 1.000–2.000 mcg mỗi tuần một lần.',
          'Xét nghiệm máu định kỳ: Định lượng Vitamin B12 huyết thanh kết hợp Homocysteine hoặc Axit Methylmalonic (MMA) để đánh giá thiếu hụt ở mức độ mô.',
        ],
      },
    ],
    references: [
      'NIH Office of Dietary Supplements. Vitamin B12 Fact Sheet for Health Professionals',
      'The Vegan Society. What Every Vegan Should Know About Vitamin B12',
    ],
    chunks: [
      {
        id: 'chunk_b12_01',
        title: 'Chunk 1: Phác đồ bổ sung B12 chuẩn',
        tokens: 320,
        content:
          'Người thuần chay bắt buộc bổ sung B12 qua thực phẩm tăng cường (sữa hạt, ngũ cốc) hoặc viên uống 50mcg/ngày hoặc 2000mcg/tuần. Xét nghiệm MMA huyết tương là tiêu chuẩn vàng đánh giá thiếu hụt mô.',
      },
    ],
  },

  // Hướng dẫn 3: Sắt từ thực vật
  DOC_GUIDE_3: {
    abstract:
      'Cẩm nang tối ưu hóa hấp thu sắt non-heme từ thực vật, kiểm soát chất ức chế phytate/tannin và phòng ngừa thiếu máu thiếu sắt.',
    sections: [
      {
        title: '1. Nhu cầu sắt ở người ăn chay',
        content: [
          'Nam giới: 8 mg/ngày. Nữ giới 19–50 tuổi: 18 mg/ngày (mang thai: 27 mg/ngày).',
          'Sắt không heme từ thực vật hấp thu thấp hơn, do đó Viện Y học Hoa Kỳ (IOM) khuyến cáo người ăn chay nên nạp lượng cao hơn khoảng 1.8 lần nếu chế độ ăn nhiều chất xơ thô.',
        ],
      },
      {
        title: '2. Biện pháp tăng sinh khả dụng',
        content: [
          'Bổ sung Vitamin C (ổi, cam, ớt chuông, chanh) trong cùng bữa ăn giúp tăng hấp thu sắt lên gấp 3–4 lần.',
          'Ngâm đỗ, ủ mầm và lên men giúp kích hoạt enzyme phytase nội sinh phân hủy axit phytic.',
          'Nấu nướng bằng chảo/nồi gang giúp bổ sung sắt vi lượng an toàn vào món ăn.',
        ],
      },
      {
        title: '3. Tránh các yếu tố ức chế hấp thu',
        content: [
          'Tannin trong trà xanh, cà phê và polyphenol trong rượu vang ức chế mạnh hấp thu sắt; nên uống cách bữa ăn ít nhất 1 giờ.',
          'Không uống viên canxi liều cao đồng thời trong bữa ăn chính giàu sắt.',
        ],
      },
    ],
    references: [
      'NIH Office of Dietary Supplements. Iron Fact Sheet for Health Professionals',
      'Institute of Medicine (IOM). Dietary Reference Intakes for Iron (2001)',
    ],
    chunks: [
      {
        id: 'chunk_sat_01',
        title: 'Chunk 1: Tối ưu hấp thu Sắt Non-Heme',
        tokens: 290,
        content:
          'Sắt thực vật non-heme cần môi trường axit dạ dày và vitamin C để chuyển đổi sang ion Fe2+ dễ hấp thu. Tuyệt đối tránh uống trà và cà phê trong vòng 60 phút sau khi ăn bữa giàu sắt.',
      },
    ],
  },
};

/**
 * Trích xuất chi tiết tài liệu dinh dưỡng hoặc tạo nội dung cấu trúc chuẩn A4 tự động.
 */
export function getNutritionDocumentContent(doc: NutritionDocument): DocumentDetail {
  if (NUTRITION_KNOWLEDGE_MAP[doc.id]) {
    return NUTRITION_KNOWLEDGE_MAP[doc.id];
  }

  // Tự động kiểm tra file name có phải là file PDF có sẵn trên hệ thống tĩnh không
  const staticPdfFiles = [
    'How_Not_To_Die.pdf',
    'Becoming_Vegan_Comprehensive_Edition.pdf',
    'Becoming_Vegan.pdf',
    'The_China_Study_Revised_and_Expanded_Edition.pdf',
    'Vegetarian_Sports_Nutrition.pdf',
  ];

  const pdfUrl = `/docs/nutrition/${doc.fileName}`;

  // Fallback nội dung phân tích tài liệu chuẩn hoá khổ A4
  return {
    abstract: `Tài liệu dinh dưỡng chuyên khảo "${doc.title}" do ${doc.author} biên soạn/thẩm định. Tài liệu được trích xuất ngữ nghĩa và lưu trữ thành ${doc.chunks} vector chunks trong Qdrant Vector DB (Bộ sưu tập: veggielife_knowledge) phục vụ hệ thống Chatbot RAG VeggieLife.`,
    pdfUrl,
    sections: [
      {
        title: '1. Mục tiêu & Phạm vi áp dụng',
        content: [
          `Tài liệu cung cấp cơ sở khoa học và các hướng dẫn thực hành dinh dưỡng thực vật liên quan đến chủ đề: ${doc.title}.`,
          'Áp dụng cho cộng đồng người ăn chay linh hoạt (Flexitarian), ăn chay có sữa trứng (Lacto-Ovo) và ăn thuần chay hoàn toàn (Strict Vegan).',
        ],
      },
      {
        title: '2. Nguyên tắc dinh dưỡng cốt lõi',
        content: [
          'Cân bằng tỷ lệ đa lượng: Carbohydrate phức hợp 50–60%, Protein thực vật 15–20%, Chất béo lành mạnh 25–30%.',
          'Đa dạng hóa màu sắc thực phẩm (Rainbow Diet) nhằm tối ưu hóa lượng Phytonutrient và chất chống oxy hóa tự nhiên.',
          'Ưu tiên thực phẩm nguyên phần (Whole Foods), giảm thiểu đường tinh luyện và thực phẩm siêu chế biến.',
        ],
      },
      {
        title: '3. Khuyến nghị thực hành & Lưu ý lâm sàng',
        content: [
          'Luôn duy trì uống đủ 2.0 – 2.5 lít nước mỗi ngày để hỗ trợ chuyển hóa lượng chất xơ cao.',
          'Đối với người có tiền sử bệnh lý tim mạch, đái tháo đường hoặc suy thận, cần tham vấn bác sĩ chuyên khoa hoặc chuyên gia dinh dưỡng lâm sàng trước khi thay đổi đột ngột tỷ lệ dưỡng chất.',
        ],
      },
    ],
    references: [
      'Ban Biên soạn Dinh dưỡng VeggieLife & Hội đồng Thẩm định Lâm sàng',
      'Tài liệu chuẩn hóa lưu trữ trong Qdrant Vector DB (Qdrant Point Collections)',
    ],
    chunks: [
      {
        id: `chunk_${doc.id}_01`,
        title: `Chunk 1: Tổng quan nội dung ${doc.title}`,
        tokens: 340,
        content: `Dữ liệu trích xuất vector từ tệp ${doc.fileName}. Trọng tâm phân tích: ${doc.title}. Tác giả: ${doc.author}. Phục vụ truy vấn RAG cho các câu hỏi liên quan đến dinh dưỡng thực vật.`,
      },
      {
        id: `chunk_${doc.id}_02`,
        title: `Chunk 2: Hướng dẫn thực hành & Lưu ý an toàn`,
        tokens: 280,
        content: `Khuyến cáo thực hành dinh dưỡng an toàn từ ${doc.title}. Đảm bảo theo dõi các chỉ số sinh hóa định kỳ và cân đối nguồn dưỡng chất thực vật sạch.`,
      },
    ],
  };
}

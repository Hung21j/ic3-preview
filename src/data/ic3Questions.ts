import { QuestionType } from "../types";

export interface IC3Question {
  id: string;
  // levelId xác định cấp độ của câu hỏi:
  // - "level-1": Máy tính cơ bản
  // - "level-2": Các ứng dụng cốt lõi
  // - "level-3": Cuộc sống trực tuyến
  levelId: "level-1" | "level-2" | "level-3";
  
  // subsetId xác định đề thi hoặc chuyên mục cụ thể:
  // - "GM1": Đề GM1
  // - "GM2": Đề GM2
  // - "OT1": Đề OT1
  // - "OT2": Đề OT2
  // - "OT3": Đề OT3
  // - "OT4": Đề OT4
  // - "OT5": Đề OT5
  // (Đề "Tổng hợp FULL" sẽ tự động hiển thị tất cả các câu hỏi của cấp độ đó)
  subsetId: "GM1" | "GM2" | "OT1" | "OT2" | "OT3" | "OT4" | "OT5";
  
  questionNumber?: number;
  type: QuestionType; // "multiple_choice" hoặc "yes_no" hoặc "matching"
  text: string;
  image?: string; // Hình ảnh câu hỏi đề bài minh họa (nếu có)
  options?: string[]; // Danh sách đáp án lựa chọn (cho dạng multiple_choice)

    // Dạng Đúng / Sai nhiều phát biểu
  statements?: {
    text: string;
    correct: "True" | "False";
  }[];
  correctAnswerText?: string; // Hiển thị lời giải / đáp án đúng (tùy chọn)
  correctKeys?: string[]; // Phím đáp án đúng (ví dụ: ["B"] cho trắc nghiệm, ["True"] hoặc ["False"] cho Đúng/Sai)
  pairs?: { 
    left: string; 
    right: string;
    leftImage?: string; // Hình ảnh gắn với vế trái (thuật ngữ/đối tượng)
    rightImage?: string; // Hình ảnh gắn với vế phải (định nghĩa/thẻ kéo thả)
  }[]; // Cấu trúc ghép nối nếu có
  explanation?: string; // Lời giải thích / chú giải
  order?: number; // Thứ tự câu hỏi do Admin thiết lập
  isCustom?: boolean; // Đánh dấu câu hỏi tự tạo
}

/**
 * HƯỚNG DẪN THÊM CÂU HỎI MỚI:
 * -----------------------------------------------------
 * Bạn chỉ cần thêm một đối tượng {} vào mảng IC3_QUESTIONS dưới đây.
 * Đảm bảo điền đầy đủ các trường:
 * - id: "lễ_hội_gì_độc_nhất" (không được trùng lặp)
 * - levelId: "level-1", "level-2" hoặc "level-3"
 * - subsetId: "GM1", "GM2", "OT1", "OT2", "OT3", "OT4", "OT5"
 * - type: "multiple_choice" hoặc "yes_no"
 * - text: "Nội dung câu hỏi..."
 * - options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"] (chỉ cần thiết nếu type là "multiple_choice")
 * - correctAnswerText: "Phần hiển thị đáp án đúng..."
 * - correctKeys: ["Phím đáp án đúng"] (Ví dụ: ["A"] hoặc ["True"])
 * - explanation: "Giải thích lý do lựa chọn đáp án này..."
 * -----------------------------------------------------
 */
export const IC3_QUESTIONS: IC3Question[] = [
  // ==========================================
  // LEVEL 1: MÁY TÍNH CƠ BẢN (level-1)
  // ==========================================
  {
    id: "l1-matching-q1",
    levelId: "level-1",
    subsetId: "GM1",
    questionNumber: 1,
    type: "matching",
    text: "Hãy thực hiện ghép nối hoặc kéo thả các thuật ngữ công nghệ sau đây:",
    pairs: [
      { left: "Open Source", right: "Bất kỳ ai cũng có thể lấy mã nguồn và sửa đổi phần mềm miễn phí" },
      { left: "Boot", right: "Quá trình khởi động một hệ điều hành. Trong quá trình này, hệ điều hành tải tất cả các trình điều khiển phần mềm cho phép các thành phần phần cứng của máy tính giao tiếp với nhau" },
      { left: "Driver", right: "Một chương trình phần mềm nhỏ cho phép hệ điều hành và thiết bị giao tiếp với nhau" },
      { left: "Access Token", right: "Chứa thông tin xác thực bảo mật cho một phiên đăng nhập và xác định người dùng, các nhóm của người dùng và các đặc quyền của người dùng" },
      { left: "Daemon", right: "Bắt đầu thời gian khởi động và chạy như một quy trình nền để hỗ trợ đa nhiệm" }
    ]
  }, 
  // ==========================================
  // LEVEL 3: 
  // ==========================================

  {
    id: "l3-matching-q1",
    levelId: "level-3",
    subsetId: "GM1",
    questionNumber: 1,
    type: "matching",
    text: "Hãy chuyển từng nhu cầu từ danh sách ở bên phải sang thiết bị kỹ thuật số phù hợp ở bên trái:",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 180' width='700' height='180'><rect width='100%25' height='100%25' fill='%23f8fafc' rx='16'/><rect x='10' y='10' width='680' height='160' fill='white' stroke='%23e2e8f0' stroke-width='2' rx='12'/><g transform='translate(60, 30)'><rect x='0' y='0' width='140' height='90' rx='8' fill='%23eef2ff' stroke='%236366f1' stroke-width='2'/><rect x='15' y='12' width='110' height='60' rx='4' fill='%234338ca'/><rect x='50' y='90' width='40' height='20' fill='%236366f1'/><rect x='35' y='110' width='70' height='8' rx='4' fill='%234338ca'/><text x='70' y='48' font-family='sans-serif' font-size='11' font-weight='bold' fill='white' text-anchor='middle'>DESKTOP</text></g><g transform='translate(280, 25)'><rect x='0' y='0' width='130' height='100' rx='10' fill='%23f0fdf4' stroke='%2322c55e' stroke-width='2'/><rect x='10' y='10' width='110' height='75' rx='6' fill='%2315803d'/><circle cx='65' cy='92' r='4' fill='%2322c55e'/><text x='65' y='52' font-family='sans-serif' font-size='11' font-weight='bold' fill='white' text-anchor='middle'>TABLET</text></g><g transform='translate(490, 20)'><rect x='0' y='0' width='80' height='115' rx='12' fill='%23f0f9ff' stroke='%230284c7' stroke-width='2'/><rect x='8' y='10' width='64' height='85' rx='6' fill='%230369a1'/><circle cx='40' cy='104' r='3.5' fill='%230284c7'/><text x='40' y='56' font-family='sans-serif' font-size='10' font-weight='bold' fill='white' text-anchor='middle'>SMARTPHONE</text></g><text x='350' y='155' font-family='sans-serif' font-size='12' font-weight='bold' fill='%2364748b' text-anchor='middle'>Sơ đồ phân loại thiết bị công nghệ số (Digital Devices)</text></svg>",
    pairs: [
      { 
        left: "Desktop Computer", 
        right: "Có khả năng hợp nhất và chỉnh sửa các video lớn cho trang web của khách hàng",
        leftImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='3' width='20' height='14' rx='2'/><line x1='8' y1='21' x2='16' y2='21'/><line x1='12' y1='17' x2='12' y2='21'/></svg>"
      },
      { 
        left: "Smartphone", 
        right: "Có khả năng kiểm tra email, gửi tin nhắn và nhận cuộc gọi thoại mà không cần wifi",
        leftImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='5' y='2' width='14' height='20' rx='2' ry='2'/><line x1='12' y1='18' x2='12.01' y2='18'/></svg>"
      },
      { 
        left: "Tablet", 
        right: "Di động để sử dụng trong lớp học, hỗ trợ ghi chú, truy cập vào đám mây và chạy hầu hết các ứng dụng văn phòng",
        leftImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='4' y='2' width='16' height='20' rx='2' ry='2'/><line x1='12' y1='18' x2='12.01' y2='18'/></svg>"
      }
    ]
  }

];

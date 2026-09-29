import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Clock, 
  Award, 
  HelpCircle, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  GraduationCap, 
  RefreshCw, 
  ShieldCheck, 
  BookOpen, 
  ArrowLeft, 
  School, 
  Check, 
  X,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Layers,
  KeyRound,
  Download,
  Upload,
  Copy,
  CheckCheck,
  Edit3,
  Calendar,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Image as ImageIcon,
  ZoomIn
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, SessionLog, ExamHistoryItem } from "../types";
import { IC3Question, IC3_QUESTIONS } from "../data/ic3Questions";
import { apiService } from "../services/apiService";
import { 
  parseBulkStudentsInput, 
  exportToCsvSheet, 
  ParsedStudentRow 
} from "../utils/sheetExportUtils";
import { compressAndEncodeImage } from "../utils/imageUtils";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { EditQuestionModal } from "./EditQuestionModal";

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchToStudentView: () => void;
  onQuestionsUpdated?: () => void;
}

export default function AdminDashboard({ 
  currentUser, 
  onLogout, 
  onSwitchToStudentView,
  onQuestionsUpdated
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"users" | "sessions" | "history" | "questions">("users");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalStudents: number;
    onlineCount: number;
    totalExamsTaken: number;
    totalCustomQuestions: number;
    schoolsCount: number;
    uniqueSchools: string[];
  }>({
    totalUsers: 0,
    totalStudents: 0,
    onlineCount: 0,
    totalExamsTaken: 0,
    totalCustomQuestions: 0,
    schoolsCount: 0,
    uniqueSchools: []
  });

  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [examHistory, setExamHistory] = useState<ExamHistoryItem[]>([]);
  const [customQuestions, setCustomQuestions] = useState<IC3Question[]>([]);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "student" | "admin">("all");
  
  const [sessionSearch, setSessionSearch] = useState("");
  
  const [historySearch, setHistorySearch] = useState("");
  const [historyLevelFilter, setHistoryLevelFilter] = useState<string>("all");
  const [historyModeFilter, setHistoryModeFilter] = useState<string>("all");
  const [historyClassFilter, setHistoryClassFilter] = useState<string>("all");
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("");

  const [questionSearch, setQuestionSearch] = useState("");
  const [questionLevelFilter, setQuestionLevelFilter] = useState<string>("all");
  const [questionSubsetFilter, setQuestionSubsetFilter] = useState<string>("all");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("all");

  // Question editing modal state
  const [editingQuestion, setEditingQuestion] = useState<IC3Question | null>(null);

  // Admin personal change password modal state
  const [showAdminChangePassword, setShowAdminChangePassword] = useState(false);

  // Modal: Add User
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [newRole, setNewRole] = useState<"student" | "admin">("student");

  // Modal: Bulk Add Users from Sheet
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkDefaultClass, setBulkDefaultClass] = useState("");
  const [bulkDefaultSchool, setBulkDefaultSchool] = useState("");
  const [bulkPreview, setBulkPreview] = useState<ParsedStudentRow[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Modal: Change Password
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("123");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Add Question Form State
  const [qLevelId, setQLevelId] = useState<"level-1" | "level-2" | "level-3">("level-1");
  const [qSubsetId, setQSubsetId] = useState<"GM1" | "GM2" | "OT1" | "OT2" | "OT3" | "OT4" | "OT5">("GM1");
  const [qType, setQType] = useState<"multiple_choice" | "yes_no" | "matching">("multiple_choice");
  const [qText, setQText] = useState("");
  const [qImage, setQImage] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [qOrder, setQOrder] = useState<number | "">("");
  const [orderInputMap, setOrderInputMap] = useState<Record<string, number | "">>({});
  // MC Subtype & Dynamic Options
  const [mcSubtype, setMcSubtype] = useState<"single" | "multiple">("single");
  const [mcOptions, setMcOptions] = useState<string[]>(["", "", "", ""]);
  const [mcCorrectKeys, setMcCorrectKeys] = useState<string[]>(["A"]);
  //const [correctKey, setCorrectKey] = useState("True"); // for Yes/No
  const [yesNoStatements, setYesNoStatements] = useState<
    { text: string; correct: "True" | "False" }[]
  >([
    { text: "", correct: "True" },
    { text: "", correct: "False" },
    { text: "", correct: "True" }
  ]);
  const [correctAnswerNote, setCorrectAnswerNote] = useState("");
  const [matchingPairs, setMatchingPairs] = useState<Array<{
    left: string;
    right: string;
    leftImage?: string;
    rightImage?: string;
  }>>([
    { left: "", right: "", leftImage: "", rightImage: "" },
    { left: "", right: "", leftImage: "", rightImage: "" },
    { left: "", right: "", leftImage: "", rightImage: "" }
  ]);

  const updateMcOption = (index: number, value: string) => {
    setMcOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const updateYesNoStatement = (
    index: number,
    field: "text" | "correct",
    value: string
  ) => {
    setYesNoStatements((prev) => {
      const copy = [...prev];

      if (field === "text") {
        copy[index] = {
          ...copy[index],
          text: value
        };
      } else {
        copy[index] = {
          ...copy[index],
          correct: value as "True" | "False"
        };
      }

      return copy;
    });
  };

  const addYesNoStatement = () => {
    if (yesNoStatements.length >= 10) {
      alert("Tối đa 10 phát biểu cho một câu hỏi.");
      return;
    }

    setYesNoStatements((prev) => [
      ...prev,
      {
        text: "",
        correct: "True"
      }
    ]);
  };

  const removeYesNoStatement = (index: number) => {
    if (yesNoStatements.length <= 2) {
      alert("Cần tối thiểu 2 phát biểu.");
      return;
    }

    setYesNoStatements((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const addMcOption = () => {
    if (mcOptions.length >= 10) {
      alert("Tối đa 10 phương án lựa chọn cho câu hỏi trắc nghiệm.");
      return;
    }
    setMcOptions((prev) => [...prev, ""]);
  };

  const removeMcOption = (index: number) => {
    if (mcOptions.length <= 2) {
      alert("Câu hỏi trắc nghiệm cần tối thiểu 2 phương án lựa chọn.");
      return;
    }
    const removedLetter = String.fromCharCode(65 + index);
    setMcOptions((prev) => prev.filter((_, i) => i !== index));
    setMcCorrectKeys((prev) => {
      const filtered = prev.filter((k) => k !== removedLetter);
      return filtered.length > 0 ? filtered : ["A"];
    });
  };

  const toggleMcCorrectKey = (key: string) => {
    if (mcSubtype === "single") {
      setMcCorrectKeys([key]);
    } else {
      setMcCorrectKeys((prev) => {
        if (prev.includes(key)) {
          if (prev.length <= 1) {
            alert("Phải có ít nhất 1 đáp án đúng được chọn.");
            return prev;
          }
          return prev.filter((k) => k !== key);
        } else {
          return [...prev, key].sort();
        }
      });
    }
  };

  const updateMatchingPair = (index: number, field: "left" | "right", value: string) => {
    setMatchingPairs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressAndEncodeImage(e.target.files[0]);
        setQImage(base64);
      } catch (err: any) {
        alert(err?.message || "Lỗi tải ảnh.");
      }
    }
  };

  const handlePairImageUpload = async (
    index: number,
    side: "leftImage" | "rightImage",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressAndEncodeImage(e.target.files[0]);
        setMatchingPairs((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], [side]: base64 };
          return copy;
        });
      } catch (err: any) {
        alert(err?.message || "Lỗi tải ảnh.");
      }
    }
  };

  const removeMatchingPairImage = (index: number, side: "leftImage" | "rightImage") => {
    setMatchingPairs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [side]: "" };
      return copy;
    });
  };

  const addMatchingPair = () => {
    if (matchingPairs.length >= 8) {
      alert("Tối đa 8 cặp ghép nối cho mỗi câu hỏi.");
      return;
    }
    setMatchingPairs((prev) => [...prev, { left: "", right: "", leftImage: "", rightImage: "" }]);
  };

  const removeMatchingPair = (index: number) => {
    if (matchingPairs.length <= 2) {
      alert("Câu hỏi ghép nối cần tối thiểu 2 cặp đối tượng.");
      return;
    }
    setMatchingPairs((prev) => prev.filter((_, i) => i !== index));
  };


  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, sessionsData, historyData, questionsData] = await Promise.all([
        apiService.getUsersAndStats().catch(() => ({ users: [], stats: { totalUsers: 0, totalStudents: 0, onlineCount: 0, totalExamsTaken: 0, totalCustomQuestions: 0, schoolsCount: 0, uniqueSchools: [] } })),
        apiService.getSessionLogs().catch(() => []),
        apiService.getExamHistory().catch(() => []),
        apiService.getCustomQuestions().catch(() => [])
      ]);

      setUsers(usersData.users);
      setStats(usersData.stats);
      setSessionLogs(sessionsData);
      setExamHistory(historyData);
      setCustomQuestions(questionsData);
    } catch (err: any) {
      setError(err.message || "Lỗi tải dữ liệu bảng điều khiển.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const notify = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Add User Handler
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword || !newName.trim()) {
      alert("Vui lòng nhập đầy đủ họ tên, tên đăng nhập và mật khẩu.");
      return;
    }

    try {
      await apiService.createUser({
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        name: newName.trim(),
        className: newClass.trim(),
        school: newSchool.trim(),
        role: newRole
      });
      notify("Đã thêm tài khoản mới thành công!");
      setShowAddUserModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewClass("");
      setNewSchool("");
      setNewRole("student");
      loadData();
    } catch (err: any) {
      alert(err.message || "Lỗi tạo tài khoản.");
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (user: User) => {
    if (user.username === "admin") {
      alert("Không thể xóa tài khoản Quản trị viên tối cao (admin).");
      return;
    }
    const ok = window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.name}" (@${user.username})?`);
    if (!ok) return;

    try {
      await apiService.deleteUser(user.id);
      notify(`Đã xóa tài khoản "${user.name}".`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Lỗi xóa người dùng.");
    }
  };

  // Change User Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordUser) return;
    if (!newPasswordInput.trim()) {
      alert("Vui lòng nhập mật khẩu mới.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiService.updateUserPassword(changePasswordUser.id, newPasswordInput.trim());
      notify(`Đã cập nhật mật khẩu cho học sinh "${changePasswordUser.name}" (@${changePasswordUser.username}) thành công!`);
      setChangePasswordUser(null);
      setNewPasswordInput("123");
    } catch (err: any) {
      alert(err.message || "Lỗi đổi mật khẩu.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleForceLogout = async (user: User) => {
    if (user.id === currentUser.id) {
      alert("Bạn đang đăng nhập bằng tài khoản này.");
      return;
    }
  
    if (!user.isOnline) {
      alert(`Tài khoản "${user.name}" hiện không online.`);
      return;
    }
  
    const ok = window.confirm(
      `Bạn có chắc muốn đăng xuất tài khoản "${user.name}" (@${user.username}) khỏi tất cả thiết bị?`
    );
  
    if (!ok) return;
  
    try {
      await apiService.forceLogoutUser(user.id);
  
      notify(
        `Đã đăng xuất tài khoản "${user.name}" khỏi hệ thống.`
      );
  
      loadData();
    } catch (err: any) {
      alert(err.message || "Không thể đăng xuất tài khoản.");
    }
  };

  // Bulk Input Parsing
  const handleBulkTextChange = (text: string, defClass = bulkDefaultClass, defSchool = bulkDefaultSchool) => {
    setBulkRawText(text);
    const existing = new Set<string>(users.map((u) => u.username.toLowerCase()));
    const parsed = parseBulkStudentsInput(text, defClass, defSchool, existing);
    setBulkPreview(parsed);
  };

  // Submit Bulk Creation
  const handleCreateBulkUsers = async () => {
    if (bulkPreview.length === 0) {
      alert("Không có học sinh nào trong danh sách.");
      return;
    }

    setIsProcessingBulk(true);
    try {
      const payload = bulkPreview.map((p) => ({
        name: p.name,
        username: p.username,
        password: p.password || "123",
        className: p.className,
        school: p.school
      }));

      const res = await apiService.createBulkUsers(payload);
      notify(`Đã thêm thành công ${res.createdCount} tài khoản học sinh!`);
      setShowBulkModal(false);
      setBulkRawText("");
      setBulkPreview([]);
      loadData();
    } catch (err: any) {
      alert(err.message || "Lỗi tạo danh sách học sinh.");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Export User Account Credentials to CSV / Sheet
  const handleExportUserAccounts = () => {
    if (users.length === 0) {
      alert("Chưa có tài khoản nào để xuất.");
      return;
    }

    const headers = [
      "STT",
      "Họ và tên",
      "Tên đăng nhập (Username)",
      "Mật khẩu mặc định",
      "Lớp",
      "Trường học",
      "Vai trò",
      "Trạng thái",
      "Đăng nhập cuối"
    ];

    const rows = filteredUsers.map((u, idx) => [
      idx + 1,
      u.name,
      u.username,
      "123",
      u.className || "",
      u.school || "",
      u.role === "admin" ? "Quản trị viên" : "Học sinh",
      u.isOnline ? "Online" : "Offline",
      formatTime(u.lastLogin)
    ]);

    const filename = `Danh_Sach_Tai_Khoan_IC3_${new Date().toISOString().slice(0, 10)}`;
    exportToCsvSheet(filename, headers, rows);
  };

  // Export Exam Scores to CSV / Sheet (1 correct answer = 1 point)
  const handleExportScoresToSheet = () => {
    if (filteredHistory.length === 0) {
      alert("Không có dữ liệu bài thi nào để xuất.");
      return;
    }

    const headers = [
      "STT",
      "Họ và tên học sinh",
      "Tên đăng nhập (Username)",
      "Lớp",
      "Trường học",
      "Phân môn",
      "Bộ đề (Subset)",
      "Chế độ thi",
      "Điểm đạt được (Mỗi câu đúng = 1 điểm)",
      "Tổng số câu hỏi",
      "Tỷ lệ hoàn thành (%)",
      "Kết quả đánh giá",
      "Thời gian làm bài",
      "Ngày giờ nộp bài"
    ];

    const rows = filteredHistory.map((h, idx) => {
      // Rule: Mỗi câu đúng = 1 điểm
      const earnedPoints = h.correctCount;
      const totalPoints = h.totalCount;
      const passText = h.scorePercent >= 70 ? "ĐẠT (Passed)" : "CHƯA ĐẠT";
      const modeText = h.mode === "testing" ? "Thi thử (Testing)" : "Luyện tập (Training)";

      return [
        idx + 1,
        h.studentName,
        h.username,
        h.className || "",
        h.school || "",
        h.level,
        `Đề ${h.subset}`,
        modeText,
        earnedPoints,
        totalPoints,
        `${h.scorePercent}%`,
        passText,
        formatDuration(h.timeTaken),
        formatTime(h.timestamp)
      ];
    });

    const filename = `Bang_Diem_IC3_${new Date().toISOString().slice(0, 10)}`;
    exportToCsvSheet(filename, headers, rows);
  };

  // Add Custom Question Handler
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) {
      alert("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    let options: string[] | undefined = undefined;
    let finalCorrectKeys: string[] | undefined = undefined;
    let pairs: { left: string; right: string }[] | undefined = undefined;

    let statements:
    | { text: string; correct: "True" | "False" }[]
    | undefined = undefined;

    if (qType === "multiple_choice") {
      const trimmedOptions = mcOptions.map((o) => o.trim());
      if (trimmedOptions.some((o) => !o)) {
        alert("Vui lòng nhập đầy đủ nội dung cho tất cả các phương án lựa chọn.");
        return;
      }
      if (mcCorrectKeys.length === 0) {
        alert("Vui lòng chọn ít nhất 1 đáp án đúng cho câu hỏi.");
        return;
      }
      options = trimmedOptions.map((optText, idx) => `${String.fromCharCode(65 + idx)}. ${optText}`);
      finalCorrectKeys = [...mcCorrectKeys].sort();
    } else if (qType === "yes_no") {
        const validStatements = yesNoStatements
          .map((statement) => ({
            text: statement.text.trim(),
            correct: statement.correct
          }))
          .filter((statement) => statement.text);

        if (validStatements.length < 2) {
          alert("Vui lòng nhập ít nhất 2 phát biểu.");
          return;
        }

        statements = validStatements;

        // Không còn dùng correctKeys cho dạng mới
        finalCorrectKeys = undefined;
    } else if (qType === "matching") {
      const validPairs = matchingPairs
        .map((p) => ({ 
          left: p.left.trim(), 
          right: p.right.trim(),
          leftImage: p.leftImage?.trim() || undefined,
          rightImage: p.rightImage?.trim() || undefined
        }))
        .filter((p) => p.left && p.right);

      if (validPairs.length < 2) {
        alert("Vui lòng nhập đầy đủ ít nhất 2 cặp ghép nối hợp lệ (cả Cột trái và Cột phải).");
        return;
      }
      pairs = validPairs;
      finalCorrectKeys = undefined;
    }

    let defaultAnswerText = "";
    if (qType === "multiple_choice" && options && finalCorrectKeys) {
      if (finalCorrectKeys.length === 1) {
        defaultAnswerText = options.find((o) => o.startsWith(finalCorrectKeys![0])) || finalCorrectKeys[0];
      } else {
        defaultAnswerText = options.filter((o) => finalCorrectKeys!.includes(o.charAt(0))).join(" | ");
      }
    } else if (qType === "yes_no" && statements) {
      defaultAnswerText = statements
        .map(
          (statement, index) =>
            `${index + 1}. ${
              statement.correct === "True"
                ? "Đúng"
                : "Sai"
            }`
        )
        .join("\n");      
    } else if (qType === "matching" && pairs) {
      defaultAnswerText = pairs.map((p) => `• ${p.left} ➔ ${p.right}`).join("\n");
    }

    try {
      await apiService.addCustomQuestion({
        levelId: qLevelId,
        subsetId: qSubsetId,
        type: qType,
        text: qText.trim(),
        image: qImage.trim() || undefined,
        options,
        correctAnswerText: correctAnswerNote.trim() || defaultAnswerText,
        correctKeys: finalCorrectKeys,
        statements,
        pairs,
        order: typeof qOrder === "number" ? qOrder : undefined,
        createdBy: currentUser.username
      });

      notify("Đã thêm câu hỏi mới vào ngân hàng đề thi thành công!");
      setQText("");
      setQImage("");
      setQOrder("");
      setMcOptions(["", "", "", ""]);
      setMcCorrectKeys(["A"]);
      setCorrectAnswerNote("");
      setYesNoStatements([
        { text: "", correct: "True" },
        { text: "", correct: "False" },
        { text: "", correct: "True" }
      ]);
      if (qType === "matching") {
        setMatchingPairs([
          { left: "", right: "", leftImage: "", rightImage: "" },
          { left: "", right: "", leftImage: "", rightImage: "" },
          { left: "", right: "", leftImage: "", rightImage: "" }
        ]);
      }
      loadData();
      onQuestionsUpdated?.();
    } catch (err: any) {
      alert(err.message || "Lỗi thêm câu hỏi.");
    }
  };

  // Delete Custom Question
  const handleDeleteQuestion = async (qId: string) => {
    const ok = window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng đề?");
    if (!ok) return;

    try {
      await apiService.deleteCustomQuestion(qId);
      notify("Đã xóa câu hỏi khỏi ngân hàng.");
      loadData();
      onQuestionsUpdated?.();
    } catch (err: any) {
      alert(err.message || "Lỗi xóa câu hỏi.");
    }
  };

  // Quick update question order
  const handleUpdateQuestionOrder = async (question: any, newOrder: number) => {
    const validOrder = Math.max(1, Math.round(newOrder) || 1);
    try {
      await apiService.updateQuestionOrder(question, validOrder);
      notify(`Đã cập nhật STT câu hỏi thành: ${validOrder}`);
      loadData();
      onQuestionsUpdated?.();
    } catch (err: any) {
      alert("Lỗi cập nhật số thứ tự: " + (err?.message || err));
    }
  };

  // Move question up or down within its current list
  const handleMoveQuestionOrder = async (question: any, direction: "up" | "down", currentIdx: number, list: any[]) => {
    const targetIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const targetQuestion = list[targetIdx];
    // Hoán đổi nếu cùng level và subset
    if (targetQuestion.levelId !== question.levelId || targetQuestion.subsetId !== question.subsetId) {
      return;
    }

    const currentOrder = typeof question.order === "number" ? question.order : (currentIdx + 1);
    const targetOrder = typeof targetQuestion.order === "number" ? targetQuestion.order : (targetIdx + 1);

    let nextCurrentOrder = targetOrder;
    let nextTargetOrder = currentOrder;

    if (nextCurrentOrder === nextTargetOrder) {
      if (direction === "up") {
        nextCurrentOrder = Math.max(1, currentOrder - 1);
      } else {
        nextCurrentOrder = currentOrder + 1;
      }
    }

    try {
      await apiService.updateQuestionOrder(question, nextCurrentOrder);
      await apiService.updateQuestionOrder(targetQuestion, nextTargetOrder);
      notify(`Đã đổi vị trí câu hỏi thành công!`);
      loadData();
      onQuestionsUpdated?.();
    } catch (err: any) {
      alert("Lỗi đổi vị trí: " + (err?.message || err));
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const matchSearch = (u.name + u.username + u.className + u.school)
      .toLowerCase()
      .includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const filteredSessions = sessionLogs.filter(s => {
    return (s.name + s.username + s.className + s.school)
      .toLowerCase()
      .includes(sessionSearch.toLowerCase());
  });

  // Dynamic list of unique classes for filtering
  const availableClasses = React.useMemo(() => {
    const set = new Set<string>();
    examHistory.forEach((h) => {
      if (h.className && h.className.trim()) set.add(h.className.trim());
    });
    users.forEach((u) => {
      if (u.className && u.className.trim()) set.add(u.className.trim());
    });
    return Array.from(set).sort();
  }, [examHistory, users]);

  const filteredHistory = examHistory.filter(h => {
    const matchSearch = (
      (h.studentName || "") + 
      (h.username || "") + 
      (h.className || "") + 
      (h.school || "") + 
      (h.subset || "")
    ).toLowerCase().includes(historySearch.toLowerCase());
    
    const matchLevel = historyLevelFilter === "all" || h.level.includes(historyLevelFilter);
    const matchMode = historyModeFilter === "all" || h.mode === historyModeFilter;
    
    // Class filter (check exact class match, case-insensitive)
    const matchClass = historyClassFilter === "all" || 
      (h.className && h.className.trim().toLowerCase() === historyClassFilter.toLowerCase());
    
    // Date filter (ISO string starts with YYYY-MM-DD)
    const matchDate = !historyDateFilter || (h.timestamp && h.timestamp.startsWith(historyDateFilter));

    return matchSearch && matchLevel && matchMode && matchClass && matchDate;
  });

  // Combined questions list (Base + Custom)
  const customIds = new Set(customQuestions.map(q => q.id));
  const allMergedQuestions = [
    ...customQuestions.map(q => ({ ...q, isCustom: true })),
    ...IC3_QUESTIONS.filter(q => !customIds.has(q.id)).map(q => ({ ...q, isCustom: false }))
  ];

  const filteredQuestions = allMergedQuestions.filter(q => {
    const matchSearch = q.text.toLowerCase().includes(questionSearch.toLowerCase());
    const matchLevel = questionLevelFilter === "all" || q.levelId === questionLevelFilter;
    const matchSubset = questionSubsetFilter === "all" || q.subsetId === questionSubsetFilter;
    let matchType = true;
    if (questionTypeFilter === "all") {
      matchType = true;
    } else if (questionTypeFilter === "multiple_choice") {
      matchType = q.type === "multiple_choice";
    } else if (questionTypeFilter === "mc_single") {
      matchType = q.type === "multiple_choice" && (!q.correctKeys || q.correctKeys.length <= 1);
    } else if (questionTypeFilter === "mc_multi") {
      matchType = q.type === "multiple_choice" && !!(q.correctKeys && q.correctKeys.length > 1);
    } else {
      matchType = q.type === questionTypeFilter;
    }
    return matchSearch && matchLevel && matchSubset && matchType;
  }).sort((a, b) => {
    // Sắp xếp câu hỏi theo Level, Subset, và theo Order
    if (a.levelId !== b.levelId) return a.levelId.localeCompare(b.levelId);
    if (a.subsetId !== b.subsetId) return a.subsetId.localeCompare(b.subsetId);
    const orderA = typeof a.order === "number" ? a.order : 999999;
    const orderB = typeof b.order === "number" ? b.order : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return a.text.localeCompare(b.text);
  });

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} giây`;
    return `${mins} phút ${secs > 0 ? `${secs}s` : ""}`;
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#eaedf2] flex flex-col font-sans text-slate-900 select-none border-4 md:border-8 border-slate-300">
      
      {/* 🚀 Admin Header Bar */}
      <header className="h-16 bg-[#f7f9fc] border-b border-slate-300 px-4 md:px-8 flex items-center justify-between shadow-xs z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-slate-900 uppercase font-mono leading-none">
              TRUNG TÂM QUẢN TRỊ IC3
            </h1>
            <p className="text-xs text-slate-600 font-mono mt-1 font-medium">
              Quyền hạn Quản trị viên: <span className="font-bold text-amber-700">{currentUser.name}</span> (@{currentUser.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/80 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-mono font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Cloud Firestore: Đã đồng bộ</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdminChangePassword(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#edf2f7] border border-slate-300 text-slate-800 hover:bg-[#e2e8f0] rounded-xl text-xs md:text-sm font-bold font-mono transition active:scale-95 cursor-pointer shadow-xs"
            title="Đổi mật khẩu tài khoản quản trị viên của bạn"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Đổi mật khẩu</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToStudentView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold font-mono transition active:scale-95 shadow-sm cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vào giao diện</span> Làm bài thi
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 rounded-lg text-xs font-bold font-mono transition active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white py-2 px-4 text-center text-xs font-bold font-mono shadow-md flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="max-w-7xl mx-auto w-full space-y-6">

          {/* 📊 Stat Cards Overview (Watch Quantity & Metrics) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            
            {/* Card 1: Total Users */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">Tổng tài khoản</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-800">
                {stats.totalUsers}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {stats.totalStudents} học sinh • {stats.totalUsers - stats.totalStudents} admin
              </div>
            </div>

            {/* Card 2: Active Online */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">Đang trực tuyến</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                {stats.onlineCount}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Phiên làm việc đang mở
              </div>
            </div>

            {/* Card 3: Total Exams Completed */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">Lượt làm bài</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-800">
                {stats.totalExamsTaken}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Bài kiểm tra đã nộp điểm
              </div>
            </div>

            {/* Card 4: Registered Schools */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">Trường học</span>
                <School className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-800">
                {stats.schoolsCount}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Đơn vị trường tham gia
              </div>
            </div>

            {/* Card 5: Custom Questions */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">Câu hỏi tự tạo</span>
                <HelpCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-650">
                {customQuestions.length}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Tổng ngân hàng: {allMergedQuestions.length} câu
              </div>
            </div>

          </div>

          {/* 🎛️ Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`py-3.5 px-3 text-xs font-bold font-mono border-b-2 transition flex items-center gap-2 shrink-0 ${
                  activeTab === "users"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>QUẢN LÝ NGƯỜI DÙNG</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
                  {users.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                className={`py-3.5 px-3 text-xs font-bold font-mono border-b-2 transition flex items-center gap-2 shrink-0 ${
                  activeTab === "sessions"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>NHẬT KÝ ĐĂNG NHẬP / RA</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {sessionLogs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`py-3.5 px-3 text-xs font-bold font-mono border-b-2 transition flex items-center gap-2 shrink-0 ${
                  activeTab === "history"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>LỊCH SỬ LÀM BÀI</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {examHistory.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`py-3.5 px-3 text-xs font-bold font-mono border-b-2 transition flex items-center gap-2 shrink-0 ${
                  activeTab === "questions"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>THÊM & QUẢN LÝ CÂU HỎI</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-extrabold">
                  +{customQuestions.length} mới
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              title="Làm mới dữ liệu"
              className="p-2 text-slate-400 hover:text-indigo-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* TAB 1: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Tìm theo tên, username, lớp, trường..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  
                  <select
                    value={userRoleFilter}
                    onChange={(e: any) => setUserRoleFilter(e.target.value)}
                    className="py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="student">Học sinh</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportUserAccounts}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Xuất danh sách tài khoản học sinh ra file Sheet / Excel"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Xuất Sheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(true);
                      handleBulkTextChange(bulkRawText);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Tạo nhanh tài khoản từ danh sách học sinh (Google Sheets / Excel)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Thêm từ danh sách Sheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Thêm tài khoản mới</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase font-mono text-slate-500 border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Học sinh / Tên đăng nhập</th>
                      <th className="py-2.5 px-3">Lớp</th>
                      <th className="py-2.5 px-3">Trường học</th>
                      <th className="py-2.5 px-3">Vai trò</th>
                      <th className="py-2.5 px-3">Lần đăng nhập cuối</th>
                      <th className="py-2.5 px-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                          Không tìm thấy người dùng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${u.isOnline ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-300"}`} />
                              <span className="text-[10px] font-mono text-slate-500">
                                {u.isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{u.name}</div>
                            <div className="text-[10px] font-mono text-indigo-600">@{u.username}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {u.className || "—"}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {u.school || "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                              u.role === "admin"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-150"
                            }`}>
                              {u.role === "admin" ? "Admin" : "Học sinh"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-mono text-slate-500">
                            {formatTime(u.lastLogin)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Đổi mật khẩu */}
                              <button
                                type="button"
                                onClick={() => {
                                  setChangePasswordUser(u);
                                  setNewPasswordInput("123");
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition active:scale-95"
                                title="Đổi mật khẩu tài khoản"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                               {/* Đăng xuất */}
                              {u.id !== currentUser.id && u.isOnline && (
                                <button
                                  type="button"
                                  onClick={() => handleForceLogout(u)}
                                  className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition active:scale-95"
                                  title="Đăng xuất tài khoản này"
                                >
                                  <LogOut className="w-4 h-4" />
                                </button>
                              )}
                              
                              {/* Xóa */}
                              {u.username !== "admin" ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition active:scale-95"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono px-1">Bảo vệ</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: LOGIN - LOGOUT SESSIONS */}
          {activeTab === "sessions" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    placeholder="Tìm theo tên học sinh, username, trường..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Tổng số: <strong className="text-slate-800">{filteredSessions.length}</strong> phiên
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase font-mono text-slate-500 border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Người dùng</th>
                      <th className="py-2.5 px-3">Lớp & Trường</th>
                      <th className="py-2.5 px-3">Thời gian Đăng nhập</th>
                      <th className="py-2.5 px-3">Thời gian Đăng xuất</th>
                      <th className="py-2.5 px-3">Thời lượng phiên</th>
                      <th className="py-2.5 px-3">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                          Chưa ghi nhận lịch sử đăng nhập/đăng xuất nào.
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((s) => {
                        const isActive = !s.logoutTime;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{s.name}</div>
                              <div className="text-[10px] font-mono text-indigo-600">@{s.username}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-700">{s.className || "—"}</div>
                              <div className="text-[10px] text-slate-500">{s.school || "—"}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                              {formatTime(s.loginTime)}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                              {s.logoutTime ? formatTime(s.logoutTime) : (
                                <span className="text-emerald-600 font-bold">Chưa đăng xuất</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {formatDuration(s.durationSeconds)}
                            </td>
                            <td className="py-3 px-3">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Đang hoạt động
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  Đã kết thúc
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EXAM DOING HISTORY */}
          {activeTab === "history" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 space-y-4">
              
              <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Tìm theo tên học sinh, username, lớp, đề..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1. Filter by Class */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={historyClassFilter}
                        onChange={(e) => setHistoryClassFilter(e.target.value)}
                        className="py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        title="Lọc theo Lớp học"
                      >
                        <option value="all">Tất cả Lớp ({availableClasses.length})</option>
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            Lớp {cls}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Filter by Date */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="date"
                        value={historyDateFilter}
                        onChange={(e) => setHistoryDateFilter(e.target.value)}
                        className="bg-transparent text-xs font-mono font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        title="Lọc kết quả theo ngày nộp bài"
                      />
                      {historyDateFilter && (
                        <button
                          type="button"
                          onClick={() => setHistoryDateFilter("")}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                          title="Bỏ lọc theo ngày"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* 3. Filter by Level */}
                    <select
                      value={historyLevelFilter}
                      onChange={(e) => setHistoryLevelFilter(e.target.value)}
                      className="py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả cấp độ</option>
                      <option value="Level 1">Level 1</option>
                      <option value="Level 2">Level 2</option>
                      <option value="Level 3">Level 3</option>
                    </select>

                    {/* 4. Filter by Mode */}
                    <select
                      value={historyModeFilter}
                      onChange={(e) => setHistoryModeFilter(e.target.value)}
                      className="py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả chế độ</option>
                      <option value="testing">Thi thử (Testing)</option>
                      <option value="training">Luyện tập (Training)</option>
                    </select>

                    {/* Export Button */}
                    <button
                      type="button"
                      onClick={handleExportScoresToSheet}
                      className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
                      title="Xuất bảng điểm ra file Google Sheets / Excel CSV (1 câu đúng = 1 điểm)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Xuất điểm Sheet</span>
                    </button>
                  </div>
                </div>

                {/* Filter Status Summary & Reset */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span>
                      Hiển thị <strong className="text-slate-800 dark:text-slate-100 font-bold">{filteredHistory.length}</strong> / {examHistory.length} kết quả
                    </span>
                    {(historyClassFilter !== "all" || historyDateFilter || historyLevelFilter !== "all" || historyModeFilter !== "all" || historySearch) && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                        Đang lọc
                      </span>
                    )}
                  </div>

                  {(historyClassFilter !== "all" || historyDateFilter || historyLevelFilter !== "all" || historyModeFilter !== "all" || historySearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySearch("");
                        setHistoryClassFilter("all");
                        setHistoryDateFilter("");
                        setHistoryLevelFilter("all");
                        setHistoryModeFilter("all");
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase font-mono text-slate-500 border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Học sinh</th>
                      <th className="py-2.5 px-3">Lớp & Trường</th>
                      <th className="py-2.5 px-3">Phân môn & Đề</th>
                      <th className="py-2.5 px-3">Chế độ</th>
                      <th className="py-2.5 px-3">Kết quả & Điểm số (1đ/câu)</th>
                      <th className="py-2.5 px-3">Thời gian làm</th>
                      <th className="py-2.5 px-3">Ngày giờ nộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                          Chưa có bản ghi kết quả bài thi nào.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => {
                        const isPass = h.scorePercent >= 70;
                        return (
                          <tr key={h.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{h.studentName}</div>
                              <div className="text-[10px] font-mono text-indigo-600">@{h.username}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-700">{h.className || "—"}</div>
                              <div className="text-[10px] text-slate-500">{h.school || "—"}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800 text-xs">{h.level}</div>
                              <span className="inline-block text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mt-0.5">
                                Đề {h.subset}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                                h.mode === "testing"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}>
                                {h.mode === "testing" ? "Thi thử" : "Luyện tập"}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-base font-black font-mono ${isPass ? "text-emerald-600" : "text-rose-600"}`}>
                                  {h.correctCount}/{h.totalCount} đ
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-500">
                                  ({h.scorePercent}%)
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {formatDuration(h.timeTaken)}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {formatTime(h.timestamp)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 4: ADD & MANAGE QUESTIONS */}
          {activeTab === "questions" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form: Add New Question (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-sm font-bold uppercase font-mono text-slate-800">
                      Thêm câu hỏi mới
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Admin Tool
                  </span>
                </div>

                <form onSubmit={handleAddQuestion} className="space-y-3.5 text-xs">
                  
                  {/* Select Level & Subset & Order */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                        Cấp độ IC3
                      </label>
                      <select
                        value={qLevelId}
                        onChange={(e: any) => setQLevelId(e.target.value)}
                        className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="level-1">Level 1: Máy tính cơ bản</option>
                        <option value="level-2">Level 2: Các ứng dụng cốt lõi</option>
                        <option value="level-3">Level 3: Cuộc sống trực tuyến</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                        Chọn Đề thi
                      </label>
                      <select
                        value={qSubsetId}
                        onChange={(e: any) => setQSubsetId(e.target.value)}
                        className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="GM1">Đề GM1</option>
                        <option value="GM2">Đề GM2</option>
                        <option value="OT1">Đề OT1</option>
                        <option value="OT2">Đề OT2</option>
                        <option value="OT3">Đề OT3</option>
                        <option value="OT4">Đề OT4</option>
                        <option value="OT5">Đề OT5</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                        Số thứ tự (STT)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Tùy chọn (VD: 1, 2...)"
                        value={qOrder}
                        onChange={(e) => setQOrder(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                        className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Question Type */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                      Loại câu hỏi
                    </label>
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <button
                        type="button"
                        onClick={() => setQType("multiple_choice")}
                        className={`py-2 px-2 rounded-lg border text-center font-bold text-xs transition ${
                          qType === "multiple_choice"
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Trắc nghiệm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQType("yes_no");
                          //setCorrectKey("True");
                        }}
                        className={`py-2 px-2 rounded-lg border text-center font-bold text-xs transition ${
                          qType === "yes_no"
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Đúng / Sai
                      </button>
                      <button
                        type="button"
                        onClick={() => setQType("matching")}
                        className={`py-2 px-2 rounded-lg border text-center font-bold text-xs transition ${
                          qType === "matching"
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Ghép nối (Matching)
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                        Nội dung câu hỏi
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      required
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder={
                        qType === "matching"
                          ? "VD: Hãy chuyển từng nhu cầu từ danh sách ở bên phải sang thiết bị kỹ thuật số ở bên trái..."
                          : "Nhập nội dung câu hỏi IC3 cần thêm..."
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>

                  {/* Question Image (Optional) */}
                  <div className="space-y-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold uppercase font-mono text-slate-600 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Hình ảnh câu hỏi / đề bài (tùy chọn)</span>
                      </label>
                      {qImage && (
                        <button
                          type="button"
                          onClick={() => setQImage("")}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa ảnh</span>
                        </button>
                      )}
                    </div>

                    {qImage ? (
                      <div className="relative group max-w-xs rounded-lg overflow-hidden border border-slate-200 bg-white p-1">
                        <img
                          src={qImage}
                          alt="Ảnh đề bài"
                          className="max-h-36 w-auto rounded object-contain mx-auto cursor-pointer"
                          onClick={() => setPreviewImage(qImage)}
                        />
                        <div className="text-[9px] text-center text-slate-500 mt-1 font-mono">
                          Bấm vào ảnh để xem kích thước lớn
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition">
                          <Upload className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Tải ảnh từ máy tính...</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleMainImageUpload}
                          />
                        </label>
                        <input
                          type="text"
                          value={qImage}
                          onChange={(e) => setQImage(e.target.value)}
                          placeholder="Hoặc dán URL ảnh..."
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Matching Pairs Builder */}
                  {qType === "matching" && (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase font-mono text-slate-600">
                            Các cặp ghép nối (Cột trái ➔ Cột phải)
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            Có thể chèn ảnh cho thuật ngữ và/hoặc định nghĩa kéo thả
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {matchingPairs.map((pair, pIdx) => (
                          <div 
                            key={pIdx} 
                            className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                                Cặp #{pIdx + 1}
                              </span>
                              {matchingPairs.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeMatchingPair(pIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition text-xs flex items-center gap-1 cursor-pointer"
                                  title="Xóa cặp này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-mono">Xóa</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Left item */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold">
                                    Thuật ngữ (Vế trái)
                                  </label>
                                  {pair.leftImage ? (
                                    <button
                                      type="button"
                                      onClick={() => removeMatchingPairImage(pIdx, "leftImage")}
                                      className="text-[9px] text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Gỡ ảnh</span>
                                    </button>
                                  ) : (
                                    <label className="text-[9px] text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer font-bold">
                                      <ImageIcon className="w-2.5 h-2.5" />
                                      <span>+ Ảnh</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handlePairImageUpload(pIdx, "leftImage", e)}
                                      />
                                    </label>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {pair.leftImage && (
                                    <img
                                      src={pair.leftImage}
                                      alt="Ảnh trái"
                                      className="w-8 h-8 rounded border border-slate-300 object-contain bg-white p-0.5 shrink-0 cursor-pointer"
                                      onClick={() => setPreviewImage(pair.leftImage!)}
                                      title="Bấm để phóng to"
                                    />
                                  )}
                                  <input
                                    type="text"
                                    required
                                    value={pair.left}
                                    onChange={(e) => updateMatchingPair(pIdx, "left", e.target.value)}
                                    placeholder="VD: Desktop Computer"
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              {/* Right item */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[9px] font-mono text-slate-500 uppercase font-bold">
                                    Định nghĩa / Thẻ (Vế phải)
                                  </label>
                                  {pair.rightImage ? (
                                    <button
                                      type="button"
                                      onClick={() => removeMatchingPairImage(pIdx, "rightImage")}
                                      className="text-[9px] text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Gỡ ảnh</span>
                                    </button>
                                  ) : (
                                    <label className="text-[9px] text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer font-bold">
                                      <ImageIcon className="w-2.5 h-2.5" />
                                      <span>+ Ảnh</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handlePairImageUpload(pIdx, "rightImage", e)}
                                      />
                                    </label>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {pair.rightImage && (
                                    <img
                                      src={pair.rightImage}
                                      alt="Ảnh phải"
                                      className="w-8 h-8 rounded border border-slate-300 object-contain bg-white p-0.5 shrink-0 cursor-pointer"
                                      onClick={() => setPreviewImage(pair.rightImage!)}
                                      title="Bấm để phóng to"
                                    />
                                  )}
                                  <input
                                    type="text"
                                    required
                                    value={pair.right}
                                    onChange={(e) => updateMatchingPair(pIdx, "right", e.target.value)}
                                    placeholder="VD: Có khả năng hợp nhất và chỉnh sửa..."
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addMatchingPair}
                        disabled={matchingPairs.length >= 8}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 border border-slate-200 border-dashed cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm mới (+1)</span>
                      </button>
                    </div>
                  )}

                  {/* Multiple Choice Options */}
                  {qType === "multiple_choice" && (
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      {/* Sub-type: Single Choice vs Multi Select */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                          Hình thức trắc nghiệm
                        </label>
                        <div className="grid grid-cols-2 gap-2 font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              setMcSubtype("single");
                              setMcCorrectKeys((prev) => [prev[0] || "A"]);
                            }}
                            className={`py-1.5 px-2.5 rounded-lg border text-center font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              mcSubtype === "single"
                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${mcSubtype === "single" ? "bg-indigo-600" : "bg-slate-400"}`} />
                            <span>Chọn 1 đáp án</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMcSubtype("multiple")}
                            className={`py-1.5 px-2.5 rounded-lg border text-center font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              mcSubtype === "multiple"
                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-xs ${mcSubtype === "multiple" ? "bg-indigo-600" : "bg-slate-400"}`} />
                            <span>Chọn nhiều đáp án</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-extrabold uppercase font-mono text-slate-500">
                          Các câu trả lời ({mcOptions.length} lựa chọn):
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {mcSubtype === "single" ? "Tick chọn 1 đáp án đúng" : "Tick chọn các đáp án đúng"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {mcOptions.map((optVal, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = mcCorrectKeys.includes(letter);
                          return (
                            <div key={oIdx} className="flex items-center gap-2">
                              <label
                                className="flex items-center gap-1 shrink-0 cursor-pointer"
                                title={mcSubtype === "single" ? `Đặt ${letter} làm đáp án đúng` : `Bật/tắt ${letter} là đáp án đúng`}
                              >
                                {mcSubtype === "single" ? (
                                  <input
                                    type="radio"
                                    name="mcCorrectKeySingle"
                                    checked={isCorrect}
                                    onChange={() => setMcCorrectKeys([letter])}
                                    className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isCorrect}
                                    onChange={() => toggleMcCorrectKey(letter)}
                                    className="text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                  />
                                )}
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] transition ${
                                    isCorrect
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {letter}
                                </span>
                              </label>

                              <input
                                type="text"
                                required
                                value={optVal}
                                onChange={(e) => updateMcOption(oIdx, e.target.value)}
                                placeholder={`Nội dung lựa chọn ${letter}...`}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                              />

                              {mcOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeMcOption(oIdx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition shrink-0 cursor-pointer"
                                  title={`Xóa phương án ${letter}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add option button */}
                      <button
                        type="button"
                        onClick={addMcOption}
                        disabled={mcOptions.length >= 10}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 border border-slate-200 border-dashed cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm mới (+1)</span>
                      </button>
                    </div>
                  )}

                  {/* Yes/No Correct Key 
                  {qType === "yes_no" && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                        Đáp án đúng
                      </label>
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setCorrectKey("True")}
                          className={`py-2 rounded-lg border font-bold text-center ${
                            correctKey === "True"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          Đúng (True)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCorrectKey("False")}
                          className={`py-2 rounded-lg border font-bold text-center ${
                            correctKey === "False"
                              ? "bg-rose-50 border-rose-500 text-rose-700"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          Sai (False)
                        </button>
                      </div>
                    </div>
                  )} */}

                  {qType === "yes_no" && (
                    <div className="space-y-3 pt-1 border-t border-slate-100">

                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                          Các phát biểu Đúng / Sai
                        </label>

                        <button
                          type="button"
                          onClick={addYesNoStatement}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold hover:bg-indigo-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Thêm phát biểu
                        </button>
                      </div>

                      <div className="space-y-2">

                        {yesNoStatements.map((statement, index) => (

                          <div
                            key={index}
                            className="grid grid-cols-[1fr_70px_70px_35px] gap-2 items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                          >

                            {/* STT + Nội dung */}
                            <div className="flex items-center gap-2">

                              <span className="w-7 h-7 shrink-0 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black font-mono">
                                {index + 1}
                              </span>

                              <input
                                type="text"
                                value={statement.text}
                                onChange={(e) =>
                                  updateYesNoStatement(
                                    index,
                                    "text",
                                    e.target.value
                                  )
                                }
                                placeholder={`Nhập phát biểu ${index + 1}...`}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                              />

                            </div>

                            {/* ĐÚNG */}
                            <label className="flex flex-col items-center justify-center gap-1 cursor-pointer">

                              <input
                                type="radio"
                                name={`yes-no-${index}`}
                                value="True"
                                checked={statement.correct === "True"}
                                onChange={() =>
                                  updateYesNoStatement(
                                    index,
                                    "correct",
                                    "True"
                                  )
                                }
                                className="w-5 h-5 accent-emerald-600 cursor-pointer"
                              />

                              <span className="text-[9px] font-black text-emerald-700 uppercase">
                                Đúng
                              </span>

                            </label>

                            {/* SAI */}
                            <label className="flex flex-col items-center justify-center gap-1 cursor-pointer">

                              <input
                                type="radio"
                                name={`yes-no-${index}`}
                                value="False"
                                checked={statement.correct === "False"}
                                onChange={() =>
                                  updateYesNoStatement(
                                    index,
                                    "correct",
                                    "False"
                                  )
                                }
                                className="w-5 h-5 accent-rose-600 cursor-pointer"
                              />

                              <span className="text-[9px] font-black text-rose-700 uppercase">
                                Sai
                              </span>

                            </label>

                            {/* XÓA */}
                            <button
                              type="button"
                              onClick={() => removeYesNoStatement(index)}
                              disabled={yesNoStatements.length <= 2}
                              className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Xóa phát biểu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>

                        ))}

                      </div>

                    </div>
                  )}

                  {/* Explanation Note */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                      Giải thích / Lời giải chi tiết
                    </label>
                    <input
                      type="text"
                      value={correctAnswerNote}
                      onChange={(e) => setCorrectAnswerNote(e.target.value)}
                      placeholder="Giải thích vì sao đáp án này là đúng..."
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider font-mono shadow-md shadow-emerald-600/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Lưu vào Ngân hàng Đề</span>
                  </button>

                </form>
              </div>

              {/* Right List: Question Bank Explorer (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 space-y-4">
                <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase font-mono text-slate-800">
                      Ngân hàng câu hỏi IC3 ({filteredQuestions.length} câu)
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Bao gồm câu hỏi mặc định và câu hỏi do Admin vừa tạo
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={questionTypeFilter}
                      onChange={(e) => setQuestionTypeFilter(e.target.value)}
                      className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Tất cả Loại</option>
                      <option value="multiple_choice">Trắc nghiệm (Tất cả)</option>
                      <option value="mc_single">Trắc nghiệm (1 đáp án)</option>
                      <option value="mc_multi">Trắc nghiệm (Nhiều đáp án)</option>
                      <option value="yes_no">Đúng / Sai</option>
                      <option value="matching">Ghép nối (Matching)</option>
                    </select>

                    <select
                      value={questionLevelFilter}
                      onChange={(e) => setQuestionLevelFilter(e.target.value)}
                      className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Tất cả Level</option>
                      <option value="level-1">Level 1</option>
                      <option value="level-2">Level 2</option>
                      <option value="level-3">Level 3</option>
                    </select>

                    <select
                      value={questionSubsetFilter}
                      onChange={(e) => setQuestionSubsetFilter(e.target.value)}
                      className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Tất cả Đề</option>
                      <option value="GM1">GM1</option>
                      <option value="GM2">GM2</option>
                      <option value="OT1">OT1</option>
                      <option value="OT2">OT2</option>
                      <option value="OT3">OT3</option>
                      <option value="OT4">OT4</option>
                      <option value="OT5">OT5</option>
                    </select>
                  </div>
                </div>

                {/* Search in bank */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Tìm kiếm từ khóa câu hỏi trong ngân hàng..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Questions Scrollable List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredQuestions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-mono text-xs">
                      Không tìm thấy câu hỏi nào thỏa mãn điều kiện lọc.
                    </div>
                  ) : (
                    filteredQuestions.map((q: any, idx) => (
                      <div 
                        key={q.id || idx}
                        className={`p-3.5 rounded-xl border transition ${
                          q.isCustom
                            ? "bg-emerald-50/40 border-emerald-200 ring-1 ring-emerald-500/10"
                            : "bg-slate-50/60 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Số thứ tự câu hỏi và công cụ đổi STT nhanh */}
                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-xs">
                              <ListOrdered className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="text-[10px] font-mono font-bold text-slate-700">STT:</span>
                              <input
                                type="number"
                                min="1"
                                value={orderInputMap[q.id] !== undefined ? orderInputMap[q.id] : (q.order ?? (idx + 1))}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                                  setOrderInputMap((prev) => ({ ...prev, [q.id]: val }));
                                }}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val > 0 && val !== q.order) {
                                    handleUpdateQuestionOrder(q, val);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = parseInt((e.target as HTMLInputElement).value, 10);
                                    if (!isNaN(val) && val > 0 && val !== q.order) {
                                      handleUpdateQuestionOrder(q, val);
                                    }
                                  }
                                }}
                                title="Nhập số thứ tự và bấm Enter hoặc click ra ngoài để lưu"
                                className="w-11 text-center text-xs font-mono font-black text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded px-1 py-0.5 focus:bg-white focus:outline-none focus:border-indigo-500"
                              />
                              <div className="flex items-center gap-0.5 ml-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveQuestionOrder(q, "up", idx, filteredQuestions)}
                                  className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400 transition cursor-pointer"
                                  title="Đẩy lên trước"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === filteredQuestions.length - 1}
                                  onClick={() => handleMoveQuestionOrder(q, "down", idx, filteredQuestions)}
                                  className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-25 disabled:hover:text-slate-400 transition cursor-pointer"
                                  title="Hạ xuống sau"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono font-bold uppercase bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                              {q.levelId} • {q.subsetId}
                            </span>
                            <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {q.type === "matching"
                                ? "Ghép nối"
                                : q.type === "yes_no"
                                ? "Đúng/Sai"
                                : q.correctKeys && q.correctKeys.length > 1
                                ? "Trắc nghiệm (Nhiều đáp án)"
                                : "Trắc nghiệm (1 đáp án)"}
                            </span>
                            {q.isCustom && (
                              <span className="text-[10px] font-mono font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm">
                                Admin tạo mới
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingQuestion(q)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                              title="Sửa đổi, bổ sung câu hỏi này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {q.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                                title="Xóa câu hỏi tự tạo này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-800 mb-2 leading-relaxed">
                          {q.text}
                        </p>

                        {/* Question Image (if attached) */}
                        {q.image && (
                          <div className="mb-2">
                            <img
                              src={q.image}
                              alt="Ảnh câu hỏi"
                              className="max-h-28 rounded-lg border border-slate-200 object-contain bg-white cursor-pointer hover:opacity-90 transition p-0.5 shadow-xs"
                              onClick={() => setPreviewImage(q.image)}
                              title="Bấm để xem ảnh lớn"
                            />
                          </div>
                        )}

                        {/* Multiple Choice Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isCorrect = q.correctKeys?.some((k: string) => opt.startsWith(k));
                              return (
                                <div 
                                  key={optIdx} 
                                  className={`px-2 py-1 rounded text-[11px] font-medium ${
                                    isCorrect 
                                      ? "bg-emerald-100/70 border border-emerald-300 text-emerald-900 font-bold"
                                      : "bg-white border border-slate-200 text-slate-600"
                                  }`}
                                >
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Matching Question Pairs Display */}
                        {q.type === "matching" && q.pairs && q.pairs.length > 0 && (
                          <div className="space-y-1.5 mb-2 bg-white p-2.5 rounded-lg border border-slate-200">
                            <div className="text-[10px] font-mono font-bold uppercase text-slate-500 mb-1">
                              Các cặp ghép nối đúng ({q.pairs.length} cặp):
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {q.pairs.map((pair: any, pIdx: number) => (
                                <div key={pIdx} className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-150">
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {pair.leftImage && (
                                      <img
                                        src={pair.leftImage}
                                        alt={pair.left}
                                        className="w-7 h-7 rounded border border-slate-300 object-contain bg-white shrink-0 cursor-pointer"
                                        onClick={() => setPreviewImage(pair.leftImage)}
                                        title="Bấm để xem ảnh"
                                      />
                                    )}
                                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 text-[11px] font-mono">
                                      {pair.left}
                                    </span>
                                  </div>
                                  <span className="text-slate-400 font-bold">➔</span>
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {pair.rightImage && (
                                      <img
                                        src={pair.rightImage}
                                        alt={pair.right}
                                        className="w-7 h-7 rounded border border-slate-300 object-contain bg-white shrink-0 cursor-pointer"
                                        onClick={() => setPreviewImage(pair.rightImage)}
                                        title="Bấm để xem ảnh"
                                      />
                                    )}
                                    <span className="text-slate-700 text-[11px] font-medium leading-relaxed break-words">
                                      {pair.right}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[11px] font-medium text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                          <strong className="text-slate-700">Đáp án: </strong>
                          <span className="whitespace-pre-line">
                            {q.correctAnswerText || (q.pairs ? q.pairs.map((p: any) => `• ${p.left} ➔ ${p.right}`).join("\n") : q.correctKeys?.join(", "))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* ➕ Modal: Add New User */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase font-mono text-slate-800">
                  Thêm tài khoản mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Lê Thị Hoa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                    Lớp
                  </label>
                  <input
                    type="text"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    placeholder="Ví dụ: 6A2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                    Trường học
                  </label>
                  <input
                    type="text"
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    placeholder="Ví dụ: THCS Trưng Vương"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                  Tên đăng nhập (Username)
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="viết liền không dấu"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                  Mật khẩu
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu tài khoản"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                  Phân quyền
                </label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setNewRole("student")}
                    className={`py-2 rounded-lg border font-bold text-center ${
                      newRole === "student"
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    Học sinh
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole("admin")}
                    className={`py-2 rounded-lg border font-bold text-center ${
                      newRole === "admin"
                        ? "bg-amber-50 border-amber-500 text-amber-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    Quản trị viên
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="py-2.5 px-3 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-500 hover:bg-slate-50 transition uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-mono transition uppercase shadow-md shadow-indigo-600/20"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: BULK ADD USERS FROM SHEET / EXCEL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Thêm danh sách học sinh từ Sheet</h3>
                  <p className="text-xs text-slate-500">
                    Tự động sinh Username dạng viết tắt (VD: Nguyễn Hoàng Long &rarr; <span className="font-mono text-indigo-600 font-bold">nhlong</span>, pass mặc định: <span className="font-mono font-bold">123</span>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500 mb-1">
                  Lớp mặc định (nếu dòng chưa có)
                </label>
                <input
                  type="text"
                  value={bulkDefaultClass}
                  onChange={(e) => {
                    setBulkDefaultClass(e.target.value);
                    handleBulkTextChange(bulkRawText, e.target.value, bulkDefaultSchool);
                  }}
                  placeholder="Ví dụ: 6A3"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500 mb-1">
                  Trường học mặc định (nếu dòng chưa có)
                </label>
                <input
                  type="text"
                  value={bulkDefaultSchool}
                  onChange={(e) => {
                    setBulkDefaultSchool(e.target.value);
                    handleBulkTextChange(bulkRawText, bulkDefaultClass, e.target.value);
                  }}
                  placeholder="Ví dụ: THCS Trưng Vương"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1 flex-1 min-h-[140px] flex flex-col">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-extrabold uppercase font-mono text-slate-500">
                  Dán nội dung từ Google Sheets / Excel (Mỗi học sinh 1 dòng)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = "Nguyễn Hoàng Long\t6A3\tTHCS Trưng Vương\nTrần Minh Anh\t6A3\tTHCS Trưng Vương\nLê Tuấn Kiệt\t6A3\tTHCS Trưng Vương\nPhạm Quỳnh Chi\t6A3\tTHCS Trưng Vương";
                    handleBulkTextChange(sample);
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold underline"
                >
                  Dán mẫu thử
                </button>
              </div>
              <textarea
                rows={5}
                value={bulkRawText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                placeholder={"Cách 1: Sao chép các ô từ Excel/Sheets rồi dán vào đây\nCách 2: Chỉ cần nhập danh sách tên (mỗi dòng 1 tên):\nNguyễn Hoàng Long\nTrần Minh Anh\nPhan Quốc Hưng"}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 flex-1 resize-none"
              />
            </div>

            {/* Preview Section */}
            {bulkPreview.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[180px] flex flex-col">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-700">
                  <span>Xem trước danh sách ({bulkPreview.length} học sinh)</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Sẵn sàng tạo
                  </span>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-100 text-xs">
                  {bulkPreview.map((row, i) => (
                    <div key={i} className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-[10px] w-5">{i + 1}.</span>
                        <span className="font-bold text-slate-800">{row.name}</span>
                        {(row.className || row.school) && (
                          <span className="text-[10px] text-slate-500">
                            ({row.className ? `Lớp ${row.className}` : ""}{row.school ? ` - ${row.school}` : ""})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-150">
                          @{row.username}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                          Pass: {row.password}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="py-2.5 px-3 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-500 hover:bg-slate-50 transition uppercase"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreateBulkUsers}
                disabled={isProcessingBulk || bulkPreview.length === 0}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-mono transition uppercase shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
              >
                {isProcessingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tạo {bulkPreview.length} tài khoản</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: CHANGE PASSWORD FOR USER (FROM TABLE) */}
      <ChangePasswordModal
        isOpen={!!changePasswordUser}
        onClose={() => setChangePasswordUser(null)}
        userId={changePasswordUser?.id || ""}
        username={changePasswordUser?.username || ""}
        userName={changePasswordUser?.name || ""}
        className={changePasswordUser?.className}
        school={changePasswordUser?.school}
        onSuccess={(msg) => {
          notify(msg);
          loadData();
        }}
      />

      {/* MODAL 4: CHANGE PASSWORD FOR CURRENT ADMIN */}
      <ChangePasswordModal
        isOpen={showAdminChangePassword}
        onClose={() => setShowAdminChangePassword(false)}
        userId={currentUser.id}
        username={currentUser.username}
        userName={currentUser.name}
        className={currentUser.className}
        school={currentUser.school}
        onSuccess={(msg) => {
          notify(msg);
        }}
      />

      {/* MODAL 5: EDIT / SUPPLEMENT QUESTION */}
      <EditQuestionModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        question={editingQuestion}
        onSuccess={(updated) => {
          notify(`Đã cập nhật câu hỏi thành công!`);
          loadData();
          onQuestionsUpdated?.();
        }}
      />

      {/* Image Lightbox Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-rose-600 transition shadow-lg cursor-pointer"
              title="Đóng xem ảnh"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Phóng to hình ảnh"
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}

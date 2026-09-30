import React, { useState, useEffect } from "react";
import { 
  Lock, 
  User as UserIcon, 
  School, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  ListOrdered,
  RefreshCw,
  KeyRound,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiService } from "../services/apiService";
import { User } from "../types";

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  // Mode: "login" (manual username/password) or "list" (dropdown: School -> Class -> Name -> Password)
  const [mode, setMode] = useState<"login" | "list">("list");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Login Form States
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Directory Dropdown Login States
  const [students, setStudents] = useState<User[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [listPassword, setListPassword] = useState("");
  const [showListPassword, setShowListPassword] = useState(false);

  // Field for student who does not find their name in list
  const [isManualUsernameMode, setIsManualUsernameMode] = useState(false);
  const [manualUsername, setManualUsername] = useState("");

  // Fetch student directory added by admin
  const loadStudentDirectory = async () => {
    setIsLoadingStudents(true);
    try {
      const studentList = await apiService.getStudentsForLogin();
      setStudents(studentList);
    } catch (e) {
      console.warn("Could not load student list for login:", e);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudentDirectory();
  }, []);

  // Filtered lists for cascaded dropdowns
  const uniqueSchools = Array.from(
    new Set(students.map((s) => s.school?.trim()).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const uniqueClasses = Array.from(
    new Set(
      students
        .filter((s) => s.school?.trim() === selectedSchool.trim())
        .map((s) => s.className?.trim())
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));

  const filteredStudents = students
    .filter(
      (s) =>
        s.school?.trim() === selectedSchool.trim() &&
        s.className?.trim() === selectedClass.trim()
    )
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Handle Manual Username/Password Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginUsername.trim() || !loginPassword) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.login(loginUsername, loginPassword);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Kiểm tra lại thông tin tài khoản.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Dropdown List Login Submit (School -> Class -> Name -> Password OR Manual Username fallback)
  const handleListLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If student cannot find their name in list and entered their username manually
    if (isManualUsernameMode) {
      if (!manualUsername.trim()) {
        setError("Vui lòng nhập tên đăng nhập của học sinh.");
        return;
      }
      if (!listPassword) {
        setError("Vui lòng nhập mật khẩu tài khoản học sinh.");
        return;
      }

      setIsLoading(true);
      try {
        const res = await apiService.login(manualUsername.trim(), listPassword);
        onAuthSuccess(res.user);
      } catch (err: any) {
        setError(err.message || "Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!selectedSchool) {
      setError("Vui lòng chọn trường học từ danh sách.");
      return;
    }
    if (!selectedClass) {
      setError("Vui lòng chọn lớp học từ danh sách.");
      return;
    }
    if (!selectedStudentId || !selectedStudent) {
      setError("Vui lòng chọn họ và tên học sinh hoặc chuyển sang tự nhập tên đăng nhập.");
      return;
    }
    if (!listPassword) {
      setError("Vui lòng nhập mật khẩu tài khoản học sinh.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.login(selectedStudent.username, listPassword);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Mật khẩu không chính xác. Vui lòng kiểm tra lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f8] flex items-center justify-center p-4 font-sans text-slate-900 border-4 md:border-8 border-slate-300 select-none relative">
      
      <div className="w-full max-w-lg">
        {/* Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-slate-300 rounded-2xl shadow-md overflow-hidden"
        >
          {/* Top Decorative Header */}
          <div className="bg-gradient-to-r from-indigo-850 via-indigo-750 to-blue-750 p-6 text-black text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-gray-900/20 shadow-inner">
              <GraduationCap className="w-8 h-8 text-green" />
            </div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight font-mono">
              HỆ THỐNG ÔN THI IC3
            </h1>
            <p className="text-xs md:text-sm text-gray-900 mt-1.5 font-semibold">
              Cổng đăng nhập
            </p>
          </div>

          {/* Mode Switch Tabs: Đăng nhập với danh sách vs Đăng nhập tài khoản */}
          <div className="grid grid-cols-2 border-b-2 border-slate-300 bg-[#edf1f5] text-xs md:text-sm font-bold font-mono">
            <button
              type="button"
              onClick={() => { setMode("list"); setError(null); }}
              className={`py-3.5 px-2 text-center transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                mode === "list"
                  ? "border-indigo-600 text-indigo-950 bg-white font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListOrdered className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">ĐĂNG NHẬP VỚI DANH SÁCH</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`py-3.5 px-2 text-center transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                mode === "login"
                  ? "border-indigo-600 text-indigo-950 bg-white font-black"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Lock className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="truncate">NHẬP TÊN TÀI KHOẢN</span>
            </button>
          </div>

          {/* Form Content Area */}
          <div className="p-6 md:p-8">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs md:text-sm font-bold flex items-center gap-2.5"
              >
                <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {mode === "list" ? (
                /* ================= 📋 FORM ĐĂNG NHẬP VỚI DANH SÁCH ================= */
                <motion.form
                  key="list-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleListLoginSubmit}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-1">
                    <p className="text-xs text-slate-600 font-semibold">
                      Chọn thông tin theo danh sách admin đã tạo:
                    </p>
                    <button
                      type="button"
                      onClick={loadStudentDirectory}
                      disabled={isLoadingStudents}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      title="Làm mới danh sách học sinh"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStudents ? "animate-spin" : ""}`} />
                      <span>Làm mới</span>
                    </button>
                  </div>

                  {/* THUỘC TÍNH 1: TRƯỜNG HỌC */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-800 font-mono flex items-center gap-1.5">
                      <School className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>1. Trường học</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={selectedSchool}
                        onChange={(e) => {
                          setSelectedSchool(e.target.value);
                          setSelectedClass("");
                          setSelectedStudentId("");
                          setListPassword("");
                          setError(null);
                        }}
                        className="w-full px-3.5 py-3 bg-[#eef2f6] hover:bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-950 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition cursor-pointer appearance-none pr-9"
                      >
                        <option value="">-- Chọn Trường học --</option>
                        {uniqueSchools.map((sch) => (
                          <option key={sch} value={sch} className="font-semibold text-slate-900">
                            {sch}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                        <ArrowRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* THUỘC TÍNH 2: LỚP HỌC */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-800 font-mono flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>2. Lớp học</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        disabled={!selectedSchool}
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value);
                          setSelectedStudentId("");
                          setListPassword("");
                          setError(null);
                        }}
                        className={`w-full px-3.5 py-3 border-2 rounded-xl text-sm font-bold text-slate-950 transition cursor-pointer appearance-none pr-9 ${
                          selectedSchool
                            ? "bg-[#eef2f6] hover:bg-white border-slate-300 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                            : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <option value="">
                          {selectedSchool ? "-- Chọn Lớp học --" : "-- Vui lòng chọn trường trước --"}
                        </option>
                        {uniqueClasses.map((cls) => (
                          <option key={cls} value={cls} className="font-semibold text-slate-900">
                            Lớp {cls}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                        <ArrowRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* THUỘC TÍNH 3: TÊN HỌC SINH HOẶC TỰ NHẬP TÊN ĐĂNG NHẬP */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-800 font-mono flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>3. {isManualUsernameMode ? "Tự nhập Tên đăng nhập" : "Họ và tên học sinh"}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualUsernameMode(!isManualUsernameMode);
                          if (!isManualUsernameMode) {
                            setSelectedStudentId("");
                          } else {
                            setManualUsername("");
                          }
                          setError(null);
                        }}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        {isManualUsernameMode ? (
                          <span>← Quay lại chọn danh sách</span>
                        ) : (
                          <span>Không thấy tên? Tự nhập</span>
                        )}
                      </button>
                    </div>

                    {!isManualUsernameMode ? (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <select
                            required={!isManualUsernameMode}
                            disabled={!selectedClass}
                            value={selectedStudentId}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__manual__") {
                                setIsManualUsernameMode(true);
                                setSelectedStudentId("");
                              } else {
                                setSelectedStudentId(val);
                              }
                              setListPassword("");
                              setError(null);
                            }}
                            className={`w-full px-3.5 py-3 border-2 rounded-xl text-sm font-bold text-slate-950 transition cursor-pointer appearance-none pr-9 ${
                              selectedClass
                                ? "bg-[#eef2f6] hover:bg-white border-slate-300 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            <option value="">
                              {selectedClass ? "-- Chọn Họ và tên học sinh --" : "-- Vui lòng chọn lớp trước --"}
                            </option>
                            {filteredStudents.map((s) => (
                              <option key={s.id} value={s.id} className="font-semibold text-slate-900">
                                {s.name} ({s.username})
                              </option>
                            ))}
                            {selectedClass && (
                              <option value="__manual__" className="text-indigo-700 font-bold bg-indigo-50">
                                ➕ Không tìm thấy tên trong danh sách? Nhập tên đăng nhập thủ công
                              </option>
                            )}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                            <ArrowRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>

                        {/* Direct prompt button for students who don't see their name */}
                        <div className="flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualUsernameMode(true);
                              setSelectedStudentId("");
                              setError(null);
                            }}
                            className="text-[11px] font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition text-left"
                          >
                            <span>💡 Không tìm thấy tên bạn trong danh sách?</span>
                            <span className="font-bold text-indigo-700 underline">Bấm vào đây để tự nhập tên đăng nhập</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Trường tự nhập tên đăng nhập nếu không tìm thấy tên trong danh sách */
                      <div className="space-y-1.5 p-3.5 bg-indigo-50/80 border-2 border-indigo-300 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-indigo-900 font-mono">
                            Tên đăng nhập (Username):
                          </span>
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-200/70 px-2 py-0.5 rounded font-mono">
                            Tự nhập thông tin
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            autoFocus
                            value={manualUsername}
                            onChange={(e) => {
                              setManualUsername(e.target.value);
                              setError(null);
                            }}
                            placeholder="Nhập tên đăng nhập của bạn (VD: hs_nguyenvanan hoặc mã học sinh)..."
                            className="w-full px-3.5 py-3 bg-white border-2 border-indigo-400 rounded-xl text-sm font-bold text-slate-950 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition"
                          />
                        </div>
                        <p className="text-[11px] text-indigo-900 font-semibold leading-relaxed">
                          💡 Dành cho học sinh chưa có tên trong danh sách lớp. Hãy nhập chính xác Tên đăng nhập do giáo viên cung cấp.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* THUỘC TÍNH 4: MẬT KHẨU */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-800 font-mono flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>4. Mật khẩu</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showListPassword ? "text" : "password"}
                        required
                        disabled={isManualUsernameMode ? !manualUsername.trim() : !selectedStudentId}
                        value={listPassword}
                        onChange={(e) => setListPassword(e.target.value)}
                        placeholder={
                          isManualUsernameMode
                            ? (manualUsername.trim() ? "Nhập mật khẩu tài khoản..." : "Vui lòng nhập tên đăng nhập trước")
                            : (selectedStudentId ? "Nhập mật khẩu..." : "Vui lòng chọn học sinh trước")
                        }
                        className={`w-full px-3.5 pr-11 py-3 border-2 rounded-xl text-sm font-bold text-slate-950 placeholder-slate-400 transition ${
                          (isManualUsernameMode ? manualUsername.trim() : selectedStudentId)
                            ? "bg-[#eef2f6] border-slate-300 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                            : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      />
                      <button
                        type="button"
                        disabled={isManualUsernameMode ? !manualUsername.trim() : !selectedStudentId}
                        onClick={() => setShowListPassword(!showListPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer disabled:opacity-40"
                      >
                        {showListPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nút đăng nhập */}
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !listPassword ||
                      (isManualUsernameMode
                        ? !manualUsername.trim()
                        : (!selectedSchool || !selectedClass || !selectedStudentId))
                    }
                    className="w-full py-3.5 mt-3 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black uppercase tracking-wider font-mono shadow-sm active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <span>Đang xác thực đăng nhập...</span>
                    ) : (
                      <>
                        <span>Đăng nhập hệ thống</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>

                </motion.form>
              ) : (
                /* ================= 🔑 FORM ĐĂNG NHẬP NHẬP TÊN TÀI KHOẢN (MANUAL) ================= */
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onSubmit={handleLoginSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-800 font-mono flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Tên đăng nhập (Username)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Nhập tên đăng nhập"
                        className="w-full px-3.5 py-3 bg-[#eef2f6] border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-950 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-800 font-mono flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Mật khẩu (Password)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 pr-11 py-3 bg-[#eef2f6] border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-950 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 mt-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-black uppercase tracking-wider font-mono shadow-sm active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span>Đang xác thực...</span>
                    ) : (
                      <>
                        <span>Đăng nhập hệ thống</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>

                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


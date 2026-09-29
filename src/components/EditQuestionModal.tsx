import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Edit3, X, CheckCircle2, AlertCircle, Plus, Trash2, Image as ImageIcon, UploadCloud } from "lucide-react";
import { IC3Question } from "../data/ic3Questions";
import { apiService } from "../services/apiService";
import { compressAndEncodeImage } from "../utils/imageUtils";

interface EditQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: IC3Question | null;
  onSuccess?: (updated: IC3Question) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  onSuccess
}) => {
  const [qLevelId, setQLevelId] = useState<"level-1" | "level-2" | "level-3">("level-1");
  const [qSubsetId, setQSubsetId] = useState<"GM1" | "GM2" | "OT1" | "OT2" | "OT3" | "OT4" | "OT5">("GM1");
  const [qType, setQType] = useState<"multiple_choice" | "yes_no" | "matching">("multiple_choice");
  const [qText, setQText] = useState("");
  const [qImage, setQImage] = useState("");
  const [mcOptions, setMcOptions] = useState<string[]>(["", "", "", ""]);
  const [mcCorrectKeys, setMcCorrectKeys] = useState<string[]>(["A"]);
  // const [yesNoCorrect, setYesNoCorrect] = useState<"True" | "False">("True");
  const [yesNoStatements, setYesNoStatements] = useState<
    { text: string; correct: "True" | "False" }[]
  >([
    { text: "", correct: "True" },
    { text: "", correct: "False" },
    { text: "", correct: "True" }
  ]);
  const [matchingPairs, setMatchingPairs] = useState<{
    left: string;
    right: string;
    leftImage?: string;
    rightImage?: string;
  }[]>([
    { left: "", right: "", leftImage: "", rightImage: "" },
    { left: "", right: "", leftImage: "", rightImage: "" },
    { left: "", right: "", leftImage: "", rightImage: "" }
  ]);
  const [correctAnswerNote, setCorrectAnswerNote] = useState("");
  const [qOrder, setQOrder] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setQLevelId(question.levelId || "level-1");
      setQSubsetId(question.subsetId || "GM1");
      setQType(question.type || "multiple_choice");
      setQText(question.text || "");
      setQImage(question.image || "");
      setCorrectAnswerNote(question.correctAnswerText || "");
      setQOrder(typeof question.order === "number" ? question.order : "");

      if (question.type === "multiple_choice") {
        if (question.options && question.options.length > 0) {
          // Normalize options to strip 'A. ', 'B. ' if desired, or keep as is
          const rawOpts = question.options.map((opt) => opt.replace(/^[A-D]\.\s*/, ""));
          while (rawOpts.length < 4) rawOpts.push("");
          setMcOptions(rawOpts.slice(0, 4));
        } else {
          setMcOptions(["", "", "", ""]);
        }
        setMcCorrectKeys(question.correctKeys || ["A"]);
      } else if (question.type === "yes_no") {
          if (question.statements?.length) {
      
          setYesNoStatements(
            question.statements.map((s) => ({
              text: s.text,
              correct: s.correct
            }))
          );
      
        } else {
      
          // Tương thích câu Đúng/Sai cũ
          setYesNoStatements([
            {
              text: question.text || "",
              correct:
                question.correctKeys?.[0] === "False"
                  ? "False"
                  : "True"
            }
          ]);
      
        }
      } else if (question.type === "matching") {
        if (question.pairs && question.pairs.length > 0) {
          setMatchingPairs(
            question.pairs.map((p) => ({
              left: p.left,
              right: p.right,
              leftImage: p.leftImage || "",
              rightImage: p.rightImage || ""
            }))
          );
        } else {
          setMatchingPairs([
            { left: "", right: "", leftImage: "", rightImage: "" },
            { left: "", right: "", leftImage: "", rightImage: "" },
            { left: "", right: "", leftImage: "", rightImage: "" }
          ]);
        }
      }
    }
  }, [question]);

  if (!isOpen || !question) return null;

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...mcOptions];
    updated[idx] = val;
    setMcOptions(updated);
  };

  const toggleCorrectKey = (key: string) => {
    if (mcCorrectKeys.includes(key)) {
      if (mcCorrectKeys.length === 1) return; // Must have at least 1 correct answer
      setMcCorrectKeys(mcCorrectKeys.filter((k) => k !== key));
    } else {
      setMcCorrectKeys([...mcCorrectKeys, key]);
    }
  };

  const handlePairChange = (idx: number, side: "left" | "right", val: string) => {
    const updated = [...matchingPairs];
    updated[idx][side] = val;
    setMatchingPairs(updated);
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressAndEncodeImage(e.target.files[0]);
        setQImage(base64);
      } catch (err: any) {
        alert(err?.message || "Lỗi xử lý ảnh.");
      }
    }
  };

  const handlePairImageUpload = async (
    idx: number,
    side: "leftImage" | "rightImage",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressAndEncodeImage(e.target.files[0]);
        const updated = [...matchingPairs];
        updated[idx] = { ...updated[idx], [side]: base64 };
        setMatchingPairs(updated);
      } catch (err: any) {
        alert(err?.message || "Lỗi xử lý ảnh.");
      }
    }
  };

  const removePairImage = (idx: number, side: "leftImage" | "rightImage") => {
    const updated = [...matchingPairs];
    updated[idx] = { ...updated[idx], [side]: "" };
    setMatchingPairs(updated);
  };

  const addPair = () => {
    setMatchingPairs([...matchingPairs, { left: "", right: "", leftImage: "", rightImage: "" }]);
  };

  const removePair = (idx: number) => {
    if (matchingPairs.length <= 2) {
      alert("Cần tối thiểu 2 cặp đối tượng để ghép nối.");
      return;
    }
    setMatchingPairs(matchingPairs.filter((_, i) => i !== idx));
  };

  const updateYesNoStatement = (
    index: number,
    field: "text" | "correct",
    value: string
  ) => {
    setYesNoStatements((prev) => {
      const copy = [...prev];
      if (field === "text") {
        copy[index] = { ...copy[index], text: value };
      } else {
        copy[index] = { ...copy[index], correct: value as "True" | "False" };
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
      { text: "", correct: "True" }
    ]);
  };

  const removeYesNoStatement = (index: number) => {
    if (yesNoStatements.length <= 2) {
      alert("Cần tối thiểu 2 phát biểu.");
      return;
    }
    setYesNoStatements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedText = qText.trim();
    if (!trimmedText) {
      setError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    let formattedOptions: string[] | undefined = undefined;
    let finalCorrectKeys: string[] | undefined = undefined;
    let finalPairs: { left: string; right: string }[] | undefined = undefined;
    let finalStatements:
      | { text: string; correct: "True" | "False" }[]
      | undefined = undefined;
    let finalAnswerText = correctAnswerNote.trim();

    if (qType === "multiple_choice") {
      const labels = ["A", "B", "C", "D"];
      const filled = mcOptions.map((opt) => opt.trim());
      if (filled.some((opt) => !opt)) {
        setError("Vui lòng nhập đầy đủ nội dung cho cả 4 lựa chọn A, B, C, D.");
        return;
      }
      formattedOptions = filled.map((opt, i) => `${labels[i]}. ${opt}`);
      finalCorrectKeys = mcCorrectKeys;
      if (!finalAnswerText) {
        finalAnswerText = formattedOptions
          .filter((_, i) => mcCorrectKeys.includes(labels[i]))
          .join(" | ");
      }
    } else if (qType === "yes_no") {
        const validStatements = yesNoStatements
          .map((s) => ({
            text: s.text.trim(),
            correct: s.correct
          }))
          .filter((s) => s.text);
      
        if (validStatements.length < 2) {
          setError("Vui lòng nhập ít nhất 2 phát biểu.");
          return;
        }
      
        finalCorrectKeys = undefined;
        finalStatements = validStatements;
      
        if (!finalAnswerText) {
          finalAnswerText = validStatements
            .map(
              (s, index) =>
                `${index + 1}. ${
                  s.correct === "True" ? "Đúng" : "Sai"
                }`
            )
            .join("\n");
        }
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
        setError("Vui lòng nhập tối thiểu 2 cặp ghép nối hợp lệ.");
        return;
      }
      finalPairs = validPairs;
      if (!finalAnswerText) {
        finalAnswerText = validPairs.map((p) => `• ${p.left} ➔ ${p.right}`).join("\n");
      }
    }

    setIsLoading(true);
    try {
      const updated = await apiService.updateCustomQuestion(question.id, {
        levelId: qLevelId,
        subsetId: qSubsetId,
        type: qType,
        text: trimmedText,
        image: qImage.trim() || undefined,
        options: formattedOptions,
        correctKeys: finalCorrectKeys,
        statements: finalStatements,
        pairs: finalPairs,
        correctAnswerText: finalAnswerText,
        order: typeof qOrder === "number" ? qOrder : undefined
      });

      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi cập nhật câu hỏi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans my-8"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Chỉnh sửa / Bổ sung câu hỏi
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Mã câu hỏi: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{question.id}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Scope selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cấp độ IC3
                </label>
                <select
                  value={qLevelId}
                  onChange={(e) => setQLevelId(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="level-1">Level 1 - Máy tính cơ bản</option>
                  <option value="level-2">Level 2 - Các ứng dụng cốt lõi</option>
                  <option value="level-3">Level 3 - Cuộc sống trực tuyến</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phân hệ đề
                </label>
                <select
                  value={qSubsetId}
                  onChange={(e) => setQSubsetId(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="GM1">GM1 - Đề thi thử số 1</option>
                  <option value="GM2">GM2 - Đề thi thử số 2</option>
                  <option value="OT1">OT1 - Bộ ôn tập 1</option>
                  <option value="OT2">OT2 - Bộ ôn tập 2</option>
                  <option value="OT3">OT3 - Bộ ôn tập 3</option>
                  <option value="OT4">OT4 - Bộ ôn tập 4</option>
                  <option value="OT5">OT5 - Bộ ôn tập 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dạng câu hỏi
                </label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="multiple_choice">Trắc nghiệm nhiều lựa chọn</option>
                  <option value="yes_no">Đúng / Sai (Yes / No)</option>
                  <option value="matching">Ghép nối (Matching)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số thứ tự (STT)
                </label>
                <input
                  type="number"
                  min={1}
                  value={qOrder}
                  onChange={(e) => setQOrder(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="Mặc định"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nội dung câu hỏi <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Nhập nội dung đề bài câu hỏi..."
                required
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Question Main Image (Optional for screenshots/illustrations) */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Hình ảnh đề bài minh họa (Tùy chọn)</span>
                </label>
                {qImage && (
                  <button
                    type="button"
                    onClick={() => setQImage("")}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa ảnh</span>
                  </button>
                )}
              </div>

              {qImage ? (
                <div className="relative group max-w-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
                  <img
                    src={qImage}
                    alt="Ảnh đề bài"
                    className="max-h-40 w-auto rounded object-contain mx-auto"
                  />
                  <div className="text-[10px] text-center text-slate-500 mt-1 font-mono">
                    Đã tải ảnh thành công
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition">
                    <UploadCloud className="w-4 h-4 text-indigo-500" />
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
                    placeholder="Hoặc dán link URL ảnh..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Dynamic Type Fields */}
            {qType === "multiple_choice" && (
              <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    4 Lựa chọn trả lời & Đáp án đúng
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                    (Click vào chữ A, B, C, D để chọn đáp án đúng)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {(["A", "B", "C", "D"] as const).map((letter, idx) => {
                    const isCorrect = mcCorrectKeys.includes(letter);
                    return (
                      <div key={letter} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCorrectKey(letter)}
                          title={`Bấm để chọn/bỏ chọn ${letter} là đáp án đúng`}
                          className={`w-8 h-8 rounded-lg font-mono font-bold text-xs shrink-0 flex items-center justify-center transition cursor-pointer ${
                            isCorrect
                              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                          }`}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          value={mcOptions[idx]}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          placeholder={`Nội dung lựa chọn ${letter}...`}
                          required
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {qType === "yes_no" && (
              <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Các phát biểu Đúng / Sai:
                  </span>
                  <button
                    type="button"
                    onClick={addYesNoStatement}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 text-[11px] font-bold hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm phát biểu
                  </button>
                </div>

                <div className="space-y-2">
                  {yesNoStatements.map((statement, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_65px_65px_30px] gap-2 items-center p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 shrink-0 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono font-bold">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={statement.text}
                          onChange={(e) =>
                            updateYesNoStatement(index, "text", e.target.value)
                          }
                          placeholder={`Nội dung phát biểu ${index + 1}...`}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <label className="flex flex-col items-center justify-center gap-0.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`edit-yesno-${index}`}
                          value="True"
                          checked={statement.correct === "True"}
                          onChange={() =>
                            updateYesNoStatement(index, "correct", "True")
                          }
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                        <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase">
                          Đúng
                        </span>
                      </label>

                      <label className="flex flex-col items-center justify-center gap-0.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`edit-yesno-${index}`}
                          value="False"
                          checked={statement.correct === "False"}
                          onChange={() =>
                            updateYesNoStatement(index, "correct", "False")
                          }
                          className="w-4 h-4 accent-rose-600 cursor-pointer"
                        />
                        <span className="text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase">
                          Sai
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeYesNoStatement(index)}
                        disabled={yesNoStatements.length <= 2}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Xóa phát biểu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {qType === "matching" && (
              <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Các cặp ghép nối (Cột trái ➔ Cột phải)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Có thể đính kèm ảnh cho thuật ngữ và/hoặc định nghĩa kéo thả
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addPair}
                    className="flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm cặp</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {matchingPairs.map((p, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500">
                        <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px]">
                          Cặp #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePair(idx)}
                          disabled={matchingPairs.length <= 2}
                          className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa cặp</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Vế trái */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase font-mono">
                              Vế trái (Thuật ngữ)
                            </span>
                            {p.leftImage ? (
                              <button
                                type="button"
                                onClick={() => removePairImage(idx, "leftImage")}
                                className="text-[10px] text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Gỡ ảnh</span>
                              </button>
                            ) : (
                              <label className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold">
                                <ImageIcon className="w-3 h-3" />
                                <span>+ Đính kèm ảnh</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePairImageUpload(idx, "leftImage", e)}
                                />
                              </label>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.leftImage && (
                              <img
                                src={p.leftImage}
                                alt="Ảnh trái"
                                className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800 p-0.5 shrink-0"
                              />
                            )}
                            <input
                              type="text"
                              value={p.left}
                              onChange={(e) => handlePairChange(idx, "left", e.target.value)}
                              placeholder="Thuật ngữ / Vế trái..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Vế phải */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase font-mono">
                              Vế phải (Định nghĩa / Thẻ)
                            </span>
                            {p.rightImage ? (
                              <button
                                type="button"
                                onClick={() => removePairImage(idx, "rightImage")}
                                className="text-[10px] text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Gỡ ảnh</span>
                              </button>
                            ) : (
                              <label className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold">
                                <ImageIcon className="w-3 h-3" />
                                <span>+ Đính kèm ảnh</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePairImageUpload(idx, "rightImage", e)}
                                />
                              </label>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.rightImage && (
                              <img
                                src={p.rightImage}
                                alt="Ảnh phải"
                                className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800 p-0.5 shrink-0"
                              />
                            )}
                            <input
                              type="text"
                              value={p.right}
                              onChange={(e) => handlePairChange(idx, "right", e.target.value)}
                              placeholder="Định nghĩa / Vế phải..."
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lời giải thích / Ghi chú đáp án
              </label>
              <textarea
                rows={2}
                value={correctAnswerNote}
                onChange={(e) => setCorrectAnswerNote(e.target.value)}
                placeholder="Nhập giải thích chi tiết vì sao đáp án đúng..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-650 dark:hover:bg-indigo-600 transition shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

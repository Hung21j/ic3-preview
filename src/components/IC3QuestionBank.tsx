import React, { useState, useEffect, useRef } from "react";
import { IC3_QUESTIONS, IC3Question } from "../data/ic3Questions";
import { QuestionType, User } from "../types";
import { apiService } from "../services/apiService";
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  BookOpenCheck,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Compass,
  Lightbulb,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Undo2,
  HelpCircle,
  Timer,
  Award,
  BookOpen,
  Flag,
  ChevronDown,
  LayoutGrid,
  ZoomIn,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IC3QuestionBankProps {
  selectedLevel: string;
  onSelectQuestionToSolve: (data: {
    questionText: string;
    question?: string;
    questionType: QuestionType;
    image: string | null;
    options: string[];
  }) => void;
  isLoading: boolean;
  currentUser?: User;
  customQuestions?: IC3Question[];
  onOpenAdminDashboard?: () => void;
}

interface SubsetConfig {
  id: string;
  name: string;
}

export default function IC3QuestionBank({ 
  selectedLevel, 
  onSelectQuestionToSolve, 
  isLoading,
  currentUser,
  customQuestions = [],
  onOpenAdminDashboard
}: IC3QuestionBankProps) {
  // Determine which level ID applies based on selectedLevel (Level 1, 2, or 3)
  let activeLevelId = "level-1";
  if (selectedLevel.includes("Level 2")) {
    activeLevelId = "level-2";
  } else if (selectedLevel.includes("Level 3")) {
    activeLevelId = "level-3";
  }

  // Color theme configurations matching the Level Selection page styles
  const LEVEL_THEMES: Record<string, {
    bgBanner: string;
    iconBg: string;
    textPrimary: string;
    borderPrimary: string;
    progressGlow: string;
    qIndexStyle: string;
    explainHeader: string;
    explainBg: string;
    nextBtnActive: string;
    accentGlow: string;
    badgeStyle: string;
    btnOutline: string;
  }> = {
    "level-1": {
      bgBanner: "from-emerald-50 to-slate-50",
      iconBg: "bg-emerald-600",
      textPrimary: "text-emerald-600",
      borderPrimary: "border-emerald-600",
      progressGlow: "from-emerald-500 to-emerald-600",
      qIndexStyle: "text-emerald-600 bg-emerald-50 border-emerald-100",
      explainHeader: "text-emerald-700",
      explainBg: "bg-emerald-50/40 border-emerald-100/70",
      nextBtnActive: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 active:scale-95",
      accentGlow: "shadow-emerald-100 ring-emerald-500/10",
      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-150",
      btnOutline: "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
    },
    "level-2": {
      bgBanner: "from-indigo-50 to-slate-50",
      iconBg: "bg-indigo-600",
      textPrimary: "text-indigo-605",
      borderPrimary: "border-indigo-600",
      progressGlow: "from-indigo-500 to-indigo-600",
      qIndexStyle: "text-indigo-600 bg-indigo-50 border-indigo-100",
      explainHeader: "text-indigo-700",
      explainBg: "bg-indigo-50/40 border-indigo-100/70",
      nextBtnActive: "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 active:scale-95",
      accentGlow: "shadow-indigo-100 ring-indigo-500/10",
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-150",
      btnOutline: "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
    },
    "level-3": {
      bgBanner: "from-amber-50 to-slate-50",
      iconBg: "bg-amber-600",
      textPrimary: "text-amber-600",
      borderPrimary: "border-amber-600",
      progressGlow: "from-amber-500 to-amber-600",
      qIndexStyle: "text-amber-600 bg-amber-50 border-amber-100",
      explainHeader: "text-amber-805",
      explainBg: "bg-amber-50/40 border-amber-100/70",
      nextBtnActive: "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 active:scale-95",
      accentGlow: "shadow-amber-100 ring-amber-500/10",
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-150",
      btnOutline: "border-amber-200 text-amber-700 hover:bg-amber-50"
    }
  };

  const themeConfig = LEVEL_THEMES[activeLevelId] || LEVEL_THEMES["level-1"];

  // Core application states
  const [allQuestions, setAllQuestions] = useState<IC3Question[]>([]);
  
  // Custom screen routing
  const [appMode, setAppMode] = useState<"menu" | "training" | "testing" | "result">("menu");
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<"training" | "testing">("training");
  const [selectedSubSet, setSelectedSubSet] = useState<string | null>(null);

  // Stopwatch timer state
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Active question answers for currently selected set
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  // For training mode: lock in and show results for individual question
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  // Flagged questions marked for review later
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  // Open/close dropdown selection of questions
  const [showQuestionDropdown, setShowQuestionDropdown] = useState(false);
  // Show/hide custom modal confirmation for exit
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Result assessment metrics
  const [examResults, setExamResults] = useState<{
    correctCount: number;
    wrongCount: number;
    totalCount: number;
    timeTaken: number;
    scorePercent: number;
  } | null>(null);

  // Keep random pool of definitions for matching question type
  const [matchingPool, setMatchingPool] = useState<{ id: string; text: string; image?: string }[]>([]);
  const [selectedPoolDef, setSelectedPoolDef] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const checkIfQuestionIsCorrect = (question: IC3Question, ans: string | undefined): boolean => {
    if (!ans) return false;
    if (question.type === "matching") {
      try {
        const parsed = JSON.parse(ans) as Record<string, string>;
        if (!question.pairs) return false;
        // Verify every pair is correct
        for (const p of question.pairs) {
          if (parsed[p.left] !== p.right) {
            return false;
          }
        }
        return true;
      } catch (e) {
        return false;
      }
    }
    if (question.type === "multiple_choice" && question.correctKeys && question.correctKeys.length > 1) {
      const userSelected = ans.split(",").map((s) => s.trim()).filter(Boolean).sort();
      const targetSelected = [...question.correctKeys].sort();
      if (userSelected.length !== targetSelected.length) return false;
      return userSelected.every((k, i) => k === targetSelected[i]);
    }

    if (question.type === "yes_no") {
      const statementsList = (question.statements && question.statements.length > 0)
        ? question.statements
        : [
            {
              text: question.text,
              correct: (question.correctKeys?.[0] === "False" ? "False" : "True") as "True" | "False"
            }
          ];

      try {
        const parsed = JSON.parse(ans) as Record<string, string>;
        return statementsList.every(
          (statement, index) => parsed[String(index)] === statement.correct
        );
      } catch {
        return question.correctKeys?.includes(ans) || false;
      }
    }
    return question.correctKeys?.includes(ans) || false;
  };

  const handleSelectStatementAnswer = (
    question: IC3Question,
    statementIndex: number,
    value: "True" | "False"
  ) => {
    if (appMode === "training" && checkedQuestions[question.id]) {
      return;
    }
  
    setSelectedAnswers((prev) => {
      let current: Record<string, string> = {};
  
      try {
        if (prev[question.id]) {
          current = JSON.parse(prev[question.id]);
        }
      } catch {
        current = {};
      }
  
      current[String(statementIndex)] = value;
  
      return {
        ...prev,
        [question.id]: JSON.stringify(current)
      };
    });
  };


  const isManageMode = false;
  const editingQuestionId = null;
  const editForm = {
    text: "",
    type: "multiple_choice" as QuestionType,
    options: ["", "", "", ""],
    correctKeys: ["A"],
    correctAnswerText: "",
    explanation: ""
  };
  const setEditingQuestionId = (v: any) => {};
  const setEditForm = (v: any) => {};
  const handleSaveQuestionForm = (e: any) => {};
  const handleStartEdit = (a: any, b?: any) => {};
  const handleDeleteQuestion = (a: any) => {};
  const handleRestoreDefaults = () => {};

  // Dynamic Subsets choices matching user request (GM1, GM2, OT1, OT2, OT3, OT4, OT5, FULL)
  const SUBSETS: SubsetConfig[] = [
    { id: "GM1", name: "GM1" },
    { id: "GM2", name: "GM2" },
    { id: "OT1", name: "OT1" },
    { id: "OT2", name: "OT2" },
    { id: "OT3", name: "OT3" },
    { id: "OT4", name: "OT4" },
    { id: "OT5", name: "OT5" },
    { id: "FULL", name: "Tổng hợp FULL" }
  ];

  // Load questions directly from the static IC3_QUESTIONS file and customQuestions
  useEffect(() => {
    const merged = [
      ...IC3_QUESTIONS,
      ...(customQuestions || [])
    ];
    setAllQuestions(merged);
  }, [customQuestions]);

  // Filter questions for active level of the screen
  const levelQuestions = allQuestions.filter((q) => q.levelId === activeLevelId);

  // Divide base levelQuestions into the selected subset dynamically using the subsetId field directly
  const getSubsetQuestions = (subsetId: string, questionsList: IC3Question[]): IC3Question[] => {
    if (questionsList.length === 0) return [];
    if (subsetId === "FULL") return questionsList;
    return questionsList.filter((q) => q.subsetId === subsetId);
  };

  // Utility to shuffle an array (Fisher-Yates)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  // Utility to shuffle answer choices within an individual question
  const shuffleQuestionOptions = (question: IC3Question): IC3Question => {
    if (question.type === "multiple_choice" && question.options && question.options.length > 1) {
      const origOptions = question.options;
      const origCorrectKeys = question.correctKeys || [];

      // Map each option with its correctness state and cleaned text
      const parsed = origOptions.map((optStr, idx) => {
        const origLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D'...
        const isCorrect = origCorrectKeys.includes(origLetter) ||
          origCorrectKeys.some((k) => optStr.trim().startsWith(`${k}.`) || optStr.trim().startsWith(`${k} `) || optStr.trim() === k);
        const cleanText = optStr.replace(/^[A-J][\.\:\)]\s*/i, "").trim();
        return {
          cleanText,
          isCorrect
        };
      });

      // Shuffle the options array
      const shuffled = shuffleArray(parsed);

      // Reassign new letters (A, B, C, D...) and compute new correct keys
      const newOptions: string[] = [];
      const newCorrectKeys: string[] = [];
      const correctItems: string[] = [];

      shuffled.forEach((item, newIdx) => {
        const newLetter = String.fromCharCode(65 + newIdx);
        newOptions.push(`${newLetter}. ${item.cleanText}`);
        if (item.isCorrect) {
          newCorrectKeys.push(newLetter);
          correctItems.push(`${newLetter}. ${item.cleanText}`);
        }
      });

      const finalCorrectKeys = newCorrectKeys.length > 0 ? newCorrectKeys : origCorrectKeys;
      const finalAnswerText = correctItems.length > 0 ? correctItems.join(" | ") : question.correctAnswerText;

      return {
        ...question,
        options: newOptions,
        correctKeys: finalCorrectKeys,
        correctAnswerText: finalAnswerText
      };
    }

    if (question.type === "matching" && question.pairs && question.pairs.length > 1) {
      return {
        ...question,
        pairs: shuffleArray(question.pairs)
      };
    }

    if (question.type === "yes_no" && question.statements && question.statements.length > 1) {
      const shuffledStatements = shuffleArray(question.statements);
      const newAnswerText = shuffledStatements
        .map((s, idx) => `${idx + 1}. ${s.correct === "True" ? "Đúng" : "Sai"}`)
        .join("\n");
      return {
        ...question,
        statements: shuffledStatements,
        correctAnswerText: newAnswerText
      };
    }

    return { ...question };
  };

  // Prepared session questions (ordered for training, shuffled for testing; choices shuffled for both)
  const [sessionQuestions, setSessionQuestions] = useState<IC3Question[]>([]);

  // Active subset of questions being presented
  const activeQuestions = (appMode !== "menu" && sessionQuestions.length > 0)
    ? sessionQuestions
    : (selectedSubSet ? getSubsetQuestions(selectedSubSet, levelQuestions) : []);

  // Question navigation pointers
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = Math.min(currentIndex, Math.max(0, activeQuestions.length - 1));

  // Slide animation direction (-1 for left, 1 for right)
  const [direction, setDirection] = useState(0);

  const qObj = activeQuestions[safeIndex];

  // Shuffle definitions when current matching question changes
  useEffect(() => {
    if (qObj && qObj.type === "matching" && qObj.pairs) {
      const shuffled = qObj.pairs.map((p, idx) => ({
        id: `def-${idx}`,
        text: p.right,
        image: p.rightImage
      })).sort(() => Math.random() - 0.5);
      setMatchingPool(shuffled);
      setSelectedPoolDef(null);
    } else {
      setMatchingPool([]);
      setSelectedPoolDef(null);
    }
  }, [qObj?.id]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, text: string) => {
    e.dataTransfer.setData("text/plain", text);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, leftText: string) => {
    e.preventDefault();
    const rightText = e.dataTransfer.getData("text/plain");
    if (rightText) {
      handleMatch(leftText, rightText);
    }
  };

  const handleMatch = (leftText: string, rightText: string) => {
    if (appMode === "training" && checkedQuestions[qObj?.id]) return;

    setSelectedAnswers((prev) => {
      const currentAnsStr = prev[qObj?.id];
      let currentMap: Record<string, string> = {};
      if (currentAnsStr) {
        try {
          currentMap = JSON.parse(currentAnsStr);
        } catch (err) {
          currentMap = {};
        }
      }

      // If already assigned to another term, remove it
      for (const [k, v] of Object.entries(currentMap)) {
        if (v === rightText) {
          delete currentMap[k];
        }
      }

      currentMap[leftText] = rightText;
      return {
        ...prev,
        [qObj?.id]: JSON.stringify(currentMap)
      };
    });
  };

  const handleUnmatch = (leftText: string) => {
    if (appMode === "training" && checkedQuestions[qObj?.id]) return;

    setSelectedAnswers((prev) => {
      const currentAnsStr = prev[qObj?.id];
      if (!currentAnsStr) return prev;
      try {
        const currentMap = JSON.parse(currentAnsStr);
        delete currentMap[leftText];
        
        const nextAnswers = { ...prev };
        if (Object.keys(currentMap).length > 0) {
          nextAnswers[qObj?.id] = JSON.stringify(currentMap);
        } else {
          delete nextAnswers[qObj?.id];
        }
        return nextAnswers;
      } catch (err) {
        return prev;
      }
    });
  };

  // Auto-scroll handler during drag-and-drop when mouse/drag reaches viewport boundary
  const handleDragAutoScroll = (e: React.DragEvent) => {
    if (!e.clientY || e.clientY <= 0) return;

    // Rate-limit auto-scroll trigger (at most once every 50ms) to avoid runaway scrolling
    const now = performance.now();
    if (now - lastScrollTimeRef.current < 50) return;

    // Greatly reduced sensitivity: only activate when cursor is within 45px of viewport edge
    const threshold = 45;
    const maxScrollStep = 6; // gentle step instead of 22px

    const clientY = e.clientY;
    const windowH = window.innerHeight;

    let step = 0;
    if (clientY > windowH - threshold) {
      const ratio = Math.min(1, (clientY - (windowH - threshold)) / threshold);
      step = Math.ceil(ratio * maxScrollStep);
    } else if (clientY < threshold) {
      const ratio = Math.min(1, (threshold - clientY) / threshold);
      step = -Math.ceil(ratio * maxScrollStep);
    }

    if (step !== 0) {
      lastScrollTimeRef.current = now;
      const mainContainer = document.querySelector("main");
      if (mainContainer && mainContainer.scrollHeight > mainContainer.clientHeight) {
        mainContainer.scrollTop += step;
      } else {
        window.scrollBy({ top: step, behavior: "auto" });
      }
    }
  };

  // Toggle or start stopwatch running timer
  useEffect(() => {
    if (isTimerActive) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive]);

  // Handle active sub-selection click
  const handleStartSubset = (subsetId: string) => {
    const rawList = getSubsetQuestions(subsetId, levelQuestions);

    // Sắp xếp thứ tự câu hỏi theo level và subset (dựa trên questionNumber hoặc order)
    const sortedList = [...rawList].sort((a, b) => {
      const numA = typeof a.questionNumber === "number" ? a.questionNumber : (typeof a.order === "number" ? a.order : 999999);
      const numB = typeof b.questionNumber === "number" ? b.questionNumber : (typeof b.order === "number" ? b.order : 999999);
      return numA - numB;
    });

    let prepared: IC3Question[];
    if (selectedPracticeMode === "training") {
      // Training: Giữ nguyên số thứ tự của câu hỏi, xáo trộn thứ tự các câu trả lời trong từng câu
      prepared = sortedList.map((q) => shuffleQuestionOptions(q));
    } else {
      // Testing: Xáo trộn cả số thứ tự câu hỏi và thứ tự các câu trả lời trong từng câu
      prepared = shuffleArray(sortedList).map((q) => shuffleQuestionOptions(q));
    }

    setSessionQuestions(prepared);
    setSelectedSubSet(subsetId);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setCheckedQuestions({});
    setFlaggedQuestions({});
    setShowQuestionDropdown(false);
    setTimeElapsed(0);
    setIsTimerActive(true);
    setExamResults(null);
    setAppMode(selectedPracticeMode);
  };

  // Human read layout timer converter: "02:15"
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Reset page index if active level changes or if the safe index shifts
  useEffect(() => {
    setAppMode("menu");
    setSelectedSubSet(null);
    setIsTimerActive(false);
    setTimeElapsed(0);
  }, [activeLevelId]);

  // Handle slide transitions
  const handleNext = () => {
    if (safeIndex < activeQuestions.length - 1) {
      setDirection(1);
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setDirection(-1);
      setCurrentIndex(safeIndex - 1);
    }
  };

  // Keyboard navigation & Enter key event handlers
  useEffect(() => {
    if (appMode === "menu" || appMode === "result") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.getAttribute("contenteditable") === "true"
      )) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Custom Enter behavior for Training: Check or Go to next
        if (appMode === "training" && activeQuestions.length > 0) {
          const q = activeQuestions[safeIndex];
          const hasSelected = selectedAnswers[q.id];
          if (hasSelected) {
            const isChecked = checkedQuestions[q.id];
            if (!isChecked) {
              handleCheckOptionTraining(q.id);
            } else {
              if (safeIndex < activeQuestions.length - 1) {
                handleNext();
              } else {
                handleFinishTraining();
              }
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [safeIndex, activeQuestions.length, selectedAnswers, checkedQuestions, appMode]);

  // Selecting answers
  const handleSelectOptionStore = (question: IC3Question, optionKey: string) => {
    // If working in locked training state, refuse edits
    if (appMode === "training" && checkedQuestions[question.id]) {
      return;
    }
    setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionKey }));
  };

  // Submit/Check button specifically for Training mode (Instant feedback)
  const handleCheckOptionTraining = (qId: string) => {
    setCheckedQuestions((prev) => ({ ...prev, [qId]: true }));
  };

  // Reset training mode question to retake
  const handleResetQuestionTraining = (qId: string) => {
    setSelectedAnswers((prev) => {
      const c = { ...prev };
      delete c[qId];
      return c;
    });
    setCheckedQuestions((prev) => {
      const c = { ...prev };
      delete c[qId];
      return c;
    });
  };

  // Submit ALL Training questions
  const handleFinishTraining = () => {
    setIsTimerActive(false);
    
    // Evaluate scores
    let correct = 0;
    let wrong = 0;
    activeQuestions.forEach((q) => {
      const ans = selectedAnswers[q.id];
      if (ans && checkIfQuestionIsCorrect(q, ans)) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const resultPayload = {
      correctCount: correct,
      wrongCount: wrong,
      totalCount: activeQuestions.length,
      timeTaken: timeElapsed,
      scorePercent: Math.round((correct / activeQuestions.length) * 100)
    };

    setExamResults(resultPayload);
    setAppMode("result");

    if (currentUser) {
      apiService.recordExamResult({
        userId: currentUser.id,
        username: currentUser.username,
        studentName: currentUser.name,
        className: currentUser.className,
        school: currentUser.school,
        level: selectedLevel,
        subset: selectedSubSet || "ALL",
        mode: "training",
        correctCount: correct,
        wrongCount: wrong,
        totalCount: activeQuestions.length,
        scorePercent: resultPayload.scorePercent,
        timeTaken: timeElapsed
      }).catch((e) => console.warn("Could not save training exam record:", e));
    }
  };

  // Submit test in Testing mode
  const handleSubmitTestingExam = () => {
    const answeredCount = activeQuestions.filter((q) => selectedAnswers[q.id]).length;
    const unansweredCount = activeQuestions.length - answeredCount;

    if (unansweredCount > 0) {
      const ok = window.confirm(`Bạn còn ${unansweredCount} câu chưa hoàn thành lựa chọn. Bạn có chắc muốn nộp bài thi ngay bây giờ?`);
      if (!ok) return;
    }

    setIsTimerActive(false);

    // Score calculations
    let correct = 0;
    let wrong = 0;
    activeQuestions.forEach((q) => {
      const ans = selectedAnswers[q.id];
      if (ans && checkIfQuestionIsCorrect(q, ans)) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const resultPayload = {
      correctCount: correct,
      wrongCount: wrong,
      totalCount: activeQuestions.length,
      timeTaken: timeElapsed,
      scorePercent: Math.round((correct / activeQuestions.length) * 100)
    };

    setExamResults(resultPayload);
    setAppMode("result");

    if (currentUser) {
      apiService.recordExamResult({
        userId: currentUser.id,
        username: currentUser.username,
        studentName: currentUser.name,
        className: currentUser.className,
        school: currentUser.school,
        level: selectedLevel,
        subset: selectedSubSet || "ALL",
        mode: "testing",
        correctCount: correct,
        wrongCount: wrong,
        totalCount: activeQuestions.length,
        scorePercent: resultPayload.scorePercent,
        timeTaken: timeElapsed
      }).catch((e) => console.warn("Could not save testing exam record:", e));
    }
  };




  return (
    <div id="ic3-study-page-deck" className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      
      {/* ================= 🌟 TOP HEADER BANNER ================= */}
      <div className={`bg-gradient-to-r ${themeConfig.bgBanner} border-b-2 border-slate-300 p-5`}>
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${themeConfig.iconBg} rounded-xl flex items-center justify-center text-white shadow-md shrink-0`}>
              <BookOpenCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-md font-black text-slate-900 uppercase tracking-widest font-mono leading-none">
                {selectedLevel.toUpperCase()}{selectedSubSet ? ` • ĐỀ ${selectedSubSet}` : ""}
              </h3>
            </div>
          </div>
          
          {/* Dynamic state widgets */}
          <div className="flex items-center gap-2.5">
            {/* Running timer stopwatch */}
            {isTimerActive && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs px-3 py-1.5 rounded-lg shadow-sm font-black">
                <Timer className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                <span>{formatTimer(timeElapsed)}</span>
              </div>
            )}

            {/* active index indicator / dropdown */}
            {appMode !== "menu" && appMode !== "result" && activeQuestions.length > 0 && (
              <div className="relative" id="question-select-dropdown">
                <button
                  type="button"
                  onClick={() => setShowQuestionDropdown(!showQuestionDropdown)}
                  className="flex items-center gap-2 shrink-0 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 text-slate-700 font-mono text-xs font-bold"
                >
                  <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">Câu hỏi:</span>
                  <span className={`text-sm font-black ${themeConfig.textPrimary}`}>{safeIndex + 1}</span>
                  <span className="text-slate-300 font-light">/</span>
                  <span className="text-xs font-black text-slate-600">{activeQuestions.length}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-pulse" />
                </button>

                {showQuestionDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setShowQuestionDropdown(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-30 font-sans divide-y divide-slate-100">
                      <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50 sticky top-0 border-b border-slate-100 z-10 flex items-center justify-between">
                        <span>Danh sách câu hỏi</span>
                        <span>{activeQuestions.length} câu</span>
                      </div>
                      {activeQuestions.map((q, idx) => {
                        const isCurrent = idx === safeIndex;
                        const isFlagged = flaggedQuestions[q.id];
                        const isAnswered = !!selectedAnswers[q.id];
                        
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setDirection(idx > safeIndex ? 1 : -1);
                              setCurrentIndex(idx);
                              setShowQuestionDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between gap-2 hover:bg-slate-50 ${
                              isCurrent 
                                ? "bg-indigo-50/40 text-indigo-900 font-bold" 
                                : "text-slate-700 font-semibold"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                isAnswered 
                                  ? "bg-emerald-500 shadow-sm" 
                                  : "bg-slate-200"
                              }`} title={isAnswered ? "Đã làm" : "Chưa làm"} />
                              
                              <span className="font-mono text-[11px] text-slate-500 shrink-0">
                                Câu {idx + 1}:
                              </span>
                              
                              <span className="truncate text-slate-600 font-medium">
                                {q.text}
                              </span>
                            </div>
                            
                            {isFlagged && (
                              <Flag className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Back to dashboard option of subset */}
            {appMode !== "menu" && (
              <button
                type="button"
                onClick={() => {
                  if (appMode !== "result") {
                    setShowExitConfirm(true);
                  } else {
                    setAppMode("menu");
                    setSelectedSubSet(null);
                    setIsTimerActive(false);
                    setTimeElapsed(0);
                  }
                }}
                className="text-xs font-black uppercase text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-805 px-3 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 font-mono"
              >
                <X className="w-4 h-4 text-red-500" />
                <span>Thoát</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= ⚙️ QUESTION MANAGER SYSTEM SCREEN ================= */}
      {isManageMode ? (
        <div className="p-6 flex-1 min-h-[400px] space-y-4 max-h-[600px] overflow-y-auto bg-slate-50/30">
          {editingQuestionId ? (
            /* Forms definition to add/edit question objects */
            <form onSubmit={handleSaveQuestionForm} className="space-y-4 bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-black text-slate-805 uppercase flex items-center gap-1.5 font-mono text-indigo-600">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>{editingQuestionId === "new" ? "Soạn thảo câu hỏi mới" : "Chỉnh sửa câu hỏi hiện hữu"}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingQuestionId(null)}
                  className="p-1 text-slate-400 hover:text-slate-650"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Text Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block">Câu hỏi (Viếng Việt):</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.text}
                  onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi muốn lập..."
                  className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Selection grid mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block">Loại hình:</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setEditForm({
                        ...editForm,
                        type: t,
                        correctKeys: t === "yes_no" ? ["True"] : ["A"]
                      });
                    }}
                    className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="multiple_choice">Trắc nghiệm dạng MCQ</option>
                    <option value="yes_no">Phán đoán Đúng / Sai (T/F)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-450 block">Nhãn đáp án đúng:</label>
                  {editForm.type === "multiple_choice" ? (
                    <select
                      value={editForm.correctKeys[0]}
                      onChange={(e) => setEditForm({ ...editForm, correctKeys: [e.target.value] })}
                      className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="A">Phương án A</option>
                      <option value="B">Phương án B</option>
                      <option value="C">Phương án C</option>
                      <option value="D">Phương án D</option>
                    </select>
                  ) : (
                    <select
                      value={editForm.correctKeys[0]}
                      onChange={(e) => setEditForm({ ...editForm, correctKeys: [e.target.value] })}
                      className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="True">ĐÚNG (True)</option>
                      <option value="False">SAI (False)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Sub option text box renders */}
              {editForm.type === "multiple_choice" && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block pb-1 border-b border-slate-100">
                    Nội dung các phương án:
                  </span>
                  {[0, 1, 2, 3].map((idx) => {
                    const char = String.fromCharCode(65 + idx);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {char}
                        </span>
                        <input
                          type="text"
                          required
                          value={editForm.options[idx] || ""}
                          onChange={(e) => {
                            const c = [...editForm.options];
                            c[idx] = e.target.value;
                            setEditForm({ ...editForm, options: c });
                          }}
                          placeholder={`Nhập mô tả cho phương án ${char}...`}
                          className="flex-1 text-xs font-semibold p-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanations */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-450 block">Lời giải tích tóm lược lý thuyết:</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                  placeholder="Mẹo ghi nhớ lý thuyết chuẩn IC3..."
                  className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingQuestionId(null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold font-mono text-slate-500 hover:text-slate-705 bg-slate-100 hover:bg-slate-200 transition"
                >
                  XÓA BỎ / HỦY BỎ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider font-mono text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" />
                  LƯU HOÀN TẤT
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono">
                  Ngân hàng chuyên đề: {levelQuestions.length} câu hiện tại
                </span>
                <button
                  type="button"
                  onClick={() => handleStartEdit("new")}
                  className="bg-indigo-605 hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-2 rounded-lg flex items-center gap-1.5 uppercase transition tracking-wide font-mono shadow-md"
                >
                  <Plus className="w-4 h-4" /> Thêm câu hỏi mới
                </button>
              </div>

              {levelQuestions.length === 0 ? (
                <div className="text-center p-12 bg-slate-50 border border-dashed border-slate-205 rounded-xl text-xs text-slate-400 font-bold">
                  Không tìm thấy nội dung câu hỏi. Hãy nhấn nút để tự đóng góp dữ liệu!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {levelQuestions.map((item, index) => (
                    <div key={item.id} className="p-3.5 bg-white border border-slate-200 hover:border-indigo-200 rounded-lg flex items-start gap-3 transition">
                      <span className="w-6 h-6 bg-slate-100 border border-slate-205 text-xs text-slate-500 font-bold rounded-md flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{item.text}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase font-mono px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-500">
                            {item.type === "multiple_choice" ? "TRẮC NGHIỆM" : "ĐÚNG / SAI"}
                          </span>
                          <span className="text-[9px] font-extrabold text-emerald-600 font-mono">
                            Khóa ĐA: {item.correctKeys?.join(", ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item.id, item)}
                          className="p-1.5 hover:bg-slate-100 rounded text-sky-650 transition"
                          title="Sửa nội dung"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500 transition"
                          title="Xóa câu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-[10px] text-slate-400 font-semibold max-w-sm">
                  *Ngân hàng câu hỏi được quản trị cục bộ trên trình duyệt của riêng học sinh.
                </span>
                
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="text-[10px] font-black text-slate-500 hover:text-amber-700 flex items-center gap-1.5 font-mono transition border border-dashed border-slate-200 hover:border-amber-200 bg-white px-3 py-2 rounded-lg"
                >
                  <Undo2 className="w-4 h-4" />
                  KHÔI PHỤC NGÂN HÀNG GỐC
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= 🎓 CHÍNH THỨC PANEL CHỌN CHẾ ĐỘ & 6 SUBSETS ================= */
        <div className="flex-1 flex flex-col bg-[#f0f3f8] min-h-[420px]">
          {appMode === "menu" && (
            <div className="p-6 md:p-8 space-y-8 flex-1 flex flex-col justify-center">
              
              {/* UPPER SECTION: PRACTICE MODAL CHOOSER */}
              <div className="text-center space-y-3.5 max-w-xl mx-auto">
                <span className="text-xs font-black tracking-widest font-mono text-indigo-700 uppercase bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-block shadow-xs">
                  BƯỚC 1: CHỌN CHẾ ĐỘ ÔN TẬP
                </span>
                
                <div className="inline-flex bg-slate-200/90 p-1.5 rounded-2xl border-2 border-slate-300 w-full max-w-lg shadow-inner">
                  <button
                    type="button"
                    onClick={() => setSelectedPracticeMode("training")}
                    className={`flex-1 flex flex-col items-center justify-center py-3.5 px-4 rounded-xl transition duration-150 relative cursor-pointer ${
                      selectedPracticeMode === "training"
                        ? `bg-white shadow-md text-slate-950 border-2 border-indigo-600 font-black`
                        : "text-slate-700 hover:text-slate-950 hover:bg-white/60 font-bold"
                    }`}
                  >
                    {/* Tick icon indicator for active mode */}
                    {selectedPracticeMode === "training" && (
                      <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${themeConfig.iconBg}`} />
                    )}
                    <span className="text-sm md:text-base font-black uppercase font-mono tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      TRAINING
                    </span>
                    <span className={`text-xs font-bold mt-1 sm:block hidden leading-none ${
                      selectedPracticeMode === "training" ? "text-slate-700" : "text-slate-600"
                    }`}>
                      Xem đáp án ngay khi chọn câu
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPracticeMode("testing")}
                    className={`flex-1 flex flex-col items-center justify-center py-3.5 px-4 rounded-xl transition duration-150 relative cursor-pointer ${
                      selectedPracticeMode === "testing"
                        ? `bg-white shadow-md text-slate-950 border-2 border-indigo-600 font-black`
                        : "text-slate-700 hover:text-slate-950 hover:bg-white/60 font-bold"
                    }`}
                  >
                    {selectedPracticeMode === "testing" && (
                      <div className={`absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full ${themeConfig.iconBg}`} />
                    )}
                    <span className="text-sm md:text-base font-black uppercase font-mono tracking-wide flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-amber-600" />
                      TESTING
                    </span>
                    <span className={`text-xs font-bold mt-1 sm:block hidden leading-none ${
                      selectedPracticeMode === "testing" ? "text-slate-700" : "text-slate-600"
                    }`}>
                      Nộp bài biết tổng điểm
                    </span>
                  </button>
                </div>
              </div>

              {/* LOWER SECTION: THE DYNAMIC MODULE CHANNELS */}
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-xs font-black tracking-widest font-mono text-slate-800 uppercase">
                    BƯỚC 2: CHỌN ĐỀ THI ĐỂ BẮT ĐẦU
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {SUBSETS.map((sub) => {
                    const subsetQs = getSubsetQuestions(sub.id, levelQuestions);
                    const qCount = subsetQs.length;

                    return (
                      <div
                        key={sub.id}
                        id={`subset-card-${sub.id}`}
                        onClick={() => {
                          if (qCount === 0) {
                            alert("Chuyên mục ôn này chưa có câu hỏi. Nhấn biên soạn đề ở góc trên để bổ sung!");
                            return;
                          }
                          handleStartSubset(sub.id);
                        }}
                        className={`group bg-white border-2 border-slate-300 hover:border-indigo-600 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition duration-200 cursor-pointer relative overflow-hidden min-h-[130px] ${
                          qCount > 0 
                            ? "active:scale-[0.98]" 
                            : "opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div>
                          <h5 className="text-sm md:text-base font-black text-slate-950 group-hover:text-indigo-700 transition leading-snug">
                            {sub.name}
                          </h5>
                          <span className="inline-block text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1.5">
                            {qCount} câu hỏi
                          </span>
                        </div>

                        <div className="mt-auto pt-4">
                          <button
                            type="button"
                            className={`w-full py-2.5 px-3 rounded-xl font-black text-xs md:text-sm uppercase font-mono tracking-wider transition ${themeConfig.nextBtnActive} shadow-sm text-white cursor-pointer`}
                          >
                            BẮT ĐẦU
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ================= 📖 ACTIVE TRAINING OR TESTING EXAM SCREEN ================= */}
          {(appMode === "training" || appMode === "testing") && (() => {
            const q = activeQuestions[safeIndex];
            if (!q) return null;

            const userAns = selectedAnswers[q.id];
            const isUserCorrect = checkIfQuestionIsCorrect(q, userAns);
            const isChecked = checkedQuestions[q.id];

            // In Training and checked: reveal result.
            const showAnswerDetail = appMode === "training" && isChecked;

            // Stats calculation for both training and testing modes
            const answeredCount = activeQuestions.filter((item) => {
              const ans = selectedAnswers[item.id];
              if (!ans) return false;
              if (item.type === "yes_no") {
                try {
                  return Object.keys(JSON.parse(ans)).length > 0;
                } catch {
                  return false;
                }
              }
              if (item.type === "matching") {
                try {
                  return Object.keys(JSON.parse(ans)).length > 0;
                } catch {
                  return false;
                }
              }
              return true;
            }).length;
            const flaggedCount = activeQuestions.filter((item) => !!flaggedQuestions[item.id]).length;
            const unansweredCount = activeQuestions.length - answeredCount;

            const checkedCount = activeQuestions.filter((item) => !!checkedQuestions[item.id]).length;
            const correctTrainingCount = activeQuestions.filter((item) => {
              return !!checkedQuestions[item.id] && checkIfQuestionIsCorrect(item, selectedAnswers[item.id]);
            }).length;
            const wrongTrainingCount = checkedCount - correctTrainingCount;

            return (
              <div className="flex-grow flex flex-col lg:flex-row items-stretch">
                
                {/* LEFT COLUMN: QUESTION CONTENT AND ACTION CONTROLS */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  
                  {/* Main Content Area */}
                  <div className="p-4 sm:p-5 md:p-6 flex-1 relative overflow-y-auto min-h-[350px]">
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.div
                        key={q.id}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -direction * 50 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="space-y-4"
                      >
                        {/* Sub Mode Title Badge & Question Indicator */}
                        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block text-xs font-black uppercase font-mono px-3 py-1 rounded-md text-emerald-800 bg-emerald-50 border border-emerald-200`}>
                              {appMode === "training" ? "TRAINING (LUYỆN TẬP)" : "TESTING (THI THỬ)"}
                            </span>
                            <span className="text-xs font-mono font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                              Câu {safeIndex + 1}/{activeQuestions.length}
                            </span>
                            {appMode === "training" && (q.questionNumber || q.order) && (
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                                STT: #{q.questionNumber || q.order}
                              </span>
                            )}
                          </div>

                        {/* Flag to highlight button */}
                        <button
                          type="button"
                          onClick={() => {
                            setFlaggedQuestions((prev) => ({
                              ...prev,
                              [q.id]: !prev[q.id]
                            }));
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md border-2 text-xs font-bold font-mono transition active:scale-95 uppercase tracking-wide select-none cursor-pointer ${
                            flaggedQuestions[q.id]
                              ? "bg-rose-50 border-rose-300 text-rose-800 font-black"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <Flag className={`w-4 h-4 ${flaggedQuestions[q.id] ? "text-rose-600 fill-rose-600" : "text-slate-500"}`} />
                          <span>{flaggedQuestions[q.id] ? "Đã Đánh Dấu" : "Đánh Dấu"}</span>
                        </button>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-2">
                        <div className="bg-white border-2 border-slate-300 rounded-2xl p-5 text-sm md:text-base text-slate-950 leading-relaxed font-bold shadow-xs">
                          <p className="whitespace-pre-wrap leading-relaxed">{q.text}</p>
                          {q.image && (
                            <div className="mt-4 flex flex-col items-center justify-center">
                              <div className="relative group max-w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-50 p-1 shadow-xs">
                                <img
                                  src={q.image}
                                  alt="Hình ảnh minh họa câu hỏi"
                                  className="max-h-72 sm:max-h-84 md:max-h-96 w-auto max-w-full rounded-lg object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                                  onClick={() => setPreviewImage(q.image!)}
                                />
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900/75 text-white text-[10px] font-mono rounded-md backdrop-blur-xs flex items-center gap-1 pointer-events-none">
                                  <ZoomIn className="w-3 h-3" />
                                  <span>Bấm để phóng to</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Options rendering */}
                      {q.type === "multiple_choice" && q.options && (
                        <div className="space-y-2.5 pt-1">
                          {q.correctKeys && q.correctKeys.length > 1 ? (
                            <span className="text-xs font-black uppercase text-indigo-700 flex items-center gap-1.5 font-mono tracking-wider">
                              <Compass className="w-4 h-4 text-indigo-600" /> Vui lòng chọn TẤT CẢ các phương án đúng (chọn nhiều đáp án):
                            </span>
                          ) : (
                            <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 font-mono tracking-wider">
                              <Compass className="w-4 h-4 text-slate-600" /> Vui lòng chọn một phương án đáp án:
                            </span>
                          )}
                          
                          <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt, oIdx) => {
                              const letterKey = String.fromCharCode(65 + oIdx);
                              const isMulti = !!(q.correctKeys && q.correctKeys.length > 1);
                              const selectedKeysList = userAns
                                ? userAns.split(",").map((s) => s.trim()).filter(Boolean)
                                : [];
                              const isSelected = isMulti
                                ? selectedKeysList.includes(letterKey)
                                : userAns === letterKey;
                              const isCorrectOption = q.correctKeys?.includes(letterKey);

                              let btnStyle = "border-slate-300 text-slate-900 bg-white hover:bg-slate-50 hover:border-indigo-400 font-semibold";
                              let circleStyle = "bg-slate-100 text-slate-800 border-slate-300 font-bold";

                              if (appMode === "training") {
                                if (isChecked) {
                                  // Highlight locked incorrect and correct answers clearly
                                  if (isCorrectOption) {
                                    btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold pointer-events-none";
                                    circleStyle = "bg-emerald-600 text-white border-emerald-600";
                                  } else if (isSelected) {
                                    btnStyle = "border-rose-400 bg-rose-50 text-rose-950 font-semibold pointer-events-none";
                                    circleStyle = "bg-rose-600 text-white border-rose-600";
                                  } else {
                                    btnStyle = "border-slate-200 text-slate-400 bg-slate-50/80 opacity-60 pointer-events-none";
                                    circleStyle = "bg-slate-100 text-slate-400 border-slate-200";
                                  }
                                } else {
                                  if (isSelected) {
                                    btnStyle = `border-indigo-600 bg-indigo-50/40 text-indigo-950 font-bold ring-2 ring-indigo-500/20`;
                                    circleStyle = "bg-indigo-600 text-white border-indigo-600";
                                  }
                                }
                              } else {
                                // Strictly Testing Mode: simple highlighted active style, no reveals
                                if (isSelected) {
                                  btnStyle = "border-indigo-600 bg-indigo-50/40 text-slate-950 font-bold ring-2 ring-indigo-500/20";
                                  circleStyle = "bg-indigo-600 text-white border-indigo-600";
                                }
                              }

                              const handleOptionClick = () => {
                                if (appMode === "training" && isChecked) return;
                                if (isMulti) {
                                  let updated: string[];
                                  if (selectedKeysList.includes(letterKey)) {
                                    updated = selectedKeysList.filter((k) => k !== letterKey);
                                  } else {
                                    updated = [...selectedKeysList, letterKey].sort();
                                  }
                                  const newVal = updated.join(", ");
                                  setSelectedAnswers((prev) => {
                                    const next = { ...prev };
                                    if (newVal) {
                                      next[q.id] = newVal;
                                    } else {
                                      delete next[q.id];
                                    }
                                    return next;
                                  });
                                } else {
                                  handleSelectOptionStore(q, letterKey);
                                }
                              };

                              return (
                                <button
                                  key={letterKey}
                                  type="button"
                                  onClick={handleOptionClick}
                                  className={`flex items-center gap-3.5 w-full text-left p-3.5 rounded-xl border-2 text-xs md:text-sm transition active:scale-[0.99] focus:outline-none cursor-pointer shadow-xs ${btnStyle}`}
                                >
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs border shrink-0 ${circleStyle}`}>
                                    {letterKey}
                                  </span>
                                  <span className="flex-1 leading-relaxed break-words">{opt.replace(/^[A-J][\.\:\)]\s*/i, "")}</span>
                                  {isMulti && (
                                    <span
                                      className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 transition ${
                                        isSelected
                                          ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                                          : "border-slate-400 bg-white text-transparent"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* True/False Yes/No 
                      {q.type === "yes_no" && (
                        <div className="space-y-2.5 pt-1">
                          <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 font-mono tracking-wider">
                            <Compass className="w-4 h-4 text-slate-600" /> PHÁN ĐOÁN ĐÚNG HOẶC SAI:
                          </span>
                          
                          <div className="grid grid-cols-2 gap-3.5">
                            {["True", "False"].map((btnVal) => {
                              const vText = btnVal === "True" ? "ĐÚNG (True)" : "SAI (False)";
                              const isSelected = userAns === btnVal;
                              const isCorrectVal = q.correctKeys?.includes(btnVal);

                              let btnStyle = "border-slate-300 text-slate-900 bg-white hover:bg-slate-50 font-bold";

                              if (appMode === "training") {
                                if (isChecked) {
                                  if (isCorrectVal) {
                                    btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold pointer-events-none";
                                  } else if (isSelected) {
                                    btnStyle = "border-rose-400 bg-rose-50 text-rose-950 font-semibold pointer-events-none";
                                  } else {
                                    btnStyle = "border-slate-200 text-slate-400 bg-slate-50/80 opacity-60 pointer-events-none";
                                  }
                                } else {
                                  if (isSelected) {
                                    btnStyle = "border-indigo-600 bg-indigo-50/40 text-indigo-950 font-extrabold ring-2 ring-indigo-500/20";
                                  }
                                }
                              } else {
                                if (isSelected) {
                                  btnStyle = "border-indigo-600 bg-indigo-50/40 text-slate-950 font-extrabold ring-2 ring-indigo-500/20";
                                }
                              }

                              return (
                                <button
                                  key={btnVal}
                                  type="button"
                                  onClick={() => handleSelectOptionStore(q, btnVal)}
                                  className={`py-4 rounded-xl border-2 text-xs md:text-sm font-black uppercase text-center transition tracking-wider focus:outline-none active:scale-[0.99] cursor-pointer shadow-xs ${btnStyle}`}
                                >
                                  {vText}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )} */}


                      {q.type === "yes_no" && (() => {
                        const statementsList = (q.statements && q.statements.length > 0)
                          ? q.statements
                          : [
                              {
                                text: q.text,
                                correct: (q.correctKeys?.[0] === "False" ? "False" : "True") as "True" | "False"
                              }
                            ];

                        return (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-slate-600" />
                              <span className="text-xs font-black uppercase text-slate-800 font-mono tracking-wider">
                                Hãy xác định các phát biểu sau là Đúng hay Sai:
                              </span>
                            </div>

                            <div className="overflow-hidden rounded-xl border-2 border-slate-300">
                              {/* HEADER */}
                              <div className="grid grid-cols-[1fr_75px_75px] sm:grid-cols-[1fr_90px_90px] bg-slate-100 border-b-2 border-slate-300">
                                <div className="p-3 font-black text-xs uppercase font-mono text-slate-800">
                                  Các phát biểu
                                </div>
                                <div className="p-3 text-center font-black text-xs uppercase font-mono text-emerald-700 border-l border-slate-300">
                                  Đúng
                                </div>
                                <div className="p-3 text-center font-black text-xs uppercase font-mono text-rose-700 border-l border-slate-300">
                                  Sai
                                </div>
                              </div>

                              {/* STATEMENTS */}
                              {statementsList.map((statement, index) => {
                                let parsedAnswer: Record<string, string> = {};
                                try {
                                  parsedAnswer = JSON.parse(userAns || "{}");
                                } catch {
                                  parsedAnswer = {};
                                }

                                const selectedValue = parsedAnswer[String(index)];
                                const isTrueSelected = selectedValue === "True";
                                const isFalseSelected = selectedValue === "False";
                                const isCorrectAnswer = statement.correct === selectedValue;

                                return (
                                  <div
                                    key={index}
                                    className={`grid grid-cols-[1fr_75px_75px] sm:grid-cols-[1fr_90px_90px] border-b border-slate-200 last:border-b-0 transition ${
                                      appMode === "training" && isChecked
                                        ? isCorrectAnswer
                                          ? "bg-emerald-50"
                                          : "bg-rose-50"
                                        : "bg-white"
                                    }`}
                                  >
                                    {/* STATEMENT */}
                                    <div className="p-3.5 sm:p-4 flex items-center min-w-0">
                                      <span className="mr-2.5 sm:mr-3 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-black font-mono shrink-0">
                                        {index + 1}
                                      </span>
                                      <span className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-900 break-words flex-1 min-w-0">
                                        {statement.text}
                                      </span>
                                    </div>

                                    {/* TRUE */}
                                    <div className="border-l border-slate-200 flex items-center justify-center p-2.5 sm:p-3">
                                      <button
                                        type="button"
                                        disabled={appMode === "training" && isChecked}
                                        onClick={() =>
                                          handleSelectStatementAnswer(q, index, "True")
                                        }
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border-2 flex items-center justify-center transition ${
                                          isTrueSelected
                                            ? "bg-emerald-600 border-emerald-600 text-white"
                                            : "bg-white border-slate-400 hover:border-emerald-500"
                                        } ${
                                          appMode === "training" && isChecked
                                            ? "cursor-not-allowed"
                                            : "cursor-pointer"
                                        }`}
                                      >
                                        {isTrueSelected && (
                                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                      </button>
                                    </div>

                                    {/* FALSE */}
                                    <div className="border-l border-slate-200 flex items-center justify-center p-2.5 sm:p-3">
                                      <button
                                        type="button"
                                        disabled={appMode === "training" && isChecked}
                                        onClick={() =>
                                          handleSelectStatementAnswer(q, index, "False")
                                        }
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border-2 flex items-center justify-center transition ${
                                          isFalseSelected
                                            ? "bg-rose-600 border-rose-600 text-white"
                                            : "bg-white border-slate-400 hover:border-rose-500"
                                        } ${
                                          appMode === "training" && isChecked
                                            ? "cursor-not-allowed"
                                            : "cursor-pointer"
                                        }`}
                                      >
                                        {isFalseSelected && (
                                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      

                      {/* Matching (Ghép nối / Kéo thả) Question Interface */}
                      {q.type === "matching" && q.pairs && (
                        <div className="space-y-4 pt-1">

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
                            {/* Left Column: Terms to Match */}
                            <div className="md:col-span-1 lg:col-span-7 space-y-3">
                              <span className="text-xs font-black text-slate-800 block uppercase font-mono tracking-wider">
                                DANH SÁCH THUẬT NGỮ ({q.pairs.length})
                              </span>
                              {q.pairs.map((pair) => {
                                const matchedDef = (() => {
                                  try {
                                    const parsed = JSON.parse(userAns || "{}");
                                    return parsed[pair.left] as string | undefined;
                                  } catch (e) {
                                    return undefined;
                                  }
                                })();

                                const isThisPairCorrect = matchedDef === pair.right;

                                // Style drop area
                                let slotStyle = "border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400";
                                if (matchedDef) {
                                  slotStyle = "border-solid border-2 border-indigo-500 bg-white shadow-xs";
                                }

                                if (appMode === "training" && isChecked) {
                                  // Reveal colors on submit
                                  if (isThisPairCorrect) {
                                    slotStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold pointer-events-none";
                                  } else {
                                    slotStyle = "border-rose-400 bg-rose-50 text-rose-950 font-semibold pointer-events-none";
                                  }
                                }

                                return (
                                  <div 
                                    key={pair.left} 
                                    className="flex flex-col sm:flex-row items-stretch gap-2.5 bg-white p-3 rounded-xl border-2 border-slate-200 transition-all hover:border-slate-300 shadow-xs"
                                    onDragOver={(e) => {
                                      handleDragOver(e);
                                      handleDragAutoScroll(e);
                                    }}
                                    onDrop={(e) => handleDrop(e, pair.left)}
                                  >
                                    {/* Term description */}
                                    <div className="sm:w-1/3 min-w-[105px] flex flex-col items-center justify-center p-2.5 bg-indigo-600 text-white rounded-lg shadow-xs shrink-0 font-mono font-bold text-xs sm:text-sm text-center break-words gap-1.5">
                                      {pair.leftImage && (
                                        <img
                                          src={pair.leftImage}
                                          alt={pair.left}
                                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-contain bg-white/15 p-0.5 border border-white/25 cursor-pointer hover:opacity-90 transition"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage(pair.leftImage!);
                                          }}
                                          title="Bấm để phóng to ảnh"
                                        />
                                      )}
                                      <span>{pair.left}</span>
                                    </div>

                                    {/* Matching drop area/slot */}
                                    <div 
                                      onClick={() => {
                                        if (appMode === "training" && isChecked) return;
                                        if (selectedPoolDef) {
                                          handleMatch(pair.left, selectedPoolDef);
                                          setSelectedPoolDef(null); // Reset selection
                                        } else if (matchedDef) {
                                          handleUnmatch(pair.left);
                                        }
                                      }}
                                      className={`flex-1 min-h-[58px] p-2.5 rounded-lg border text-xs sm:text-sm leading-relaxed cursor-pointer transition flex items-center justify-between gap-2.5 relative select-none break-words ${slotStyle}`}
                                    >
                                      {matchedDef ? (
                                        <>
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {(() => {
                                              const matchedPairObj = q.pairs.find(p => p.right === matchedDef);
                                              if (matchedPairObj?.rightImage) {
                                                return (
                                                  <img
                                                    src={matchedPairObj.rightImage}
                                                    alt={matchedDef}
                                                    className="w-10 h-10 rounded-md object-contain bg-slate-100 border border-slate-300 p-0.5 shrink-0 cursor-pointer hover:opacity-90"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setPreviewImage(matchedPairObj.rightImage!);
                                                    }}
                                                    title="Bấm để phóng to ảnh"
                                                  />
                                                );
                                              }
                                              return null;
                                            })()}
                                            <span className="flex-1 font-bold text-slate-950 break-words">{matchedDef}</span>
                                          </div>
                                          {!(appMode === "training" && isChecked) && (
                                            <button 
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnmatch(pair.left);
                                              }}
                                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-red-600 rounded transition shrink-0 cursor-pointer"
                                              title="Gỡ ghép nối"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <div className="w-full flex items-center justify-center gap-1.5 py-2 text-slate-500 font-semibold italic text-xs text-center">
                                          <span>{selectedPoolDef ? "👉 Nhấp để thả định nghĩa đã chọn" : "🫳 Thả định nghĩa vào đây"}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Right Column: Unassigned pool of definitions */}
                            <div className="md:col-span-1 lg:col-span-5 flex flex-col space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800 block uppercase font-mono tracking-wider">
                                  ĐỊNH NGHĨA CHỜ GHÉP ({matchingPool.filter(p => {
                                    try {
                                      const parsed = JSON.parse(userAns || "{}");
                                      return !Object.values(parsed).includes(p.text);
                                    } catch (e) {
                                      return true;
                                    }
                                  }).length})
                                </span>
                                {selectedPoolDef && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPoolDef(null)}
                                    className="text-xs font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded border border-red-200 transition cursor-pointer"
                                  >
                                    Hủy chọn
                                  </button>
                                )}
                              </div>

                              <div className="text-[11px] font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex items-center gap-2">
                                <span>💡 <b>Mẹo:</b> Kéo thả hoặc nhấp chọn đáp án rồi nhấp vào ô thuật ngữ cần ghép!</span>
                              </div>

                              <div className="flex-1 space-y-2.5 max-h-[480px] overflow-y-auto pr-1 bg-slate-100 p-3 rounded-xl border-2 border-slate-300 min-h-[220px]">
                                {matchingPool.filter(p => {
                                  try {
                                    const parsed = JSON.parse(userAns || "{}");
                                    return !Object.values(parsed).includes(p.text);
                                  } catch (e) {
                                    return true;
                                  }
                                }).map((defItem) => {
                                  const isCurrentlySelected = selectedPoolDef === defItem.text;

                                  let itemClass = "border-2 border-slate-300 bg-white hover:border-indigo-400 hover:shadow-xs active:scale-[0.99] cursor-grab text-slate-900";
                                  if (isCurrentlySelected) {
                                    itemClass = "border-2 border-indigo-600 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs";
                                  }

                                  if (appMode === "training" && isChecked) {
                                    itemClass = "border-2 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed pointer-events-none";
                                  }

                                  return (
                                    <div
                                      key={defItem.id}
                                      draggable={!(appMode === "training" && isChecked)}
                                      onDragStart={(e) => handleDragStart(e, defItem.text)}
                                      onDrag={(e) => handleDragAutoScroll(e)}
                                      onClick={() => {
                                        if (appMode === "training" && isChecked) return;
                                        if (isCurrentlySelected) {
                                          setSelectedPoolDef(null);
                                        } else {
                                          setSelectedPoolDef(defItem.text);
                                        }
                                      }}
                                      className={`p-2.5 sm:p-3 rounded-xl border text-xs md:text-sm leading-relaxed font-semibold transition flex items-center justify-between gap-3 shadow-xs select-none ${itemClass}`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        {defItem.image && (
                                          <img
                                            src={defItem.image}
                                            alt={defItem.text}
                                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-slate-300 object-contain bg-slate-50 p-0.5 shrink-0 cursor-pointer hover:opacity-90"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewImage(defItem.image!);
                                            }}
                                            title="Bấm để phóng to ảnh"
                                          />
                                        )}
                                        <span className="flex-1 break-words">{defItem.text}</span>
                                      </div>
                                      {!(appMode === "training" && isChecked) && (
                                        <div className="w-5 h-5 bg-slate-100 rounded border border-slate-300 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                                          ⠿
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {matchingPool.filter(p => {
                                  try {
                                    const parsed = JSON.parse(userAns || "{}");
                                    return !Object.values(parsed).includes(p.text);
                                  } catch (e) {
                                    return true;
                                  }
                                }).length === 0 && (
                                  <div className="py-12 px-4 text-center text-slate-500 text-xs italic font-medium leading-relaxed">
                                    🌟 Bạn đã phân bổ toàn bộ định nghĩa!<br/>Hãy nộp bài hoặc nhấn dấu <span className="font-bold text-red-600">✕</span> ở đáp án đã ghép để đổi ý.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Visual Feedback on Answer Selection in Training Mode */}
                      {appMode === "training" && isChecked && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border-2 text-xs md:text-sm shadow-xs ${
                            isUserCorrect 
                              ? "bg-emerald-50 text-emerald-950 border-emerald-400" 
                              : "bg-rose-50 text-rose-950 border-rose-400"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {isUserCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-1">
                              <p className={`font-black font-mono uppercase tracking-wider text-xs md:text-sm ${
                                isUserCorrect ? "text-emerald-900" : "text-rose-900"
                              }`}>
                                {isUserCorrect ? "ĐÚNG! 🎉" : "CHƯA CHÍNH XÁC!"}
                              </p>
                              <p className="font-bold text-slate-900 leading-relaxed text-xs md:text-sm">
                                <span className="font-black text-indigo-900">Đáp án đúng:</span> {q.correctAnswerText}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom Footer Action Controllers */}
                <div className="bg-white border-t-2 border-slate-300 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                  
                  {/* Left Side: Specific controls like submitting answers in training */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safeIndex === 0}
                      onClick={handlePrev}
                      className={`flex items-center gap-1.5 text-xs md:text-sm font-black uppercase px-4 py-2.5 rounded-xl border-2 font-mono transition shadow-xs cursor-pointer ${
                        safeIndex === 0 
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                          : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100 active:scale-95"
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      QUAY LẠI
                    </button>
                  </div>

                  {/* Right Side: Back - Next - Submit controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {appMode === "training" && userAns && !isChecked && (
                      <button
                        type="button"
                        onClick={() => handleCheckOptionTraining(q.id)}
                        className="text-xs md:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl font-mono transition shadow-sm flex items-center gap-1.5 active:scale-95 text-center uppercase cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Nộp bài [Enter]
                      </button>
                    )}

                    {/* Show Finish/Next Button accordingly */}
                    {safeIndex === activeQuestions.length - 1 ? (
                      appMode === "training" ? (
                        <button
                          type="button"
                          onClick={handleFinishTraining}
                          className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase font-mono transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          HOÀN THÀNH
                          <Award className="w-4 h-4 text-white" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSubmitTestingExam}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase font-mono transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          NỘP BÀI THI CHÍNH THỨC
                          <Award className="w-4 h-4 text-white" />
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className={`flex items-center gap-1.5 text-xs md:text-sm font-black uppercase px-5 py-2.5 rounded-xl border font-mono transition shadow-sm cursor-pointer ${themeConfig.nextBtnActive}`}
                      >
                        TIẾP THEO
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Hotkeys HUD guidance */}
                <div className="bg-slate-100 border-t border-slate-300 px-4 py-2.5 flex items-center justify-center gap-2 text-xs text-slate-700 font-semibold font-mono">
                  <Keyboard className="w-4 h-4 text-slate-600 shrink-0" />
                  {appMode === "training" ? (
                    <span>Mẹo: Ấn <kbd className="bg-white border border-slate-400 rounded px-1.5 py-0.5 text-slate-900 font-bold">Enter</kbd> lần 1 để nộp xem đáp án, ấn <kbd className="bg-white border border-slate-400 rounded px-1.5 py-0.5 text-slate-900 font-bold font-mono">Enter</kbd> lần 2 để qua câu tiếp theo!</span>
                  ) : (
                    <span>Bản đồ câu bên phải hỗ trợ nhấp chuột nhảy cóc nhanh. Dùng phím <kbd className="bg-white border border-slate-400 rounded px-1.5 py-0.5 text-slate-900 font-bold font-mono">←</kbd> <kbd className="bg-white border border-slate-400 rounded px-1.5 py-0.5 text-slate-900 font-bold font-mono">→</kbd> để đổi câu liên tục!</span>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: QUESTION GRID SIDEBAR FOR BOTH TRAINING & TESTING MODES */}
              {(appMode === "testing" || appMode === "training") && (
                <div className="w-full lg:w-72 xl:w-80 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-300 bg-slate-50/95 p-4 sm:p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
                  <div className="space-y-4">
                    {/* Title & Stats */}
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase font-mono tracking-wider text-slate-900">
                            Bản đồ câu hỏi
                          </h4>
                          <span className="text-[11px] font-bold text-slate-500 font-mono">
                            {appMode === "training"
                              ? `Đã nộp ${checkedCount}/${activeQuestions.length} câu`
                              : `Đã làm ${answeredCount}/${activeQuestions.length} câu`}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 text-xs font-black font-mono">
                        {Math.round(((appMode === "training" ? checkedCount : answeredCount) / (activeQuestions.length || 1)) * 100)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${appMode === "training" ? "bg-emerald-600" : "bg-indigo-600"} h-full rounded-full transition-all duration-300`}
                        style={{
                          width: `${((appMode === "training" ? checkedCount : answeredCount) / (activeQuestions.length || 1)) * 100}%`
                        }}
                      />
                    </div>

                    {/* Quick Summary Pill Counters */}
                    {appMode === "training" ? (
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono font-bold">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 py-1.5 px-0.5 rounded-lg">
                          Đúng: <span className="font-black">{correctTrainingCount}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 py-1.5 px-0.5 rounded-lg">
                          Sai: <span className="font-black">{wrongTrainingCount}</span>
                        </div>
                        <div className="bg-slate-100 border border-slate-300 text-slate-700 py-1.5 px-0.5 rounded-lg">
                          Chưa: <span className="font-black">{activeQuestions.length - checkedCount}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 py-1.5 px-0.5 rounded-lg">
                          Cờ: <span className="font-black">{flaggedCount}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono font-bold">
                        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 py-1.5 px-1 rounded-lg">
                          Đã làm: <span className="font-black">{answeredCount}</span>
                        </div>
                        <div className="bg-slate-100 border border-slate-300 text-slate-700 py-1.5 px-1 rounded-lg">
                          Chưa: <span className="font-black">{unansweredCount}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 py-1.5 px-1 rounded-lg">
                          Cờ: <span className="font-black">{flaggedCount}</span>
                        </div>
                      </div>
                    )}

                    {/* Grid of Questions */}
                    <div>
                      <span className="text-[10px] font-extrabold uppercase font-mono text-slate-500 block mb-2">
                        Danh sách câu hỏi (dạng lưới):
                      </span>
                      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[380px] lg:max-h-[440px] overflow-y-auto pr-1 py-1">
                        {activeQuestions.map((item, idx) => {
                          const ans = selectedAnswers[item.id];
                          let hasAns = !!ans;
                          if (item.type === "yes_no") {
                            try {
                              hasAns = Object.keys(JSON.parse(ans)).length > 0;
                            } catch {
                              hasAns = false;
                            }
                          }
                          if (item.type === "matching") {
                            try {
                              hasAns = Object.keys(JSON.parse(ans)).length > 0;
                            } catch {
                              hasAns = false;
                            }
                          }
                          const isActive = idx === safeIndex;
                          const isFlagged = !!flaggedQuestions[item.id];

                          let bubbleStyle = "bg-white text-slate-800 border-2 border-slate-300 hover:border-slate-400 font-bold hover:bg-slate-50";
                          if (isActive) {
                            bubbleStyle = "bg-indigo-100 border-2 border-indigo-600 text-indigo-950 font-black ring-2 ring-indigo-400 shadow-sm scale-105 z-10";
                          } else if (appMode === "training") {
                            const isCheckedItem = !!checkedQuestions[item.id];
                            if (isCheckedItem) {
                              const isCorrect = checkIfQuestionIsCorrect(item, selectedAnswers[item.id]);
                              if (isCorrect) {
                                bubbleStyle = "bg-emerald-600 text-white border-2 border-emerald-600 font-black shadow-xs hover:bg-emerald-700";
                              } else {
                                bubbleStyle = "bg-rose-600 text-white border-2 border-rose-600 font-black shadow-xs hover:bg-rose-700";
                              }
                            } else if (hasAns) {
                              bubbleStyle = "bg-indigo-600 text-white border-2 border-indigo-600 font-black shadow-xs hover:bg-indigo-700";
                            }
                          } else if (hasAns) {
                            bubbleStyle = "bg-indigo-600 text-white border-2 border-indigo-600 font-black shadow-xs hover:bg-indigo-700";
                          }

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setDirection(idx > safeIndex ? 1 : -1);
                                setCurrentIndex(idx);
                              }}
                              className={`h-9 rounded-xl border text-xs font-mono flex items-center justify-center transition active:scale-95 relative cursor-pointer ${bubbleStyle}`}
                              title={`Câu ${idx + 1}${hasAns ? " (Đã làm)" : " (Chưa làm)"}${isFlagged ? " - Đã gắn cờ" : ""}`}
                            >
                              <span>{idx + 1}</span>
                              {isFlagged && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white">
                                  🚩
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legend */}
                    {appMode === "training" ? (
                      <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11px] font-semibold text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-600 inline-block" />
                            Đúng
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-600 inline-block" />
                            Chưa đúng
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-600 inline-block" />
                            Đã chọn
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-white border-2 border-slate-300 inline-block" />
                            Chưa làm
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-indigo-100 border-2 border-indigo-600 inline-block" />
                            Đang xem
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block text-[8px] text-white text-center leading-3">🚩</span>
                            Đã gắn cờ
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11px] font-semibold text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-600 inline-block" />
                            Đã trả lời
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-white border-2 border-slate-300 inline-block" />
                            Chưa làm
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-indigo-100 border-2 border-indigo-600 inline-block" />
                            Đang xem
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block text-[8px] text-white text-center leading-3">🚩</span>
                            Đã gắn cờ
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Button at bottom of sidebar */}
                  <div className="mt-4 pt-3 border-t-2 border-slate-200">
                    {appMode === "training" ? (
                      <button
                        type="button"
                        onClick={handleFinishTraining}
                        className="w-full py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-black text-xs md:text-sm uppercase tracking-wide shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        HOÀN THÀNH BÀI ÔN ({checkedCount}/{activeQuestions.length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitTestingExam}
                        className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-xs md:text-sm uppercase tracking-wide shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        NỘP BÀI THI ({answeredCount}/{activeQuestions.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* ================= 📊 EXAM RESULTS AND REVIEW REPORT CARD SCREEN ================= */}
          {appMode === "result" && examResults && (
            <div className="p-6 md:p-8 space-y-8 max-h-[600px] overflow-y-auto">
              
              {/* Score breakdown segment panel */}
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm max-w-xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 shadow-inner">
                  <Award className="w-8 h-8 text-emerald-600" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black uppercase font-mono tracking-widest text-indigo-700">
                    KẾT QUẢ BÀI THI
                  </h4>
                  <p className="text-xs text-slate-600 font-bold font-mono uppercase tracking-wider">
                    {selectedSubSet} - {selectedPracticeMode === "training" ? "TRAINING" : "TESTING"}
                  </p>
                </div>

                {/* Score metrics grid */}
                <div className="grid grid-cols-3 gap-3.5 pt-2">
                  <div className="bg-emerald-50 border-2 border-emerald-300 p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-black uppercase font-mono text-emerald-900 block text-center">Câu Đúng</span>
                    <span className="text-xl font-black font-mono text-emerald-700 block text-center mt-1">{examResults.correctCount}</span>
                  </div>

                  <div className="bg-red-50 border-2 border-red-300 p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-black uppercase font-mono text-red-900 block text-center">Câu Sai</span>
                    <span className="text-xl font-black font-mono text-red-700 block text-center mt-1">{examResults.wrongCount}</span>
                  </div>

                  <div className="bg-slate-100 border-2 border-slate-300 p-3 rounded-xl shadow-xs">
                    <span className="text-xs font-black uppercase font-mono text-slate-800 block text-center">Thời Gian</span>
                    <span className="text-xl font-black font-mono text-slate-900 block text-center mt-1">{formatTimer(examResults.timeTaken)}</span>
                  </div>
                </div>

                {/* Control Panel buttons */}
                <div className="pt-4 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSubSet) {
                        handleStartSubset(selectedSubSet);
                      }
                    }}
                    className={`text-xs md:text-sm font-black uppercase font-mono px-5 py-2.5 rounded-xl border-2 flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer ${themeConfig.btnOutline}`}
                  >
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    Thi lại đề này
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAppMode("menu");
                      setSelectedSubSet(null);
                      setTimeElapsed(0);
                    }}
                    className="text-xs md:text-sm font-black uppercase font-mono px-5 py-2.5 rounded-xl text-white bg-slate-900 border-2 border-slate-900 hover:bg-slate-800 transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    Quay về danh sách đề
                  </button>
                </div>
              </div>

              {/* LIST REVIEW ACCORDION DETAIL CARDS */}
              <div className="space-y-4">
                <div className="border-b-2 border-slate-300 pb-2.5">
                  <h5 className="text-sm font-black uppercase tracking-widest font-mono text-slate-900 flex items-center gap-2">
                    <BookOpenCheck className="w-5 h-5 text-indigo-700" />
                    <span>Xem lại chi tiết bài làm:</span>
                  </h5>
                </div>

                <div className="space-y-4">
                  {activeQuestions.map((q, idx) => {
                    const ans = selectedAnswers[q.id];
                    const isCorrect = checkIfQuestionIsCorrect(q, ans);

                    return (
                      <div key={q.id} className="bg-white border-2 border-slate-300 rounded-2xl p-5 space-y-3 shadow-xs hover:border-slate-400 transition relative">
                        {/* Correct incorrect floating badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1">
                          {ans ? (
                            isCorrect ? (
                              <span className="flex items-center gap-1 text-xs font-black uppercase font-mono px-2.5 py-1 bg-emerald-50 text-emerald-800 border-2 border-emerald-300 rounded-lg">
                                <Check className="w-3.5 h-3.5" /> ĐÚNG
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-black uppercase font-mono px-2.5 py-1 bg-rose-50 text-rose-800 border-2 border-rose-300 rounded-lg">
                                <X className="w-3.5 h-3.5" /> SAI
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-black uppercase font-mono px-2.5 py-1 bg-slate-100 text-slate-600 border-2 border-slate-300 rounded-lg">
                              BỎ QUA
                            </span>
                          )}
                        </div>

                        {/* Title index */}
                        <span className="text-xs font-black font-mono tracking-wider text-slate-800 block">
                          CÂU HỎI {idx + 1}
                        </span>

                        {/* Text */}
                        <p className="text-sm md:text-base font-bold text-slate-950 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {q.text}
                        </p>

                        {/* MCQ answers breakdown */}
                        {q.type === "multiple_choice" && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {q.options.map((opt, oIdx) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isThisAnswerCorrect = q.correctKeys?.includes(letter);
                              const isThisAnswerUserChoice = ans === letter;

                              let cellStyle = "border-2 border-slate-300 text-slate-800 bg-white";
                              if (isThisAnswerCorrect) {
                                cellStyle = "border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
                              } else if (isThisAnswerUserChoice && !isThisAnswerCorrect) {
                                cellStyle = "border-2 border-rose-400 bg-rose-50 text-rose-950 line-through font-semibold";
                              }

                              return (
                                <div key={letter} className={`p-3 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-2.5 ${cellStyle}`}>
                                  <span className={`w-5.5 h-5.5 rounded flex items-center justify-center font-mono font-black text-xs shrink-0 border ${
                                    isThisAnswerCorrect 
                                      ? "bg-emerald-600 text-white border-emerald-600" 
                                      : isThisAnswerUserChoice 
                                        ? "bg-rose-600 text-white border-rose-600" 
                                        : "bg-slate-100 text-slate-700 border-slate-300"
                                  }`}>
                                    {letter}
                                  </span>
                                  <span className="flex-1 min-w-0">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Yes No answers breakdown */}
                        {q.type === "yes_no" && (
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            {["True", "False"].map((cellVal) => {
                              const cellText = cellVal === "True" ? "ĐÚNG (True)" : "SAI (False)";
                              const isThisAnswerCorrect = q.correctKeys?.includes(cellVal);
                              const isThisAnswerUserChoice = ans === cellVal;

                              let cellStyle = "border-2 border-slate-300 text-slate-800 bg-white";
                              if (isThisAnswerCorrect) {
                                cellStyle = "border-2 border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
                              } else if (isThisAnswerUserChoice && !isThisAnswerCorrect) {
                                cellStyle = "border-2 border-rose-400 bg-rose-50 text-rose-950 font-semibold";
                              }

                              return (
                                <div key={cellVal} className={`p-3 rounded-xl border text-xs md:text-sm font-semibold text-center uppercase tracking-wide flex items-center justify-center gap-2 ${cellStyle}`}>
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isThisAnswerCorrect ? "bg-emerald-600" : isThisAnswerUserChoice ? "bg-rose-600" : "bg-slate-400"}`} />
                                  <span>{cellText}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Matching answers breakdown */}
                        {q.type === "matching" && q.pairs && (
                          <div className="space-y-2.5 pt-1">
                            <span className="text-xs font-bold text-slate-700 block uppercase font-mono">Chi tiết ghép đôi của bạn:</span>
                            <div className="grid grid-cols-1 gap-2.5">
                              {q.pairs.map((pair) => {
                                const matchedDef = (() => {
                                  try {
                                    const parsed = JSON.parse(ans || "{}");
                                    return parsed[pair.left] as string | undefined;
                                  } catch (e) {
                                    return undefined;
                                  }
                                })();

                                const isThisCorrect = matchedDef === pair.right;

                                let rowStyle = "border-2 border-slate-300 bg-white";
                                if (matchedDef) {
                                  if (isThisCorrect) {
                                    rowStyle = "border-2 border-emerald-500 bg-emerald-50/40";
                                  } else {
                                    rowStyle = "border-2 border-rose-400 bg-rose-50/40";
                                  }
                                } else {
                                  rowStyle = "border-2 border-slate-200 bg-slate-50 opacity-80";
                                }

                                return (
                                  <div key={pair.left} className={`p-3.5 rounded-xl border text-xs md:text-sm flex flex-col gap-2 ${rowStyle}`}>
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="font-bold text-indigo-950 font-mono text-xs md:text-sm">{pair.left}</span>
                                      
                                      {matchedDef ? (
                                        isThisCorrect ? (
                                          <span className="px-2.5 py-0.5 text-xs font-black uppercase font-mono rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                            CHÍNH XÁC
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-0.5 text-xs font-black uppercase font-mono rounded bg-rose-100 text-rose-900 border border-rose-300">
                                            CHƯA CHÍNH XÁC
                                          </span>
                                        )
                                      ) : (
                                        <span className="px-2.5 py-0.5 text-xs font-black uppercase font-mono rounded bg-slate-200 text-slate-700 border border-slate-300">
                                          CHƯA GHÉP ĐÔI
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200 font-semibold text-slate-900 text-xs md:text-sm leading-relaxed">
                                      <p className="flex gap-2">
                                        <span className="text-slate-500 shrink-0 select-none">Đã ghép:</span>
                                        <span className="font-bold">{matchedDef || <span className="italic text-slate-400 font-medium">Bỏ trống</span>}</span>
                                      </p>
                                      {!isThisCorrect && (
                                        <p className="text-emerald-950 flex gap-2 border-t border-slate-200 pt-1.5 mt-1 font-bold">
                                          <span className="text-emerald-700 shrink-0 select-none font-semibold">Đáp án chuẩn:</span>
                                          <span>{pair.right}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

                {/* Bottom Back Button */}
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAppMode("menu");
                      setSelectedSubSet(null);
                      setTimeElapsed(0);
                    }}
                    className="text-xs md:text-sm font-black uppercase font-mono px-6 py-3 rounded-xl text-white bg-slate-900 border-2 border-slate-900 hover:bg-slate-800 transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    HOÀN TẤT VÀ VỀ MỤC CHỌN ĐỀ ÔN THI
                  </button>
                </div>
              </div>
          )}

        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-650 rounded-full flex items-center justify-center mx-auto mb-2">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-800 font-mono tracking-wide">
                Xác nhận thoát?
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn dừng bài thi này? Mọi kết quả hiện tại sẽ không được lưu trữ.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="py-2 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95 uppercase font-mono"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  setAppMode("menu");
                  setSelectedSubSet(null);
                  setIsTimerActive(false);
                  setTimeElapsed(0);
                }}
                className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition active:scale-95 uppercase font-mono shadow-md shadow-red-650/10"
              >
                Thoát luôn
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Lightbox Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-pointer select-none"
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
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-xs"
            />
          </div>
        </div>
      )}

    </div>
  );
}

import { User, SessionLog, ExamHistoryItem } from "../types";
import { IC3Question } from "../data/ic3Questions";
import { firestoreService } from "./firestoreService";

const SESSION_KEY = "ic3_active_user_session";
const LOCAL_USERS_KEY = "ic3_users_db_v2";
const LOCAL_SESSIONS_KEY = "ic3_sessions_db_v2";
const LOCAL_EXAM_HISTORY_KEY = "ic3_exam_history_v2";
const LOCAL_CUSTOM_QUESTIONS_KEY = "ic3_custom_questions_v2";

export interface ActiveSession {
  user: User;
  sessionId: string;
}

interface StoredUserCredential {
  user: User;
  password: string;
}

// Initial seed accounts as local fallback
const DEFAULT_STORED_USERS: StoredUserCredential[] = [
  {
    user: {
      id: "usr-admin",
      username: "admin",
      name: "Quản Trị Viên Hệ Thống",
      className: "Hội đồng Khảo thí",
      school: "Trung Tâm Tin Học IC3",
      role: "admin",
      createdAt: "2026-09-01T08:00:00.000Z",
      isOnline: false
    },
    password: "admin123"
  },
  {
    user: {
      id: "usr-student-1",
      username: "hoanglong",
      name: "Hoàng Long",
      className: "6A3",
      school: "THCS Trưng Vương",
      role: "student",
      createdAt: "2026-09-05T09:30:00.000Z",
      isOnline: false
    },
    password: "123"
  },
  {
    user: {
      id: "usr-student-2",
      username: "minhanh",
      name: "Trần Minh Anh",
      className: "7B1",
      school: "THCS Nguyễn Tri Phương",
      role: "student",
      createdAt: "2026-09-08T10:00:00.000Z",
      isOnline: false
    },
    password: "123"
  },
  {
    user: {
      id: "usr-student-3",
      username: "quochung",
      name: "Phan Quốc Hưng",
      className: "8A2",
      school: "THCS Thăng Long",
      role: "student",
      createdAt: "2026-09-10T14:20:00.000Z",
      isOnline: false
    },
    password: "123"
  }
];

// Helper to safely call backend API with timeout
async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data?: T; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return { ok: false, status: res.status, error: "Non-JSON response from server" };
    }

    const data = await res.json();
    return { ok: res.ok, data, status: res.status, error: data?.error };
  } catch (err: any) {
    return { ok: false, error: err.message || "Network error" };
  }
}

// Local Storage Cache Helpers
function getLocalUsers(): StoredUserCredential[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read local users cache:", e);
  }
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_STORED_USERS));
  return DEFAULT_STORED_USERS;
}

function saveLocalUsers(users: StoredUserCredential[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Could not save local users cache:", e);
  }
}

function getLocalSessions(): SessionLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: SessionLog[]) {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn("Could not save local sessions:", e);
  }
}

function getLocalExamHistory(): ExamHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAM_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalExamHistory(history: ExamHistoryItem[]) {
  try {
    localStorage.setItem(LOCAL_EXAM_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn("Could not save local exam history:", e);
  }
}

function getLocalCustomQuestions(): IC3Question[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomQuestions(questions: IC3Question[]) {
  try {
    localStorage.setItem(LOCAL_CUSTOM_QUESTIONS_KEY, JSON.stringify(questions));
  } catch (e) {
    console.warn("Could not save local custom questions:", e);
  }
}

export const apiService = {
  // Session Persistence
  getActiveSession(): ActiveSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setActiveSession(session: ActiveSession | null) {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  // Auth: Login (Cloud Firestore -> Local Cache fallback)
  async login(username: string, password: string): Promise<{ user: User; sessionId: string }> {
    const cleanUsername = username.trim().toLowerCase();

    // 1. Try Cloud Firestore first for cross-machine authentication
    try {
      const cloudUsers = await firestoreService.getCloudUsers();
      if (cloudUsers && cloudUsers.length > 0) {
        const match = cloudUsers.find(
          (u) => u.user.username.toLowerCase() === cleanUsername
        );

        if (match) {
          if (match.password !== password) {
            throw new Error("Mật khẩu không chính xác. Vui lòng kiểm tra lại.");
          }

          const sessionId = `sess-cloud-${Date.now()}`;
          const updatedUser: User = {
            ...match.user,
            isOnline: true
          };

          // Mark online & log session in Cloud Firestore
          firestoreService.setCloudUserOnline(updatedUser.id, true).catch(() => {});
          const sessionItem: SessionLog = {
            id: sessionId,
            userId: updatedUser.id,
            username: updatedUser.username,
            name: updatedUser.name,
            className: updatedUser.className,
            school: updatedUser.school,
            role: updatedUser.role,
            loginTime: new Date().toISOString(),
            isOnline: true
          };
          firestoreService.saveCloudSession(sessionItem).catch(() => {});

          // Cache locally for offline backup
          const localUsers = getLocalUsers();
          const existingIdx = localUsers.findIndex((u) => u.user.username.toLowerCase() === cleanUsername);
          if (existingIdx >= 0) {
            localUsers[existingIdx].user = updatedUser;
            localUsers[existingIdx].password = password;
          } else {
            localUsers.push({ user: updatedUser, password });
          }
          saveLocalUsers(localUsers);

          this.setActiveSession({ user: updatedUser, sessionId });
          return { user: updatedUser, sessionId };
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("Mật khẩu không chính xác")) {
        throw err;
      }
      console.warn("Cloud login check failed, attempting backend/local fallback:", err);
    }

    // 2. Try backend server
    const result = await safeFetchJson<{ success: boolean; user: User; sessionId: string; error?: string }>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password })
      }
    );

    if (result.ok && result.data?.success && result.data.user) {
      const user = result.data.user;
      const sessionId = result.data.sessionId;
      this.setActiveSession({ user, sessionId });
      return { user, sessionId };
    }

    if (result.status === 400 || result.status === 401) {
      throw new Error(result.error || "Tên đăng nhập hoặc mật khẩu không chính xác.");
    }

    // 3. Local Storage Fallback
    const localUsers = getLocalUsers();
    const match = localUsers.find((entry) => entry.user.username.toLowerCase() === cleanUsername);

    if (!match) {
      throw new Error("Tài khoản chưa được đăng ký trên hệ thống. Vui lòng bấm 'Tạo tài khoản mới'.");
    }

    if (match.password !== password) {
      throw new Error("Mật khẩu không chính xác. Vui lòng kiểm tra lại.");
    }

    const sessionId = `sess-local-${Date.now()}`;
    const updatedUser: User = {
      ...match.user,
      isOnline: true
    };

    match.user.isOnline = true;
    saveLocalUsers(localUsers);

    this.setActiveSession({ user: updatedUser, sessionId });
    return { user: updatedUser, sessionId };
  },

  // Auth: Register (Cloud Firestore first)
  async register(payload: {
    username: string;
    password: string;
    name: string;
    className: string;
    school: string;
  }): Promise<{ user: User; sessionId: string }> {
    const cleanUsername = payload.username.trim().toLowerCase();

    // 1. Check uniqueness across Cloud Firestore
    try {
      const cloudUsers = await firestoreService.getCloudUsers();
      if (cloudUsers.some((u) => u.user.username.toLowerCase() === cleanUsername)) {
        throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`);
      }

      const newUser: User = {
        id: `usr-cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        username: cleanUsername,
        name: payload.name.trim(),
        className: payload.className.trim(),
        school: payload.school.trim(),
        role: "student",
        createdAt: new Date().toISOString(),
        isOnline: true
      };

      // Save to Cloud Firestore
      await firestoreService.saveCloudUser(newUser, payload.password);

      const sessionId = `sess-cloud-${Date.now()}`;
      await firestoreService.saveCloudSession({
        id: sessionId,
        userId: newUser.id,
        username: newUser.username,
        name: newUser.name,
        className: newUser.className,
        school: newUser.school,
        role: newUser.role,
        loginTime: new Date().toISOString(),
        isOnline: true
      });

      // Cache locally
      const localUsers = getLocalUsers();
      localUsers.push({ user: newUser, password: payload.password });
      saveLocalUsers(localUsers);

      this.setActiveSession({ user: newUser, sessionId });
      return { user: newUser, sessionId };
    } catch (err: any) {
      if (err.message && err.message.includes("đã được sử dụng")) {
        throw err;
      }
      console.warn("Cloud register fallback to backend/local:", err);
    }

    // 2. Try backend
    const result = await safeFetchJson<{ success: boolean; user: User; sessionId: string; error?: string }>(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, username: cleanUsername })
      }
    );

    if (result.ok && result.data?.success && result.data.user) {
      const user = result.data.user;
      const sessionId = result.data.sessionId;
      this.setActiveSession({ user, sessionId });
      return { user, sessionId };
    }

    if (result.status === 400 && result.error) {
      throw new Error(result.error);
    }

    // 3. Local fallback
    const localUsers = getLocalUsers();
    if (localUsers.some((entry) => entry.user.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`);
    }

    const localUser: User = {
      id: `usr-loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      name: payload.name.trim(),
      className: payload.className.trim(),
      school: payload.school.trim(),
      role: "student",
      createdAt: new Date().toISOString(),
      isOnline: true
    };

    localUsers.push({ user: localUser, password: payload.password });
    saveLocalUsers(localUsers);

    const sessionId = `sess-loc-${Date.now()}`;
    this.setActiveSession({ user: localUser, sessionId });
    return { user: localUser, sessionId };
  },

  // Auth: Logout
  async logout(): Promise<void> {
    const active = this.getActiveSession();
    if (active) {
      firestoreService.setCloudUserOnline(active.user.id, false).catch(() => {});
      safeFetchJson("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: active.user.id,
          sessionId: active.sessionId
        })
      }).catch(() => {});

      const localUsers = getLocalUsers();
      const u = localUsers.find((entry) => entry.user.id === active.user.id);
      if (u) {
        u.user.isOnline = false;
        saveLocalUsers(localUsers);
      }
    }
    this.setActiveSession(null);
  },

  // Admin: Get Users & Analytics Stats across Cloud
  async getUsersAndStats(): Promise<{
    users: User[];
    stats: {
      totalUsers: number;
      totalStudents: number;
      onlineCount: number;
      totalExamsTaken: number;
      totalCustomQuestions: number;
      schoolsCount: number;
      uniqueSchools: string[];
    };
  }> {
    try {
      const [cloudUsersData, cloudHistory, cloudQuestions] = await Promise.all([
        firestoreService.getCloudUsers(),
        firestoreService.getCloudExamHistory(),
        firestoreService.getCloudQuestions()
      ]);

      if (cloudUsersData && cloudUsersData.length > 0) {
        const users = cloudUsersData.map((d) => d.user);
        const schoolsSet = new Set<string>();
        users.forEach((u) => {
          if (u.school && u.school.trim()) {
            schoolsSet.add(u.school.trim());
          }
        });

        const stats = {
          totalUsers: users.length,
          totalStudents: users.filter((u) => u.role === "student").length,
          onlineCount: users.filter((u) => u.isOnline).length,
          totalExamsTaken: cloudHistory.length,
          totalCustomQuestions: cloudQuestions.length,
          schoolsCount: schoolsSet.size,
          uniqueSchools: Array.from(schoolsSet)
        };

        return { users, stats };
      }
    } catch (e) {
      console.warn("Cloud getUsersAndStats fallback:", e);
    }

    // Try backend
    const result = await safeFetchJson<{
      success: boolean;
      users: User[];
      stats: any;
    }>("/api/admin/users");

    if (result.ok && result.data?.success && Array.isArray(result.data.users)) {
      return {
        users: result.data.users,
        stats: result.data.stats
      };
    }

    // Local fallback
    const localUsers = getLocalUsers().map((entry) => entry.user);
    const history = getLocalExamHistory();
    const customQuestions = getLocalCustomQuestions();
    const schoolsSet = new Set<string>();
    localUsers.forEach((u) => {
      if (u.school && u.school.trim()) {
        schoolsSet.add(u.school.trim());
      }
    });

    return {
      users: localUsers,
      stats: {
        totalUsers: localUsers.length,
        totalStudents: localUsers.filter((u) => u.role === "student").length,
        onlineCount: localUsers.filter((u) => u.isOnline).length,
        totalExamsTaken: history.length,
        totalCustomQuestions: customQuestions.length,
        schoolsCount: schoolsSet.size,
        uniqueSchools: Array.from(schoolsSet)
      }
    };
  },

  // Admin: Create User (Synchronized to Cloud)
  async createUser(payload: {
    username: string;
    password: string;
    name: string;
    className: string;
    school: string;
    role: "admin" | "student";
  }): Promise<User> {
    const cleanUsername = payload.username.trim().toLowerCase();

    try {
      const cloudUsers = await firestoreService.getCloudUsers();
      if (cloudUsers.some((u) => u.user.username.toLowerCase() === cleanUsername)) {
        throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống.`);
      }

      const newUser: User = {
        id: `usr-cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        username: cleanUsername,
        name: payload.name.trim(),
        className: payload.className.trim(),
        school: payload.school.trim(),
        role: payload.role,
        createdAt: new Date().toISOString(),
        isOnline: false
      };

      await firestoreService.saveCloudUser(newUser, payload.password);

      const localUsers = getLocalUsers();
      localUsers.push({ user: newUser, password: payload.password });
      saveLocalUsers(localUsers);

      return newUser;
    } catch (err: any) {
      if (err.message && err.message.includes("đã tồn tại")) {
        throw err;
      }
      console.warn("Cloud createUser fallback:", err);
    }

    // Backend/local fallback
    const localUsers = getLocalUsers();
    const fallbackUser: User = {
      id: `usr-loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      name: payload.name.trim(),
      className: payload.className.trim(),
      school: payload.school.trim(),
      role: payload.role,
      createdAt: new Date().toISOString(),
      isOnline: false
    };
    localUsers.push({ user: fallbackUser, password: payload.password });
    saveLocalUsers(localUsers);
    return fallbackUser;
  },

  // Student Directory for Dropdown Login (School -> Class -> Student Name)
  async getStudentsForLogin(): Promise<User[]> {
    // 1. Try Cloud Firestore first
    try {
      const cloudData = await firestoreService.getCloudUsers();
      if (cloudData && cloudData.length > 0) {
        const students = cloudData
          .map((d) => d.user)
          .filter((u) => u.role === "student" || (u.school && u.className));
        if (students.length > 0) {
          return students;
        }
      }
    } catch (e) {
      console.warn("Could not load cloud student directory:", e);
    }

    // 2. Try backend endpoint
    const res = await safeFetchJson<{ success: boolean; students: User[] }>("/api/auth/directory");
    if (res.ok && res.data?.success && Array.isArray(res.data.students)) {
      return res.data.students;
    }

    // 3. Local fallback
    const local = getLocalUsers().map((e) => e.user);
    return local.filter((u) => u.role === "student" || (u.school && u.className));
  },

  // Admin: Update User Password (Cloud & Local)
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.trim().length === 0) {
      throw new Error("Mật khẩu không được để trống.");
    }

    await firestoreService.updateCloudUserPassword(userId, newPassword.trim()).catch((e) => {
      console.warn("Cloud password update fallback:", e);
    });

    safeFetchJson(`/api/admin/users/${userId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword.trim() })
    }).catch(() => {});

    const localUsers = getLocalUsers();
    const target = localUsers.find((u) => u.user.id === userId);
    if (target) {
      target.password = newPassword.trim();
      saveLocalUsers(localUsers);
    }
  },

  // Admin: Force logout another account
  async forceLogoutUser(userId: string): Promise<void> {
    if (!userId) {
      throw new Error("Không xác định được tài khoản.");
    }
  
    try {
      await firestoreService.forceLogoutUser(userId);
    } catch (err) {
      console.warn("Cloud force logout failed:", err);
    }
  
    // Local fallback
    const localUsers = getLocalUsers();
    const target = localUsers.find((u) => u.user.id === userId);
  
    if (target) {
      target.user.isOnline = false;
      target.user.sessionVersion =
        (target.user.sessionVersion || 0) + 1;
  
      saveLocalUsers(localUsers);
    }
  
    // Backend nếu có
    safeFetchJson(`/api/admin/users/${userId}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }).catch(() => {});
  },

  // Admin: Create Bulk Users
  async createBulkUsers(
    studentList: Array<{
      name: string;
      username: string;
      password?: string;
      className?: string;
      school?: string;
    }>
  ): Promise<{ createdCount: number; createdUsers: User[]; skippedCount: number }> {
    if (!Array.isArray(studentList) || studentList.length === 0) {
      return { createdCount: 0, createdUsers: [], skippedCount: 0 };
    }

    const createdUsers: User[] = [];
    let skippedCount = 0;

    try {
      const existingCloud = await firestoreService.getCloudUsers();
      const existingSet = new Set(existingCloud.map((u) => u.user.username.toLowerCase()));

      for (const item of studentList) {
        const cleanUsername = item.username.trim().toLowerCase();
        const cleanName = item.name.trim();
        const pwd = (item.password || "123").trim();

        if (!cleanUsername || !cleanName || existingSet.has(cleanUsername)) {
          skippedCount++;
          continue;
        }

        const newUser: User = {
          id: `usr-cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          username: cleanUsername,
          name: cleanName,
          className: (item.className || "").trim(),
          school: (item.school || "").trim(),
          role: "student",
          createdAt: new Date().toISOString(),
          isOnline: false
        };

        await firestoreService.saveCloudUser(newUser, pwd);
        existingSet.add(cleanUsername);
        createdUsers.push(newUser);
      }

      return {
        createdCount: createdUsers.length,
        createdUsers,
        skippedCount
      };
    } catch (err) {
      console.warn("Cloud bulk create fallback to local:", err);
      return { createdCount: 0, createdUsers: [], skippedCount: studentList.length };
    }
  },

  // Admin: Delete User
  async deleteUser(userId: string): Promise<void> {
    await firestoreService.deleteCloudUser(userId).catch(() => {});
    safeFetchJson(`/api/admin/users/${userId}`, { method: "DELETE" }).catch(() => {});
    const localUsers = getLocalUsers().filter((u) => u.user.id !== userId);
    saveLocalUsers(localUsers);
  },

  // Admin: Get Session Logs
  async getSessionLogs(): Promise<SessionLog[]> {
    try {
      const cloudLogs = await firestoreService.getCloudSessionLogs();
      if (cloudLogs && cloudLogs.length > 0) {
        return cloudLogs;
      }
    } catch (e) {
      console.warn("Cloud session logs fallback:", e);
    }
    return getLocalSessions();
  },

  // Admin: Get Exam History (Real-time Cloud Results from all students)
  async getExamHistory(): Promise<ExamHistoryItem[]> {
    try {
      const cloudHistory = await firestoreService.getCloudExamHistory();
      saveLocalExamHistory(cloudHistory);
      return cloudHistory;
    } catch (e) {
      console.warn("Cloud exam history fallback:", e);
    }
    return getLocalExamHistory();
  },

  // Record completed Exam result for student (Saved to Cloud Firestore)
  async recordExamResult(payload: {
    userId: string;
    username: string;
    studentName: string;
    className: string;
    school: string;
    level: string;
    subset: string;
    mode: "training" | "testing";
    correctCount: number;
    wrongCount: number;
    totalCount: number;
    scorePercent: number;
    timeTaken: number;
  }): Promise<ExamHistoryItem> {
    const newRecord: ExamHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...payload,
      timestamp: new Date().toISOString()
    };

    // 1. Save directly to Google Cloud Firestore
    firestoreService.saveCloudExamRecord(newRecord).catch((err) => {
      console.warn("Could not save exam record to Cloud Firestore:", err);
    });

    // 2. Also save to local cache
    const localHist = getLocalExamHistory();
    localHist.unshift(newRecord);
    saveLocalExamHistory(localHist);

    // 3. Notify backend
    safeFetchJson("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    return newRecord;
  },

  // Questions: Fetch custom questions from Cloud Firestore
  async getCustomQuestions(): Promise<IC3Question[]> {
    try {
      const cloudQuestions = await firestoreService.getCloudQuestions();
      saveLocalCustomQuestions(cloudQuestions);
      return cloudQuestions;
    } catch (e) {
      console.warn("Cloud questions fallback:", e);
    }

    const localQ = getLocalCustomQuestions();
    return localQ;
  },

  // Admin: Add new IC3 question (Saved to Cloud Firestore)
  async addCustomQuestion(q: {
    levelId: "level-1" | "level-2" | "level-3";
    subsetId: "GM1" | "GM2" | "OT1" | "OT2" | "OT3" | "OT4" | "OT5";
    type: "multiple_choice" | "yes_no" | "matching";
    text: string;
    image?: string;
    options?: string[];
    correctAnswerText?: string;
    correctKeys?: string[];
    statements?: {
      text: string;
      correct: "True" | "False";
    }[];
    pairs?: { left: string; right: string; leftImage?: string; rightImage?: string }[];
    explanation?: string;
    order?: number;
    createdBy?: string;
  }): Promise<IC3Question> {
    const orderNum = typeof q.order === "number" ? q.order : (typeof (q as any).questionNumber === "number" ? (q as any).questionNumber : undefined);
    const newQ: IC3Question = {
      id: `custom-q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      levelId: q.levelId,
      subsetId: q.subsetId,
      type: q.type,
      text: q.text,
      ...(q.image ? { image: q.image } : {}),
      ...(q.options && q.options.length > 0 ? { options: q.options } : {}),
      ...(q.correctAnswerText ? { correctAnswerText: q.correctAnswerText } : {}),
      ...(q.correctKeys && q.correctKeys.length > 0 ? { correctKeys: q.correctKeys } : {}),
      ...(q.statements && q.statements.length > 0 ? { statements: q.statements } : {}),
      ...(q.pairs && q.pairs.length > 0 ? { pairs: q.pairs } : {}),
      ...(q.explanation ? { explanation: q.explanation } : {}),
      ...(typeof orderNum === "number" ? { order: orderNum, questionNumber: orderNum } : {})
    };

    // 1. Save directly to Cloud Firestore so all computers see it immediately
    try {
      await firestoreService.saveCloudQuestion(newQ);
    } catch (err: any) {
      console.error("Failed saving question to Cloud Firestore:", err);
      throw new Error(`Lỗi lưu câu hỏi lên Cloud Firestore: ${err?.message || err}`);
    }

    // 2. Cache locally
    const questions = getLocalCustomQuestions();
    questions.unshift(newQ);
    saveLocalCustomQuestions(questions);

    // 3. Sync to backend
    safeFetchJson("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q)
    }).catch(() => {});

    return newQ;
  },

  // Admin: Update / Edit existing question (Saved to Cloud Firestore & Local)
  async updateCustomQuestion(questionId: string, q: Partial<IC3Question>): Promise<IC3Question> {
    const questions = getLocalCustomQuestions();
    const existingIndex = questions.findIndex((item) => item.id === questionId);
    const existing = existingIndex >= 0 ? questions[existingIndex] : null;

    const finalOrder = q.order !== undefined ? q.order : ((q as any).questionNumber !== undefined ? (q as any).questionNumber : (existing?.order ?? existing?.questionNumber));

    const updatedQ: IC3Question = {
      id: questionId,
      levelId: q.levelId || existing?.levelId || "level-1",
      subsetId: q.subsetId || existing?.subsetId || "GM1",
      type: q.type || existing?.type || "multiple_choice",
      text: (q.text !== undefined ? q.text : existing?.text || "").trim(),
      ...(q.image !== undefined ? (q.image ? { image: q.image } : {}) : existing?.image ? { image: existing.image } : {}),
      ...(q.options && q.options.length > 0 ? { options: q.options } : existing?.options ? { options: existing.options } : {}),
      ...(q.correctAnswerText !== undefined ? { correctAnswerText: q.correctAnswerText } : existing?.correctAnswerText ? { correctAnswerText: existing.correctAnswerText } : {}),
      ...(q.correctKeys && q.correctKeys.length > 0 ? { correctKeys: q.correctKeys } : existing?.correctKeys ? { correctKeys: existing.correctKeys } : {}),
      ...(q.statements && q.statements.length > 0 ? { statements: q.statements } : existing?.statements ? { statements: existing.statements } : {}),
      ...(q.pairs && q.pairs.length > 0 ? { pairs: q.pairs } : existing?.pairs ? { pairs: existing.pairs } : {}),
      ...(q.explanation !== undefined ? { explanation: q.explanation } : existing?.explanation ? { explanation: existing.explanation } : {}),
      ...(finalOrder !== undefined ? { order: finalOrder, questionNumber: finalOrder } : {})
    };

    // 1. Update in Cloud Firestore
    try {
      await firestoreService.saveCloudQuestion(updatedQ);
    } catch (err: any) {
      console.error("Failed updating question on Cloud Firestore:", err);
      throw new Error(`Lỗi cập nhật câu hỏi lên Cloud Firestore: ${err?.message || err}`);
    }

    // 2. Update local storage cache
    if (existingIndex >= 0) {
      questions[existingIndex] = updatedQ;
    } else {
      questions.unshift(updatedQ);
    }
    saveLocalCustomQuestions(questions);

    // 3. Sync to backend if running
    safeFetchJson(`/api/admin/questions/${questionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedQ)
    }).catch(() => {});

    return updatedQ;
  },

  // Admin: Update Question Order directly
  async updateQuestionOrder(question: IC3Question, newOrder: number): Promise<IC3Question> {
    const questions = getLocalCustomQuestions();
    const existingIndex = questions.findIndex((item) => item.id === question.id);

    const updatedQ: IC3Question = {
      ...question,
      order: newOrder
    };

    // 1. Save to Cloud Firestore
    try {
      await firestoreService.saveCloudQuestion(updatedQ);
    } catch (e) {
      console.warn("Cloud save question order fallback:", e);
    }

    // 2. Save locally
    if (existingIndex >= 0) {
      questions[existingIndex] = updatedQ;
    } else {
      questions.push(updatedQ);
    }
    saveLocalCustomQuestions(questions);

    // 3. Backend endpoint sync
    safeFetchJson(`/api/admin/questions/${question.id}/order`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder })
    }).catch(() => {});

    return updatedQ;
  },

  // Admin: Delete Question (Removed from Cloud Firestore)
  async deleteCustomQuestion(questionId: string): Promise<void> {
    await firestoreService.deleteCloudQuestion(questionId).catch(() => {});
    safeFetchJson(`/api/admin/questions/${questionId}`, { method: "DELETE" }).catch(() => {});
    const questions = getLocalCustomQuestions().filter((q) => q.id !== questionId);
    saveLocalCustomQuestions(questions);
  }
};

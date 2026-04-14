import { createContext, useState, useContext } from "react";

const AuthContext = createContext(null);

function loadUserRecord(email) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  return users.find((u) => u.email === email) || null;
}

function saveUserRecord(updated) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const next = users.map((u) => (u.email === updated.email ? updated : u));
  localStorage.setItem("users", JSON.stringify(next));
}

function buildUserState(record) {
  return {
    email: record.email,
    role: record.role || "user",
    creatorUsername: record.creatorUsername || null,
    displayName: record.displayName || record.email.split("@")[0],
    bio: record.bio || "",
    avatarUrl: record.avatarUrl || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
  };
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem("currentUserEmail");
    if (!email) return null;
    const record = loadUserRecord(email);
    return record
      ? buildUserState(record)
      : { email, role: "user", creatorUsername: null, displayName: email.split("@")[0], bio: "", avatarUrl: null, createdAt: null, updatedAt: null };
  });

  // ── Sign up ──────────────────────────────────────────────────────────────
  function signUp(email, password, displayName) {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u) => u.email === email)) {
      return { success: false, error: "Email already exists" };
    }
    const now = new Date().toISOString();
    const newRecord = {
      email,
      password,
      role: "user",
      creatorUsername: null,
      displayName: displayName || email.split("@")[0],
      bio: "",
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    users.push(newRecord);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("currentUserEmail", email);
    setUser(buildUserState(newRecord));
    return { success: true };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  function login(email, password) {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const record = users.find((u) => u.email === email && u.password === password);
    if (!record) {
      return { success: false, error: "Invalid email or password" };
    }
    localStorage.setItem("currentUserEmail", email);
    setUser(buildUserState(record));
    return { success: true };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem("currentUserEmail");
    setUser(null);
  }

  // ── Update User Profile ───────────────────────────────────────────────────
  function updateProfile({ displayName, bio, avatarUrl }) {
    const record = loadUserRecord(user.email);
    if (!record) return { success: false, error: "User not found" };

    const updated = {
      ...record,
      displayName: displayName || record.displayName,
      bio: bio ?? record.bio,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : record.avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    saveUserRecord(updated);
    setUser(buildUserState(updated));
    return { success: true };
  }

  // ── Become a Creator ─────────────────────────────────────────────────────
  function becomeCreator(creatorProfile) {
    const record = loadUserRecord(user.email);
    if (!record) return { success: false, error: "User not found" };

    const userCreators = JSON.parse(localStorage.getItem("userCreators") || "[]");
    if (userCreators.find((c) => c.username === creatorProfile.username)) {
      return { success: false, error: "Username already taken" };
    }

    const fullProfile = {
      ...creatorProfile,
      id: `user_${Date.now()}`,
      avatar: record.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorProfile.displayName)}&background=5865f2&color=fff&size=150`,
      banner: `https://picsum.photos/seed/${creatorProfile.username}/1200/300`,
      portfolio: [],
      stats: { completedRequests: 0, rating: 0, responseTime: "TBD" },
    };
    userCreators.push(fullProfile);
    localStorage.setItem("userCreators", JSON.stringify(userCreators));

    const updated = { ...record, role: "creator", creatorUsername: creatorProfile.username };
    saveUserRecord(updated);
    setUser(buildUserState(updated));
    return { success: true };
  }

  // ── Update Creator Profile ────────────────────────────────────────────────
  function updateCreatorProfile(changes) {
    if (!user?.creatorUsername) return { success: false, error: "Not a creator" };
    const userCreators = JSON.parse(localStorage.getItem("userCreators") || "[]");
    const next = userCreators.map((c) =>
      c.username === user.creatorUsername ? { ...c, ...changes } : c
    );
    localStorage.setItem("userCreators", JSON.stringify(next));
    return { success: true };
  }

  const isCreator = user?.role === "creator";

  return (
    <AuthContext.Provider
      value={{ user, isCreator, signUp, login, logout, updateProfile, becomeCreator, updateCreatorProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

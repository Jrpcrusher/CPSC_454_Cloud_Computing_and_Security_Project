import { createContext, useState, useContext, useEffect } from "react";
import api from "../services/apiClient";

const AuthContext = createContext(null);

function mapBackendUser(data) {
  return {
    user_id: data.user_id,
    username: data.username,
    displayName: data.username,
    email: data.email,
    role: data.role,
    bio: data.description || "",
    avatarUrl: data.pfp_url || null,
    createdAt: data.register_date || null,
    updatedAt: null,
    creatorUsername: null,
  };
}

function getLocalCreatorData(userId) {
  try {
    const raw = localStorage.getItem(`creatorProfile_${userId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function base64ToBlob(base64Str) {
  const [header, data] = base64Str.split(",");
  const mimeType = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mimeType });
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/user/me")
      .then((data) => {
        const base = mapBackendUser(data);
        const local = getLocalCreatorData(data.user_id);
        setUser({ ...base, ...local });
      })
      .catch(() => {
        api.clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  async function signUp(username, email, password) {
    try {
      await api.post("/auth/register", { username, email, password });
      return await login(username, password);
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function login(username, password) {
    try {
      const tokenData = await api.postForm("/auth/login", { username, password });
      api.setToken(tokenData.access_token);
      const me = await api.get("/user/me");
      const base = mapBackendUser(me);
      const local = getLocalCreatorData(me.user_id);
      setUser({ ...base, ...local });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — clear client-side regardless
    }
    api.clearToken();
    setUser(null);
  }

  // avatarSource can be a File, Blob, or base64 string
  async function updateProfile({ displayName, bio, avatarSource } = {}) {
    try {
      const settingsUpdate = {};
      if (displayName !== undefined) settingsUpdate.username = displayName;
      if (bio !== undefined) settingsUpdate.description = bio;

      if (Object.keys(settingsUpdate).length > 0) {
        await api.patch("/user/me/settings", settingsUpdate);
      }

      if (avatarSource !== undefined && avatarSource !== null) {
        let blob =
          avatarSource instanceof Blob
            ? avatarSource
            : typeof avatarSource === "string" && avatarSource.startsWith("data:")
            ? base64ToBlob(avatarSource)
            : null;

        if (blob) {
          const fd = new FormData();
          fd.append("image", blob, "avatar.jpg");
          await api.post("/user/me/settings/pfp", fd);
        }
      } else if (avatarSource === null) {
        // Removal not supported by the backend; silently skip
      }

      const me = await api.get("/user/me");
      const base = mapBackendUser(me);
      const local = getLocalCreatorData(me.user_id);
      setUser((prev) => ({ ...prev, ...base, ...local }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function becomeCreator(creatorProfile) {
    if (!user) return { success: false, error: "Not logged in" };

    const userCreators = JSON.parse(localStorage.getItem("userCreators") || "[]");
    if (userCreators.find((c) => c.username === creatorProfile.username)) {
      return { success: false, error: "Username already taken" };
    }

    // Persist creator role to backend
    try {
      await api.patch("/user/me/become-creator");
    } catch (err) {
      return { success: false, error: err.message };
    }

    const fullProfile = {
      ...creatorProfile,
      id: user.user_id,
      user_id: user.user_id,
      avatar:
        user.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorProfile.displayName)}&background=5865f2&color=fff&size=150`,
      banner: `https://picsum.photos/seed/${creatorProfile.username}/1200/300`,
      portfolio: [],
      stats: { completedRequests: 0, rating: 0, responseTime: "TBD" },
    };
    userCreators.push(fullProfile);
    localStorage.setItem("userCreators", JSON.stringify(userCreators));

    const localData = { role: "creator", creatorUsername: creatorProfile.username };
    localStorage.setItem(`creatorProfile_${user.user_id}`, JSON.stringify(localData));
    setUser((prev) => ({ ...prev, ...localData }));
    return { success: true };
  }

  function updateCreatorProfile(changes) {
    if (!user?.creatorUsername) return { success: false, error: "Not a creator" };
    const userCreators = JSON.parse(localStorage.getItem("userCreators") || "[]");
    const next = userCreators.map((c) =>
      c.username === user.creatorUsername ? { ...c, ...changes } : c,
    );
    localStorage.setItem("userCreators", JSON.stringify(next));
    return { success: true };
  }

  const isCreator = user?.role === "creator";

  return (
    <AuthContext.Provider
      value={{
        user,
        isCreator,
        loading,
        signUp,
        login,
        logout,
        updateProfile,
        becomeCreator,
        updateCreatorProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

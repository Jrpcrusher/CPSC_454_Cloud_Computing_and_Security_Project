import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/apiClient";

const AuthContext = createContext(null);

function mapBackendUser(data) {
  return {
    user_id: data.user_id,
    username: data.username,
    email: data.email,
    role: data.role,
    creator_username: data.creator_username || null,
    description: data.description || "",
    pfp_url: data.pfp_url || null,
    register_date: data.register_date || null,
    stripe_account_id: data.stripe_account_id || null,
  };
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const me = await api.get("/user/me");
      setUser(mapBackendUser(me));
      return { success: true };
    } catch (err) {
      api.clearToken();
      setUser(null);
      return { success: false, error: err.message };
    }
  }

  useEffect(() => {
    const token = api.getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser().finally(() => setLoading(false));
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
      const tokenData = await api.postForm("/auth/login", {
        username,
        password,
      });

      api.setToken(tokenData.access_token);

      const me = await api.get("/user/me");
      setUser(mapBackendUser(me));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore logout API failures and clear client state anyway
    }

    api.clearToken();
    setUser(null);
  }

  async function updateProfile({ username, description, avatarFile } = {}) {
    try {
      const settingsUpdate = {};

      if (username !== undefined) {
        settingsUpdate.username = username;
      }

      if (description !== undefined) {
        settingsUpdate.description = description;
      }

      if (Object.keys(settingsUpdate).length > 0) {
        await api.patch("/user/me/settings", settingsUpdate);
      }

      if (avatarFile instanceof Blob) {
        const formData = new FormData();
        formData.append("image", avatarFile, "avatar.jpg");
        await api.post("/user/me/settings/pfp", formData);
      }

      const me = await api.get("/user/me");
      setUser(mapBackendUser(me));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function becomeCreator({ creator_username }) {
    if (!user) {
      return { success: false, error: "Not logged in" };
    }

    try {
      await api.patch("/user/me/become-creator", { creator_username });

      const me = await api.get("/user/me");
      setUser(mapBackendUser(me));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  const isCreator = user?.role === "creator" || user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isCreator,
        loading,
        signUp,
        login,
        logout,
        refreshUser,
        updateProfile,
        becomeCreator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
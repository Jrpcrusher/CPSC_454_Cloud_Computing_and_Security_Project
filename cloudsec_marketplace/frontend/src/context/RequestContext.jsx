import { createContext, useState, useContext, useEffect, useCallback } from "react";
import api from "../services/apiClient";

const RequestContext = createContext(null);

// Backend status → frontend display status
const STATUS_MAP = {
  received: "pending",
  accepted: "in_progress",
  declined: "declined",
  completed: "completed",
};

// Frontend action → backend endpoint suffix
const ACTION_MAP = {
  in_progress: "accept",
  declined: "decline",
  completed: "approve",
};

function parseOrder(order) {
  let details = {};
  try {
    details = JSON.parse(order.order_details);
  } catch {
    details = { description: order.order_details };
  }

  return {
    id: order.order_id,
    _backendId: order.order_id,
    creatorUsername: order.artist?.username || "",
    requesterEmail: order.client?.email || order.client?.username || "",
    title: details.title || "Commission Request",
    description: details.description || "",
    tier: details.tier || "",
    referenceLinks: details.referenceLinks || "",
    deadline: details.deadline || "",
    notes: details.notes || "",
    characterCount: details.characterCount || "1",
    status: STATUS_MAP[order.status] || order.status,
    createdAt: order.creation_date,
    artist_approval: order.artist_approval || false,
    client_approval: order.client_approval || false,
  };
}

export default function RequestProvider({ children }) {
  const [clientOrders, setClientOrders] = useState([]);
  const [artistOrders, setArtistOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshOrders = useCallback(async () => {
    if (!api.getToken()) return;
    setLoading(true);
    try {
      const [clientData, artistData] = await Promise.all([
        api.get("/user/me/orders/client"),
        api.get("/user/me/orders/artist"),
      ]);
      setClientOrders((clientData || []).map(parseOrder));
      setArtistOrders((artistData || []).map(parseOrder));
    } catch {
      // silently fail — user may not be logged in yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // artistUserId: the backend user_id of the creator
  // formData: the ArtRequest form values
  async function submitRequest(formData, artistUserId) {
    if (!artistUserId) {
      // Fallback: save to localStorage for mock creators
      const newRequest = {
        id: `req_${Date.now()}`,
        ...formData,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("artRequests") || "[]");
      localStorage.setItem("artRequests", JSON.stringify([...existing, newRequest]));
      return { success: true, request: newRequest, isLocal: true };
    }

    try {
      const order_details = JSON.stringify({
        title: formData.title,
        description: formData.description,
        tier: formData.tier,
        referenceLinks: formData.referenceLinks,
        deadline: formData.deadline,
        notes: formData.notes,
        characterCount: formData.characterCount,
      });

      const order = await api.post(`/home/profiles/${artistUserId}/request`, {
        order_details,
      });

      const parsed = parseOrder(order);
      setClientOrders((prev) => [parsed, ...prev]);
      return { success: true, request: parsed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function getRequestsByUser() {
    return [...clientOrders];
  }

  function getRequestsByCreator(username) {
    return artistOrders.filter((r) => r.creatorUsername === username);
  }

  async function cancelRequest(orderId) {
    try {
      await api.patch(`/user/me/orders/${orderId}/decline`);
      setClientOrders((prev) =>
        prev.map((r) => (r.id === orderId ? { ...r, status: "declined" } : r))
      );
      return { success: true };
    } catch (err) {
      const is404 = err.message?.includes("404") || err.status === 404;
      if (is404) {
        setClientOrders((prev) => prev.filter((r) => r.id !== orderId));
        return { success: false, error: "Order no longer exists." };
      }
      return { success: false, error: err.message || "Failed to cancel. Please try again." };
    }
  }

  async function updateRequestStatus(orderId, newStatus) {
    const suffix = ACTION_MAP[newStatus];
    if (!suffix) return;
    try {
      const method = suffix === "approve" ? "post" : "patch";
      await api[method](`/user/me/orders/${orderId}/${suffix}`);
      setArtistOrders((prev) =>
        prev.map((r) => (r.id === orderId ? { ...r, status: newStatus } : r)),
      );
      setClientOrders((prev) =>
        prev.map((r) => (r.id === orderId ? { ...r, status: newStatus } : r)),
      );
    } catch (err) {
      console.error("Failed to update order status:", err.message);
    }
  }

  // Kept for backward compatibility with components that use the flat `requests` array
  const requests = getRequestsByUser();

  return (
    <RequestContext.Provider
      value={{
        requests,
        clientOrders,
        artistOrders,
        loading,
        refreshOrders,
        submitRequest,
        getRequestsByUser,
        getRequestsByCreator,
        updateRequestStatus,
        cancelRequest,
      }}
    >
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  return useContext(RequestContext);
}

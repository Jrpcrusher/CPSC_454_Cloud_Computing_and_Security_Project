import { createContext, useState, useContext } from "react";

const RequestContext = createContext(null);

export default function RequestProvider({ children }) {
  const [requests, setRequests] = useState(() => {
    return JSON.parse(localStorage.getItem("artRequests") || "[]");
  });

  function submitRequest(requestData) {
    const newRequest = {
      id: `req_${Date.now()}`,
      ...requestData,
      status: "pending", // pending | in_progress | completed | declined
      createdAt: new Date().toISOString(),
    };

    const updated = [...requests, newRequest];
    setRequests(updated);
    localStorage.setItem("artRequests", JSON.stringify(updated));
    return newRequest;
  }

  function getRequestsByUser(email) {
    return requests.filter((r) => r.requesterEmail === email);
  }

  function getRequestsByCreator(username) {
    return requests.filter((r) => r.creatorUsername === username);
  }

  function updateRequestStatus(requestId, status) {
    const updated = requests.map((r) =>
      r.id === requestId ? { ...r, status } : r
    );
    setRequests(updated);
    localStorage.setItem("artRequests", JSON.stringify(updated));
  }

  return (
    <RequestContext.Provider
      value={{
        requests,
        submitRequest,
        getRequestsByUser,
        getRequestsByCreator,
        updateRequestStatus,
      }}
    >
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  return useContext(RequestContext);
}

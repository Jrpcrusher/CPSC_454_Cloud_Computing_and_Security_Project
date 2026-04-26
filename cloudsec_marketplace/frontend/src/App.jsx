import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreatorProfile from "./pages/CreatorProfile";
import ArtRequest from "./pages/ArtRequest";
import Dashboard from "./pages/Dashboard";
import BecomeCreator from "./pages/BecomeCreator";
import EditProfile from "./pages/EditProfile";
import OnboardComplete from "./pages/OnboardComplete";
import OnboardRefresh from "./pages/OnboardRefresh";
import OrderDetail from "./pages/OrderDetail";
import AuthProvider from "./context/AuthContext";
import PortfolioManager from "./pages/PortfolioManager";
import Transactions from "./pages/Transactions";
import ImageDetail from "./pages/ImageDetail";
import PublicImageDetail from "./pages/PublicImageDetail";
import HealthStatus from "./pages/HealthStatus";

/* Admin pages */
import AdminUsers from "./pages/AdminUsers";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminUserImages from "./pages/AdminUserImages";
import AdminImageDetail from "./pages/AdminImageDetail";
import AdminUserOrders from "./pages/AdminUserOrders";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import AdminPermissions from "./pages/AdminPermissions";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/status/health" element={<HealthStatus />} />

          {/* Public creator browsing */}
          <Route path="/creator/:userId" element={<CreatorProfile />} />
          <Route path="/creator/:userId/request" element={<ArtRequest />} />
          <Route path="/creator/:userId/images/:imageId" element={<PublicImageDetail />} />

          {/* User area */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/become-creator" element={<BecomeCreator />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route path="/dashboard/portfolio" element={<PortfolioManager />} />
          <Route path="/dashboard/portfolio/:imageId" element={<ImageDetail />} />
          <Route path="/dashboard/transactions" element={<Transactions />} />

          {/* Stripe onboarding */}
          <Route path="/artist/onboard/complete" element={<OnboardComplete />} />
          <Route path="/artist/onboard/refresh" element={<OnboardRefresh />} />

          {/* Admin */}
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
          <Route path="/admin/users/:userId/permissions" element={<AdminPermissions />} />
          <Route path="/admin/users/:userId/images" element={<AdminUserImages />} />
          <Route path="/admin/users/:userId/images/:imageId" element={<AdminImageDetail />} />
          <Route path="/admin/users/:userId/orders" element={<AdminUserOrders />} />
          <Route path="/admin/users/:userId/orders/:orderId" element={<AdminOrderDetail />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
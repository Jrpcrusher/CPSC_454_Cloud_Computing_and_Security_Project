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

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/creator/:userId" element={<CreatorProfile />} />
          <Route path="/creator/:userId/request" element={<ArtRequest />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/become-creator" element={<BecomeCreator />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route path="/artist/onboard/complete" element={<OnboardComplete />} />
          <Route path="/artist/onboard/refresh" element={<OnboardRefresh />} />
          <Route path="/dashboard/portfolio" element={<PortfolioManager />} />
          <Route path="/dashboard/transactions" element={<Transactions />} />
          <Route path="/dashboard/portfolio/:imageId" element={<ImageDetail />} />
          <Route path="/creator/:userId/images/:imageId" element={<PublicImageDetail />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
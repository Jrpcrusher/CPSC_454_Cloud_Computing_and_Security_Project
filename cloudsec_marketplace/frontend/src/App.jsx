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
import AuthProvider from "./context/AuthContext";
import RequestProvider from "./context/RequestContext";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <RequestProvider>
        <div className="app">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/creator/:username" element={<CreatorProfile />} />
            <Route path="/creator/:username/request" element={<ArtRequest />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/become-creator" element={<BecomeCreator />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/artist/onboard/complete" element={<OnboardComplete />} />
            <Route path="/artist/onboard/refresh" element={<OnboardRefresh />} />
          </Routes>
        </div>
      </RequestProvider>
    </AuthProvider>
  );
}

export default App;

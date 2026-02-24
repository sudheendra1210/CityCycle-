import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Bins from './pages/Bins';
import Vehicles from './pages/Vehicles';
import Collections from './pages/Collections';
import Complaints from './pages/Complaints';
import Analytics from './pages/Analytics';
import Predictions from './pages/Predictions';
import Forecasting from './pages/Forecasting';
import Profile from './pages/Profile';
import Classification from './pages/Classification';
import Simulation from './pages/Simulation';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <Router>
      <AuthProvider>
        <LocationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/bins" element={<Bins />} />
                      <Route path="/vehicles" element={<Vehicles />} />
                      <Route path="/collections" element={<Collections />} />
                      <Route path="/complaints" element={<Complaints />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/predictions" element={<Predictions />} />
                      <Route path="/forecasting" element={<Forecasting />} />
                      <Route path="/classification" element={<Classification />} />
                      <Route path="/simulation" element={<Simulation />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </LocationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

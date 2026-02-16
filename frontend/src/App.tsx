import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import PublicDashboard from './pages/public/Dashboard';
import ProjectDetails from './pages/admin/ProjectDetails';
import AdminMap from './pages/admin/AdminMap';
import AdminUsers from './pages/admin/Users';
import MapEntry from './pages/public/MapEntry';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#363636',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <main className="flex-1 flex flex-col min-h-0">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/project/:id" element={<ProjectDetails />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/map" element={<AdminMap />} />
              <Route path="/public" element={<PublicDashboard />} />
              <Route path="/public/map/:projectId" element={<MapEntry />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

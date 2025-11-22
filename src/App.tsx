import { useState } from 'react';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { GovernmentDashboard } from './components/government/GovernmentDashboard';
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { VendorDashboard } from './components/vendor/VendorDashboard';

import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { user, role, logout } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<string | null>(null);

  // If user is logged in, show their dashboard
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {role === 'authority' && <GovernmentDashboard onLogout={logout} />}
        {role === 'farmer' && <FarmerDashboard onLogout={logout} />}
        {role === 'vendor' && <VendorDashboard onLogout={logout} />}
      </div>
    );
  }

  // If portal is selected, show login page
  if (selectedPortal) {
    return (
      <>
        <LoginPage portal={selectedPortal} onBack={() => setSelectedPortal(null)} />

      </>
    );
  }

  // Show portal selection
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-green-800 mb-3">Agricultural Management System</h1>
            <p className="text-gray-600">Select your portal to continue</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Government Portal */}
            <button
              onClick={() => setSelectedPortal('government')}
              className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow text-left border-2 border-transparent hover:border-green-500"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-gray-900 mb-2">Government Portal</h3>
              <p className="text-gray-600 text-sm">For Hobli authorities to manage farmers, crops, and schemes</p>
            </button>

            {/* Farmer Portal */}
            <button
              onClick={() => setSelectedPortal('farmer')}
              className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow text-left border-2 border-transparent hover:border-green-500"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-gray-900 mb-2">Farmer Portal</h3>
              <p className="text-gray-600 text-sm">For farmers to update crop details and view schemes</p>
            </button>

            {/* Vendor Portal */}
            <button
              onClick={() => setSelectedPortal('vendor')}
              className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow text-left border-2 border-transparent hover:border-green-500"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-gray-900 mb-2">Vendor / Mandi Portal</h3>
              <p className="text-gray-600 text-sm">For vendors to search crops and connect with farmers</p>
            </button>
          </div>

          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>Connecting farmers, authorities, and markets for better agricultural management</p>
          </div>

          {/* Feature Overview */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-900 mb-4 text-center">System Features</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="text-gray-900 mb-2">✅ Government Portal</h4>
                <ul className="text-gray-600 space-y-1 text-xs">
                  <li>• Manage farmer database</li>
                  <li>• Update crop rates</li>
                  <li>• Publish government schemes</li>
                  <li>• Track fertilizer distribution</li>
                  <li>• Update farmer information</li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-900 mb-2">✅ Farmer Portal</h4>
                <ul className="text-gray-600 space-y-1 text-xs">
                  <li>• Login with survey number</li>
                  <li>• Update crop details (once/season)</li>
                  <li>• View current crop rates</li>
                  <li>• Access government schemes</li>
                  <li>• Track fertilizer history</li>
                  <li>• Missed call SMS service</li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-900 mb-2">✅ Vendor Portal</h4>
                <ul className="text-gray-600 space-y-1 text-xs">
                  <li>• Search by location hierarchy</li>
                  <li>• Filter by crop type</li>
                  <li>• View demand indicators</li>
                  <li>• See harvest dates</li>
                  <li>• Privacy-protected calls</li>
                  <li>• Real-time availability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
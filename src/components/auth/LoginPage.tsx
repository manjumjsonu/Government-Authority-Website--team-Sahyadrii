import { useState } from 'react';
import { useAuth } from './AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import { ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  portal: string;
  onBack: () => void;
}

export function LoginPage({ portal, onBack }: LoginPageProps) {
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Farmer login states
  const [surveyNumber, setSurveyNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Standard login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup additional fields
  const [name, setName] = useState('');
  const [hobliId, setHobliId] = useState('');
  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [businessName, setBusinessName] = useState('');

  const handleFarmerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isOtpSent) {
        // Step 1: Simulate sending OTP
        // In a real app, this would call an API to send OTP
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        setIsOtpSent(true);
        setLoading(false);
        setError('Demo OTP sent! Enter 1234 to login.');
        return;
      }

      // Step 2: Verify OTP
      if (otp !== '1234') {
        throw new Error('Invalid OTP. Please enter 1234.');
      }

      const response = await fetch(
        `${getServerUrl()}/auth/farmer-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ surveyNumber, phone }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(
        {
          id: data.farmer.id,
          surveyNumber: data.farmer.surveyNumber,
          name: data.farmer.name,
          role: 'farmer',
        },
        data.token
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${getServerUrl()}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(
        {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.name,
          role: data.user.user_metadata.role,
        },
        data.accessToken
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = portal === 'government'
        ? '/auth/signup-authority'
        : '/auth/signup-vendor';

      const body = portal === 'government'
        ? { email, password, name, hobliId, district, taluk }
        : { email, password, name, vendorId, businessName };

      const response = await fetch(
        `${getServerUrl()}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setIsSignup(false);
      setError('Account created successfully! Please login.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPortalTitle = () => {
    switch (portal) {
      case 'government': return 'Government Portal';
      case 'farmer': return 'Farmer Portal';
      case 'vendor': return 'Vendor Portal';
      default: return 'Login';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to portal selection
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-gray-900 mb-6">{getPortalTitle()}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {portal === 'farmer' ? (
            // Farmer login form
            <form onSubmit={handleFarmerLogin} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Survey Number</label>
                <input
                  type="text"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your survey number"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your phone number"
                />
                <p className="text-gray-500 text-xs mt-1">Phone verification for added security</p>
              </div>

              {isOtpSent && (
                <div>
                  <label className="block text-gray-700 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter OTP (1234)"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (isOtpSent ? 'Login' : 'Get OTP')}
              </button>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
                <p className="mb-2">📞 <strong>Missed Call Service</strong></p>
                <p>Farmers can also get crop rates and schemes by giving a missed call to:</p>
                <p className="text-center text-lg mt-2">📱 1800-XXX-XXXX</p>
                <p className="text-xs text-gray-500 mt-2">(SMS with rates and schemes will be sent automatically)</p>
              </div>
            </form>
          ) : (
            // Standard login/signup form
            <form onSubmit={isSignup ? handleSignup : handleStandardLogin} className="space-y-4">
              {isSignup && (
                <div>
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              )}

              {isSignup && portal === 'government' && (
                <>
                  <div>
                    <label className="block text-gray-700 mb-2">Hobli ID</label>
                    <input
                      type="text"
                      value={hobliId}
                      onChange={(e) => setHobliId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter Hobli ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter district"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Taluk</label>
                    <input
                      type="text"
                      value={taluk}
                      onChange={(e) => setTaluk(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter taluk"
                      required
                    />
                  </div>
                </>
              )}

              {isSignup && portal === 'vendor' && (
                <>
                  <div>
                    <label className="block text-gray-700 mb-2">Vendor ID</label>
                    <input
                      type="text"
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter vendor ID"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter business name"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Login')}
              </button>

              {portal !== 'government' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError('');
                  }}
                  className="w-full text-green-600 hover:text-green-700 text-sm"
                >
                  {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

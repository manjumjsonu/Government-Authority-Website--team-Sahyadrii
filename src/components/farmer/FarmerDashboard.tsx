import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import { LogOut, Sprout, FileText, Package, TrendingUp, AlertCircle, CheckCircle, X } from 'lucide-react';
import { SchemeCard } from './SchemeCard';

interface FarmerDashboardProps {
  onLogout: () => void;
}

export function FarmerDashboard({ onLogout }: FarmerDashboardProps) {
  const { user, token } = useAuth();
  const [farmerData, setFarmerData] = useState<any>(null);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [cropRates, setCropRates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCropForm, setShowCropForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...new Set(schemes.map(s => s.category || 'General'))];
  const filteredSchemes = selectedCategory === 'All'
    ? schemes
    : schemes.filter(s => (s.category || 'General') === selectedCategory);

  const loadData = useCallback(async () => {
    if (!user?.surveyNumber) {
      setLoading(false);
      setError('Survey number not found. Please log in again.');
      return;
    }

    setError(null);
    try {
      // Load farmer data
      const farmerRes = await fetch(
        `${getServerUrl()}/farmers/${user.surveyNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const farmerData = await farmerRes.json();
      if (farmerData.success) {
        setFarmerData(farmerData.farmer);
      } else {
        setError(farmerData.error || 'Failed to load farmer data');
      }

      // Load schemes
      const schemesRes = await fetch(
        `${getServerUrl()}/schemes`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const schemesData = await schemesRes.json();
      if (schemesData.success) {
        setSchemes(schemesData.schemes || []);
      }

      // Load crop rates
      const ratesRes = await fetch(
        `${getServerUrl()}/crops/rates`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const ratesData = await ratesRes.json();
      if (ratesData.success) {
        setCropRates(ratesData.rates || {});
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.surveyNumber) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, loadData]);

  const getFarmerCrops = () => {
    if (farmerData?.crops && farmerData.crops.length) {
      return farmerData.crops;
    }
    if (farmerData?.crop) {
      return [farmerData.crop];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading your dashboard...</div>
      </div>
    );
  }

  if (error && !farmerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-gray-900">Error Loading Dashboard</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadData();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Retry
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const farmerCrops = getFarmerCrops();

  // Get crop types that the farmer is currently growing
  const activeCropTypes = farmerCrops.map((crop: any) => crop.cropType).filter(Boolean);

  // Filter crop rates to show only rates for farmer's active crops
  const relevantCropRates = Object.values(cropRates)
    .filter((rate: any) => {
      if (!rate || rate.rate == null) return false;
      // Show rate if it matches any of the farmer's active crop types
      return activeCropTypes.length > 0 && activeCropTypes.includes(rate.cropType);
    });

  const canUpdateCrop = () => {
    const referenceDate = farmerData?.lastCropUpdate || farmerCrops[0]?.lastUpdated;
    if (!referenceDate) return true;
    const lastUpdate = new Date(referenceDate).getTime();
    const now = Date.now();
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;
    return (now - lastUpdate) >= sixMonths;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-gray-900 text-4xl font-bold mb-1">Farmer Portal</h1>
              <p className="text-gray-600 text-base">Welcome, {farmerData?.name || user?.name || 'Farmer'}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadData();
              }}
              className="text-sm text-red-700 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        )}
        {/* Farmer Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-gray-900 mb-4">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Survey Number</span>
              <p className="text-gray-900">{farmerData?.surveyNumber}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone Number</span>
              <p className="text-gray-900">{farmerData?.phone}</p>
            </div>
            <div>
              <span className="text-gray-500">Location</span>
              <p className="text-gray-900">{farmerData?.village}, {farmerData?.hobli}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Crop Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-green-600" />
                <h3 className="text-gray-900">Crop Information</h3>
              </div>
              {canUpdateCrop() && (
                <button
                  onClick={() => setShowCropForm(true)}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  {farmerCrops.length ? 'Update Crops' : 'Add Crop'}
                </button>
              )}
            </div>

            {farmerCrops.length ? (
              <div className="space-y-4">
                {farmerCrops.map((crop: any, index: number) => (
                  <div key={crop.id || index} className="p-4 border border-gray-100 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-900 font-medium">{crop.cropType}</p>
                      <span className="text-xs text-gray-500">Entry #{index + 1}</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Quantity:{' '}
                      <span className="text-gray-900 font-medium">{crop.quantity} quintals</span>
                    </p>
                    <p className="text-gray-600 text-sm">
                      Planted:{' '}
                      <span className="text-gray-900">
                        {crop.plantedDate ? new Date(crop.plantedDate).toLocaleDateString() : '—'}
                      </span>
                    </p>
                    <p className="text-gray-600 text-sm">
                      Expected Harvest:{' '}
                      <span className="text-gray-900">
                        {crop.plantedDate
                          ? new Date(
                            new Date(crop.plantedDate).getTime() +
                            (crop.growthDays || 120) * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()
                          : '—'}
                      </span>
                    </p>
                  </div>
                ))}

                {!canUpdateCrop() && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700">
                      You can update crop details once per season (6 months). Contact your Hobli office
                      for any corrections needed.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No crop information added yet</p>
                <button
                  onClick={() => setShowCropForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Add Crop Details
                </button>
              </div>
            )}
          </div>

          {/* Current Crop Rates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-gray-900">Current Crop Rates (Your Crops)</h3>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {relevantCropRates.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-2">
                    {activeCropTypes.length === 0
                      ? 'No crops registered yet. Add your crop details to see rates.'
                      : 'No rates available for your registered crops yet.'}
                  </p>
                  {activeCropTypes.length === 0 && (
                    <button
                      onClick={() => setShowCropForm(true)}
                      className="text-sm text-green-600 hover:text-green-700 underline"
                    >
                      Add Crop Details
                    </button>
                  )}
                </div>
              ) : (
                relevantCropRates.map((rate: any) => (
                  <div
                    key={rate.cropType}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-900 font-medium">{rate.cropType || 'Unknown'}</span>
                    <div className="text-right">
                      <p className="text-green-600 font-semibold">₹{rate.rate?.toLocaleString() || '0'}</p>
                      <p className="text-gray-500 text-xs">per quintal</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fertilizer History */}
        {farmerData?.fertilizers && farmerData.fertilizers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-green-600" />
              <h3 className="text-gray-900">Fertilizer Distribution History</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmerData.fertilizers.map((dist: any) => (
                <div key={dist.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-gray-900">{dist.fertilizerType}</p>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-gray-600 text-sm">Quantity: {dist.quantity} kg</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(dist.distributionDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Government Schemes */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-gray-900">Government Schemes</h3>
                    <p className="text-gray-500 text-sm">Manage agricultural schemes for farmers</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-amber-50 rounded-lg text-sm text-gray-700">
                <p>📢 Schemes are visible to all farmers through web and SMS services</p>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {filteredSchemes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Schemes Found</p>
                  <p>There are currently no schemes available in this category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSchemes.map((scheme) => (
                    <div key={scheme.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-green-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full mb-2">
                            {scheme.category || 'General'}
                          </span>
                          <h4 className="text-gray-900 font-medium text-lg">{scheme.title}</h4>
                        </div>
                        {scheme.status && (
                          <span className={`px-2 py-1 text-xs rounded-full ${scheme.status?.toLowerCase() === 'active'
                              ? 'bg-green-100 text-green-700'
                              : scheme.status?.toLowerCase() === 'upcoming'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                            {scheme.status}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        {scheme.shortDescription || scheme.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block mb-1">Eligibility</span>
                          <p className="text-gray-700">{scheme.eligibility || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Benefit</span>
                          <p className="text-gray-700">{scheme.benefit || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 block mb-1">Documents Required</span>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(scheme.documentsRequired) && scheme.documentsRequired.length > 0 ? (
                              scheme.documentsRequired.map((doc: string, idx: number) => (
                                <span key={idx} className="text-gray-700 text-sm">
                                  {doc}
                                  {idx < scheme.documentsRequired.length - 1 && ','}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 italic">No specific documents listed</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {scheme.contactInfo && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                          <div className="text-gray-500">
                            Contact: <span className="text-gray-900 font-medium">{scheme.contactInfo}</span>
                          </div>
                          {scheme.link && (
                            <a
                              href={scheme.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 font-medium"
                            >
                              Apply Now →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Missed Call Service Info */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow p-6 mt-6 border border-blue-200">
          <h3 className="text-gray-900 mb-3">📞 Missed Call Service</h3>
          <p className="text-gray-700 mb-2">
            Get instant crop rates and schemes via SMS! Give a missed call to:
          </p>
          <p className="text-2xl text-center my-4">1800-XXX-XXXX</p>
          <p className="text-gray-600 text-sm text-center">
            You will receive an SMS with current crop rates and available schemes
          </p>
        </div>
      </div>

      {showCropForm && (
        <CropUpdateModal
          farmer={farmerData}
          onClose={() => setShowCropForm(false)}
          onSuccess={() => {
            loadData();
            setShowCropForm(false);
          }}
        />
      )}
    </div>
  );
}

function CropUpdateModal({ farmer, onClose, onSuccess }: any) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const primaryCrop = farmer?.crops && farmer.crops.length ? farmer.crops[0] : farmer?.crop;

  const [cropData, setCropData] = useState({
    cropType: primaryCrop?.cropType || '',
    quantity: primaryCrop?.quantity || '',
    plantedDate: primaryCrop?.plantedDate || new Date().toISOString().split('T')[0],
    growthDays: primaryCrop?.growthDays || 120,
  });

  const cropTypes = [
    'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton',
    'Tomato', 'Potato', 'Onion', 'Banana', 'Mango',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${getServerUrl()}/farmers/${farmer.surveyNumber}/crop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...cropData,
            quantity: parseFloat(cropData.quantity),
            growthDays: parseInt(cropData.growthDays.toString()),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update crop');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 modal-backdrop-blur flex items-center justify-center p-4 z-50"
      style={{
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      }}
    >
      <div className="bg-white rounded-lg max-w-md w-full border border-gray-200 shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-gray-900">Update Crop Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-700 mb-2">Crop Type *</label>
            <select
              value={cropData.cropType}
              onChange={(e) => setCropData({ ...cropData, cropType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select crop type</option>
              {cropTypes.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Quantity (quintals) *</label>
            <input
              type="number"
              value={cropData.quantity}
              onChange={(e) => setCropData({ ...cropData, quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              min="1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Planted Date *</label>
            <input
              type="date"
              value={cropData.plantedDate}
              onChange={(e) => setCropData({ ...cropData, plantedDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Growth Period (days) *</label>
            <input
              type="number"
              value={cropData.growthDays}
              onChange={(e) => setCropData({ ...cropData, growthDays: parseInt(e.target.value) || 120 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              min="30"
            />
            <p className="text-gray-500 text-xs mt-1">Typical growth period for harvest</p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-gray-700">
            <p>⚠️ You can only update crop details once per season (6 months)</p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Crop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

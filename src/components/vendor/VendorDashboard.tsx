import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import {
  LogOut,
  Search,
  MapPin,
  Phone,
  TrendingUp,
  Calendar,
  Package,
  AlertCircle,
} from 'lucide-react';

interface VendorDashboardProps {
  onLogout: () => void;
}

export function VendorDashboard({ onLogout }: VendorDashboardProps) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<any>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [demandData, setDemandData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const [searchFilters, setSearchFilters] = useState({
    state: '',
    district: '',
    taluk: '',
    hobli: '',
    village: '',
    cropType: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await fetch(
        `${getServerUrl()}/locations`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${getServerUrl()}/vendors/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(searchFilters),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.farmers || []);
        setDemandData(data.demandData || {});
      }
    } catch (error) {
      console.error('Error searching farmers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallRequest = (farmerPhone: string, farmerName: string) => {
    // In production, this would use a telecom API to create a masked call
    alert(`Call request initiated!\n\nIn production, this will:\n1. Create a virtual proxy number\n2. Connect you to ${farmerName}\n3. Protect both parties' privacy\n\nDemo phone: ${farmerPhone.replace(/\d(?=\d{4})/g, 'X')}`);
  };

  const getDistrictOptions = () => {
    if (!searchFilters.state || !locations.districts) return [];
    return locations.districts[searchFilters.state] || [];
  };

  const getTalukOptions = () => {
    if (!searchFilters.state || !searchFilters.district || !locations.taluks) return [];
    const key = `${searchFilters.state}:${searchFilters.district}`;
    return locations.taluks[key] || [];
  };

  const getHobliOptions = () => {
    if (!searchFilters.taluk || !locations.hoblis) return [];
    const key = `${searchFilters.state}:${searchFilters.district}:${searchFilters.taluk}`;
    return locations.hoblis[key] || [];
  };

  const getVillageOptions = () => {
    if (!searchFilters.hobli || !locations.villages) return [];
    const key = `${searchFilters.state}:${searchFilters.district}:${searchFilters.taluk}:${searchFilters.hobli}`;
    return locations.villages[key] || [];
  };

  const cropTypes = [
    'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton',
    'Tomato', 'Potato', 'Onion', 'Banana', 'Mango',
  ];

  const getFarmerCrops = (farmerRecord: any) => {
    if (farmerRecord?.crops && farmerRecord.crops.length) return farmerRecord.crops;
    if (farmerRecord?.crop) return [farmerRecord.crop];
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-gray-900 text-4xl font-bold mb-1">Vendor / Mandi Portal</h1>
              <p className="text-gray-600 text-base">Welcome, {user?.name}</p>
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
        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-blue-600" />
            <h3 className="text-gray-900">Search Farmers & Crops</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 text-sm mb-2">State</label>
              <select
                value={searchFilters.state}
                onChange={(e) =>
                  setSearchFilters({
                    state: e.target.value,
                    district: '',
                    taluk: '',
                    hobli: '',
                    village: '',
                    cropType: searchFilters.cropType,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All States</option>
                {(locations.states || []).map((state: string) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2">District</label>
              <select
                value={searchFilters.district}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    district: e.target.value,
                    taluk: '',
                    hobli: '',
                    village: '',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={!searchFilters.state}
              >
                <option value="">All Districts</option>
                {getDistrictOptions().map((district: string) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2">Taluk</label>
              <select
                value={searchFilters.taluk}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    taluk: e.target.value,
                    hobli: '',
                    village: '',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={!searchFilters.district}
              >
                <option value="">All Taluks</option>
                {getTalukOptions().map((taluk: string) => (
                  <option key={taluk} value={taluk}>
                    {taluk}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2">Hobli</label>
              <select
                value={searchFilters.hobli}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    hobli: e.target.value,
                    village: '',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={!searchFilters.taluk}
              >
                <option value="">All Hoblis</option>
                {getHobliOptions().map((hobli: string) => (
                  <option key={hobli} value={hobli}>
                    {hobli}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2">Village</label>
              <select
                value={searchFilters.village}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, village: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={!searchFilters.hobli}
              >
                <option value="">All Villages</option>
                {getVillageOptions().map((village: string) => (
                  <option key={village} value={village}>
                    {village}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 text-sm mb-2">Crop Type</label>
              <select
                value={searchFilters.cropType}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, cropType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Crops</option>
                {cropTypes.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchFilters({
                    state: '',
                    district: '',
                    taluk: '',
                    hobli: '',
                    village: '',
                    cropType: '',
                  });
                  setSearchResults([]);
                  setDemandData({});
                }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Demand Indicators */}
        {Object.keys(demandData).length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 mb-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-gray-900">Demand Indicators</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(demandData).map(([cropType, stats]: [string, any]) => (
                <div key={cropType} className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="text-gray-900 mb-2">{cropType}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Supply:</span>
                      <span className="text-gray-900">{stats.totalQuantity} quintals</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Farmers:</span>
                      <span className="text-gray-900">{stats.farmerCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Demand Level:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          stats.demand === 'high'
                            ? 'bg-green-100 text-green-800'
                            : stats.demand === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {stats.demand.toUpperCase()}
                      </span>
                    </div>
                    {stats.nearestHarvest && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Harvest:</span>
                        <span className="text-gray-900">
                          {new Date(stats.nearestHarvest).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200 text-sm text-gray-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Demand Indicators:</strong> High demand = &gt;1000 quintals, Medium = 500-1000
                quintals, Low = &lt;500 quintals. This helps you plan your procurement efficiently.
              </p>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-gray-900">
              Search Results {searchResults.length > 0 && `(${searchResults.length} farmers found)`}
            </h3>
          </div>

          {searchResults.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2">No results yet</p>
              <p className="text-sm">Use the filters above to search for farmers and crops</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700">Farmer Name</th>
                    <th className="text-left py-3 px-4 text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 text-gray-700">Crop</th>
                    <th className="text-left py-3 px-4 text-gray-700">Quantity</th>
                    <th className="text-left py-3 px-4 text-gray-700">Harvest Date</th>
                    <th className="text-left py-3 px-4 text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((farmer: any) => (
                    <tr key={farmer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-gray-900">{farmer.name}</p>
                          <p className="text-gray-500 text-xs">Survey: {farmer.surveyNumber}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p>{farmer.village}</p>
                            <p className="text-xs">{farmer.hobli}, {farmer.taluk}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getFarmerCrops(farmer).length ? (
                          <div className="flex flex-wrap gap-2">
                            {getFarmerCrops(farmer).map((crop: any, idx: number) => (
                              <span
                                key={crop.id || `${farmer.id}-crop-${idx}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                              >
                                {crop.cropType}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {getFarmerCrops(farmer).length ? (
                          <div className="space-y-1">
                            {getFarmerCrops(farmer).map((crop: any, idx: number) => (
                              <p key={crop.id || `${farmer.id}-qty-${idx}`}>{crop.quantity} quintals</p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {getFarmerCrops(farmer).length ? (
                          <div className="space-y-1">
                            {getFarmerCrops(farmer).map((crop: any, idx: number) => {
                              if (!crop.plantedDate) {
                                return (
                                  <div key={crop.id || `${farmer.id}-harvest-${idx}`} className="text-xs text-gray-500">
                                    No planted date
                                  </div>
                                );
                              }
                              const harvestDate = new Date(
                                new Date(crop.plantedDate).getTime() +
                                  (crop.growthDays || 120) * 24 * 60 * 60 * 1000
                              );
                              return (
                                <div key={crop.id || `${farmer.id}-harvest-${idx}`} className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span>{harvestDate.toLocaleDateString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleCallRequest(farmer.phone, farmer.name)}
                          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                        >
                          <Phone className="w-3 h-3" />
                          Call Me
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-700">
          <p className="mb-2">
            <strong>🔒 Privacy Protection:</strong>
          </p>
          <p>
            The "Call Me" feature uses virtual proxy numbers (like Uber/Ola) to protect both farmers'
            and vendors' privacy. Real phone numbers are never exposed during calls.
          </p>
        </div>
      </div>
    </div>
  );
}
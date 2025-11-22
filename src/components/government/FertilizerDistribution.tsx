import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import { Package, Search } from 'lucide-react';

interface FertilizerDistributionProps {
  onUpdate?: () => void;
}

export function FertilizerDistribution({ onUpdate }: FertilizerDistributionProps) {
  const { token } = useAuth();
  const [surveyNumber, setSurveyNumber] = useState('');
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [distributionData, setDistributionData] = useState({
    fertilizerType: '',
    quantity: '',
    distributionDate: new Date().toISOString().split('T')[0],
  });

  const fertilizerTypes = [
    'Urea',
    'DAP (Di-Ammonium Phosphate)',
    'NPK (Nitrogen, Phosphorus, Potassium)',
    'Potash',
    'Organic Compost',
    'Vermicompost',
  ];

  const searchFarmer = async () => {
    setLoading(true);
    setError('');
    setFarmer(null);

    try {
      const response = await fetch(
        `${getServerUrl()}/farmers/${surveyNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Farmer not found');
      }

      setFarmer(data.farmer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resolveFarmerCrops = (farmerRecord: any) => {
    if (!farmerRecord) return [];
    if (farmerRecord.crops && farmerRecord.crops.length) return farmerRecord.crops;
    return farmerRecord.crop ? [farmerRecord.crop] : [];
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${getServerUrl()}/fertilizers/distribute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            surveyNumber: farmer.surveyNumber,
            ...distributionData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record distribution');
      }

      setSuccess(`Fertilizer distributed successfully! SMS notification sent to ${farmer.phone}`);
      setDistributionData({
        fertilizerType: '',
        quantity: '',
        distributionDate: new Date().toISOString().split('T')[0],
      });
      
      // Reload farmer data to show updated history
      await searchFarmer();
      
      // Notify parent to refresh stats
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-gray-900">Fertilizer Distribution</h3>
          <p className="text-gray-500 text-sm">Record fertilizer distribution to farmers</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Search Farmer */}
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Search Farmer by Survey Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={surveyNumber}
              onChange={(e) => setSurveyNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchFarmer()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter survey number"
            />
            <button
              onClick={searchFarmer}
              disabled={loading || !surveyNumber}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && !farmer && (
            <p className="mt-2 text-red-600 text-sm">{error}</p>
          )}
        </div>

        {/* Farmer Details */}
        {farmer && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <h4 className="text-gray-900 mb-4">Farmer Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="text-gray-900">{farmer.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Survey Number:</span>
                <p className="text-gray-900">{farmer.surveyNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <p className="text-gray-900">{farmer.phone}</p>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <p className="text-gray-900">{farmer.village}, {farmer.hobli}</p>
              </div>
              {resolveFarmerCrops(farmer).length > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-500">Current Crops:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {resolveFarmerCrops(farmer).map((crop: any, idx: number) => (
                      <span
                        key={crop.id || `${farmer.id}-crop-${idx}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                      >
                        {crop.cropType}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Distribution Form */}
        {farmer && (
          <form onSubmit={handleDistribute} className="space-y-4">
            <h4 className="text-gray-900">Record Distribution</h4>

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-700 mb-2">Fertilizer Type *</label>
              <select
                value={distributionData.fertilizerType}
                onChange={(e) =>
                  setDistributionData({ ...distributionData, fertilizerType: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select fertilizer type</option>
                {fertilizerTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Quantity (in kg) *</label>
              <input
                type="number"
                value={distributionData.quantity}
                onChange={(e) =>
                  setDistributionData({ ...distributionData, quantity: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter quantity in kg"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Distribution Date *</label>
              <input
                type="date"
                value={distributionData.distributionDate}
                onChange={(e) =>
                  setDistributionData({ ...distributionData, distributionDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Recording Distribution...' : 'Record Distribution & Send SMS'}
            </button>

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
              <p>📱 An SMS notification will be sent to the farmer's phone upon distribution.</p>
            </div>
          </form>
        )}

        {/* Distribution History */}
        {farmer && farmer.fertilizers && farmer.fertilizers.length > 0 && (
          <div className="mt-8">
            <h4 className="text-gray-900 mb-4">Distribution History</h4>
            <div className="space-y-3">
              {farmer.fertilizers.map((dist: any) => (
                <div
                  key={dist.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-900">{dist.fertilizerType}</p>
                      <p className="text-gray-600">Quantity: {dist.quantity} kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">
                        {new Date(dist.distributionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

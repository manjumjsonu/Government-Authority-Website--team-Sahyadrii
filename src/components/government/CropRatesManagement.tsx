import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import { TrendingUp, Edit2, Save } from 'lucide-react';

interface CropRate {
  cropType: string;
  rate: number;
  unit: string;
  lastUpdated: string;
}

export function CropRatesManagement() {
  const { token } = useAuth();
  const [rates, setRates] = useState<Record<string, CropRate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCrop, setEditingCrop] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState('');

  const commonCrops = [
    'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton', 
    'Tomato', 'Potato', 'Onion', 'Banana', 'Mango'
  ];

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const response = await fetch(
        `${getServerUrl()}/crops/rates`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setRates(data.rates || {});
      }
    } catch (error) {
      console.error('Error loading crop rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cropType: string) => {
    setEditingCrop(cropType);
    setTempRate(rates[cropType]?.rate?.toString() || '');
  };

  const handleSave = async (cropType: string) => {
    setSaving(true);
    try {
      const updatedRates = {
        ...rates,
        [cropType]: {
          cropType,
          rate: parseFloat(tempRate),
          unit: 'per quintal',
          lastUpdated: new Date().toISOString(),
        },
      };

      const response = await fetch(
        `${getServerUrl()}/crops/rates`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updatedRates),
        }
      );

      const data = await response.json();
      if (data.success) {
        setRates(updatedRates);
        setEditingCrop(null);
      }
    } catch (error) {
      console.error('Error saving crop rate:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading crop rates...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-gray-900">Crop Rates Management</h3>
          <p className="text-gray-500 text-sm">Update current market rates for crops</p>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
        <p>💡 These rates are shown to farmers via SMS and web portal. Update regularly for accurate information.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commonCrops.map((crop) => (
          <div
            key={crop}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-green-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="text-gray-900">{crop}</h4>
                <div className="mt-2">
                  {editingCrop === crop ? (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">₹</span>
                      <input
                        type="number"
                        value={tempRate}
                        onChange={(e) => setTempRate(e.target.value)}
                        className="w-32 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Rate"
                        autoFocus
                      />
                      <span className="text-gray-600 text-sm">/ quintal</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      {rates[crop] && rates[crop].rate != null ? (
                        <>
                          <span className="text-green-600">₹{rates[crop].rate.toLocaleString()}</span>
                          <span className="text-gray-500 text-sm">per quintal</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">Not set</span>
                      )}
                    </div>
                  )}
                </div>
                {rates[crop]?.lastUpdated && editingCrop !== crop && (
                  <p className="text-xs text-gray-400 mt-1">
                    Updated: {new Date(rates[crop].lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div>
                {editingCrop === crop ? (
                  <button
                    onClick={() => handleSave(crop)}
                    disabled={saving || !tempRate}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(crop)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

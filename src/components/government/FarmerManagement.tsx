import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl } from '../../utils/supabase/info';
import { Plus, Search, Edit2, X, Trash2, MessageSquare } from 'lucide-react';

interface CropEntry {
  id?: string;
  cropType: string;
  quantity: number;
  plantedDate: string;
  growthDays: number;
  lastUpdated?: string;
}

interface Farmer {
  id: string;
  surveyNumber: string;
  name: string;
  phone: string;
  state: string;
  district: string;
  taluk: string;
  hobli: string;
  village: string;
  crop?: CropEntry; // legacy support
  crops?: CropEntry[];
  lastCropUpdate?: string;
}

export function FarmerManagement({ onUpdate }: { onUpdate: () => void }) {
  const { token } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [cropFarmer, setCropFarmer] = useState<Farmer | null>(null);
  const [sendingSms, setSendingSms] = useState<string | null>(null);

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      const response = await fetch(
        `${getServerUrl()}/farmers`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setFarmers(data.farmers || []);
      }
    } catch (error) {
      console.error('Error loading farmers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFarmerCrops = (farmer: Farmer) => {
    if (farmer.crops && farmer.crops.length) {
      return farmer.crops;
    }
    if (farmer.crop) {
      return [farmer.crop];
    }
    return [];
  };

  const filteredFarmers = farmers.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.surveyNumber.includes(searchTerm) ||
    f.phone.includes(searchTerm)
  );

  const sendSmsToFarmer = async (phone: string, farmerName?: string) => {
    setSendingSms(phone);
    try {
      // Format phone number (add +91 if not present)
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      const response = await fetch(
        `${getServerUrl()}/sms/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ phone: formattedPhone }),
        }
      );

      // Handle 404 - Function not deployed
      if (response.status === 404) {
        alert(`❌ 404 Error: Edge Function not deployed!\n\nPlease deploy the function to Supabase:\n1. Go to Supabase Dashboard → Edge Functions\n2. Create function: make-server-e097b8bf\n3. Deploy the function\n\nSee DEPLOY_NOW.md for details.`);
        return;
      }

      // Check if response is OK and has content
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Response text:', text);
            alert(`❌ Server returned invalid response. Please check console for details.`);
            return;
          }
        } else {
          data = { success: false, error: 'Empty response from server' };
        }
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        alert(`❌ Server error: ${response.status} ${response.statusText}\n\nResponse: ${text.substring(0, 100)}`);
        return;
      }
      
      if (data.success) {
        alert(`✅ SMS sent successfully to ${farmerName || formattedPhone}\n\nMessage includes crop rates and scheme information.`);
      } else {
        alert(`❌ Failed to send SMS: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('SMS send error:', error);
      alert(`❌ Error sending SMS: ${error.message || 'Network error. Please try again.'}`);
    } finally {
      setSendingSms(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-gray-900">Farmer Management</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add Farmer
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, survey number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading farmers...</div>
      ) : filteredFarmers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No farmers found matching your search' : 'No farmers registered yet'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-700">Survey Number</th>
                <th className="text-left py-3 px-4 text-gray-700">Name</th>
                <th className="text-left py-3 px-4 text-gray-700">Phone</th>
                <th className="text-left py-3 px-4 text-gray-700">Location</th>
                <th className="text-left py-3 px-4 text-gray-700">Current Crop</th>
                <th className="text-left py-3 px-4 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFarmers.map((farmer) => (
                <tr key={farmer.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{farmer.surveyNumber}</td>
                  <td className="py-3 px-4">{farmer.name}</td>
                  <td className="py-3 px-4">{farmer.phone}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {farmer.village}, {farmer.hobli}
                  </td>
                  <td className="py-3 px-4">
                    {getFarmerCrops(farmer).length ? (
                      <div className="flex flex-wrap gap-2">
                        {getFarmerCrops(farmer).map((crop) => (
                          <span
                            key={crop.id || `${farmer.id}-${crop.cropType}`}
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
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setCropFarmer(farmer)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Manage Crop
                      </button>
                      <button
                        onClick={() => sendSmsToFarmer(farmer.phone, farmer.name)}
                        disabled={sendingSms === farmer.phone}
                        className={`text-purple-600 hover:text-purple-700 disabled:opacity-50 ${sendingSms === farmer.phone ? 'animate-pulse' : ''}`}
                        title="Send SMS with crop rates to farmer"
                      >
                        {sendingSms === farmer.phone ? (
                          <span className="text-xs">Sending...</span>
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingFarmer(farmer)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showAddModal || editingFarmer) && (
        <FarmerModal
          farmer={editingFarmer}
          onClose={() => {
            setShowAddModal(false);
            setEditingFarmer(null);
          }}
          onSave={() => {
            loadFarmers();
            onUpdate();
            setShowAddModal(false);
            setEditingFarmer(null);
          }}
        />
      )}

      {cropFarmer && (
        <FarmerCropModal
          farmer={cropFarmer}
          onClose={() => setCropFarmer(null)}
          onSave={() => {
            loadFarmers();
            onUpdate();
            setCropFarmer(null);
          }}
        />
      )}
    </div>
  );
}

function FarmerModal({ farmer, onClose, onSave }: {
  farmer: Farmer | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    surveyNumber: farmer?.surveyNumber || '',
    name: farmer?.name || '',
    phone: farmer?.phone || '',
    state: farmer?.state || '',
    district: farmer?.district || '',
    taluk: farmer?.taluk || '',
    hobli: farmer?.hobli || '',
    village: farmer?.village || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = farmer
        ? `${getServerUrl()}/farmers/${farmer.surveyNumber}`
        : `${getServerUrl()}/farmers`;

      const response = await fetch(url, {
        method: farmer ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save farmer');
      }

      onSave();
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scroll border border-gray-200 shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-gray-900">{farmer ? 'Edit Farmer' : 'Add New Farmer'}</h3>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Survey Number *</label>
              <input
                type="text"
                value={formData.surveyNumber}
                onChange={(e) => setFormData({ ...formData, surveyNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={!!farmer}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">State *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">District *</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Taluk *</label>
              <input
                type="text"
                value={formData.taluk}
                onChange={(e) => setFormData({ ...formData, taluk: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Hobli *</label>
              <input
                type="text"
                value={formData.hobli}
                onChange={(e) => setFormData({ ...formData, hobli: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Village *</label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
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
              {loading ? 'Saving...' : 'Save Farmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FarmerCropModal({ farmer, onClose, onSave }: { farmer: Farmer; onClose: () => void; onSave: () => void }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  type CropFormEntry = {
    id?: string;
    tempId: string;
    cropType: string;
    quantity: string;
    plantedDate: string;
    growthDays: string;
  };

  const createTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const createEmptyEntry = (): CropFormEntry => ({
    tempId: createTempId(),
    cropType: '',
    quantity: '',
    plantedDate: new Date().toISOString().split('T')[0],
    growthDays: '120',
  });

  const existingCrops = (farmer.crops && farmer.crops.length ? farmer.crops : farmer.crop ? [farmer.crop] : []) as CropEntry[];

  const [crops, setCrops] = useState<CropFormEntry[]>(
    existingCrops.length
      ? existingCrops.map((entry) => ({
          id: entry.id,
          tempId: entry.id || createTempId(),
          cropType: entry.cropType || '',
          quantity: entry.quantity?.toString() || '',
          plantedDate: entry.plantedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          growthDays: entry.growthDays?.toString() || '120',
        }))
      : [createEmptyEntry()]
  );

  const cropTypes = [
    'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton',
    'Tomato', 'Potato', 'Onion', 'Banana', 'Mango',
  ];

  const updateCrop = (index: number, field: keyof CropFormEntry, value: string) => {
    setCrops((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry))
    );
  };

  const addCropEntry = () => {
    setCrops((prev) => [...prev, createEmptyEntry()]);
  };

  const removeCropEntry = (index: number) => {
    if (crops.length === 1) return;
    setCrops((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedCrops = crops
        .map((entry) => ({
          id: entry.id,
          cropType: entry.cropType.trim(),
          quantity: parseFloat(entry.quantity),
          plantedDate: entry.plantedDate,
          growthDays: parseInt(entry.growthDays, 10) || 120,
        }))
        .filter((entry) => entry.cropType && entry.quantity > 0 && entry.plantedDate);

      if (!normalizedCrops.length) {
        setError('Please add at least one crop with a valid type, quantity, and planted date.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${getServerUrl()}/farmers/${farmer.surveyNumber}/crop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ crops: normalizedCrops }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update crop information');
      }

      onSave();
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scroll border border-gray-200 shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h3 className="text-gray-900">Manage Crops</h3>
            <p className="text-gray-500 text-sm">Farmer: {farmer.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {crops.map((entry, index) => (
              <div key={entry.tempId} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-gray-900 font-medium">Crop #{index + 1}</h4>
                  {crops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCropEntry(index)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Crop Type *</label>
                    <select
                      value={entry.cropType}
                      onChange={(e) => updateCrop(index, 'cropType', e.target.value)}
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
                      min="1"
                      step="0.1"
                      value={entry.quantity}
                      onChange={(e) => updateCrop(index, 'quantity', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter quantity"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Planted Date *</label>
                    <input
                      type="date"
                      value={entry.plantedDate}
                      onChange={(e) => updateCrop(index, 'plantedDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Growth Days *</label>
                    <input
                      type="number"
                      min="30"
                      value={entry.growthDays}
                      onChange={(e) => updateCrop(index, 'growthDays', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Average growth period in days"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCropEntry}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add another crop
          </button>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            Updates made here sync instantly with farmer and vendor portals. Farmers remain limited to one
            self-service update per season; authority overrides are unrestricted.
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
              {loading ? 'Saving...' : 'Save Crops'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

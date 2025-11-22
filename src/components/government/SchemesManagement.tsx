import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import { FileText, Plus, X, Calendar, ExternalLink, Info, Edit2, Trash2 } from 'lucide-react';

interface Scheme {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  detailedDescription: string;
  description?: string; // Legacy field support
  eligibility: string;
  benefit: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  documentsRequired: string[];
  source: string;
  link: string;
  status: string;
  language: string;
  contactInfo: string;
  createdAt: string;
}

export function SchemesManagement({ onUpdate }: { onUpdate: () => void }) {
  const { token } = useAuth();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    try {
      const response = await fetch(
        `${getServerUrl()}/schemes`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSchemes(data.schemes || []);
      }
    } catch (error) {
      console.error('Error loading schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // if (!confirm('Are you sure you want to delete this scheme? This action cannot be undone.')) {
    //   return;
    // }
    console.log('Deleting scheme:', id);
    try {
      const response = await fetch(
        `${getServerUrl()}/schemes/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        loadSchemes();
        onUpdate();
      } else {
        alert('Failed to delete scheme');
      }
    } catch (error) {
      console.error('Error deleting scheme:', error);
      alert('Error deleting scheme');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="text-gray-900">Government Schemes</h3>
            <p className="text-gray-500 text-sm">Manage agricultural schemes for farmers</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add Scheme
        </button>
      </div>

      <div className="mb-4 p-4 bg-amber-50 rounded-lg text-sm text-gray-700">
        <p>📢 Schemes are visible to all farmers through web and SMS services</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading schemes...</div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No schemes added yet. Add your first scheme to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-green-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full mb-2">
                    {scheme.category || 'General'}
                  </span>
                  <h4 className="text-gray-900 font-medium text-lg">{scheme.title}</h4>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${scheme.status === 'Active' ? 'bg-green-100 text-green-700' :
                  scheme.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                  {scheme.status || 'Active'}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4">{scheme.shortDescription || scheme.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block mb-1">Eligibility</span>
                  <p className="text-gray-700">{scheme.eligibility}</p>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Benefit</span>
                  <p className="text-gray-700">{scheme.benefit}</p>
                </div>
                {(scheme.applicationStartDate || scheme.applicationEndDate) && (
                  <div className="col-span-2 flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Apply between: {scheme.applicationStartDate ? new Date(scheme.applicationStartDate).toLocaleDateString() : 'N/A'}
                      {' - '}
                      {scheme.applicationEndDate ? new Date(scheme.applicationEndDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-500 block mb-1">Documents Required</span>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(scheme.documentsRequired) ? scheme.documentsRequired.map((doc, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                        {doc}
                      </span>
                    )) : <span className="text-gray-500 italic">No specific documents listed</span>}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <div className="text-gray-500">
                  Source: <span className="text-gray-900 font-medium">{scheme.source || 'Government'}</span>
                </div>
                {scheme.link && (
                  <a
                    href={scheme.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    Visit Official Site <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingScheme(scheme);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(scheme.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <SchemeModal
          scheme={editingScheme}
          onClose={() => {
            setShowAddModal(false);
            setEditingScheme(null);
          }}
          onSave={() => {
            loadSchemes();
            onUpdate();
            setShowAddModal(false);
            setEditingScheme(null);
          }}
        />
      )}
    </div>
  );
}

function SchemeModal({ scheme, onClose, onSave }: { scheme?: Scheme | null; onClose: () => void; onSave: () => void }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: scheme?.title || '',
    category: scheme?.category || 'Subsidy',
    shortDescription: scheme?.shortDescription || '',
    detailedDescription: scheme?.detailedDescription || '',
    eligibility: scheme?.eligibility || '',
    benefit: scheme?.benefit || '',
    applicationStartDate: scheme?.applicationStartDate || '',
    applicationEndDate: scheme?.applicationEndDate || '',
    documentsRequired: scheme?.documentsRequired ? scheme.documentsRequired.join(', ') : '',
    source: scheme?.source || 'Central Govt',
    link: scheme?.link || '',
    status: scheme?.status || 'Active',
    language: scheme?.language || 'English',
    contactInfo: scheme?.contactInfo || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = scheme
        ? `${getServerUrl()}/schemes/${scheme.id}`
        : `${getServerUrl()}/schemes`;

      console.log('Sending request to:', url);
      const response = await fetch(
        url,
        {
          method: scheme ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            documentsRequired: formData.documentsRequired.split(',').map(d => d.trim()).filter(Boolean)
          }),
        }
      );

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${scheme ? 'update' : 'add'} scheme`);
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
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto modal-scroll border border-gray-200 shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-gray-900">{scheme ? 'Edit Scheme' : 'Add New Scheme'}</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Scheme Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                placeholder="e.g., PM-KISAN"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Subsidy">Subsidy</option>
                <option value="Insurance">Insurance</option>
                <option value="Credit Support">Credit Support</option>
                <option value="Technology Support">Technology Support</option>
                <option value="Training">Training</option>
                <option value="Compensation">Compensation</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Short Description (2-3 lines) *</label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={2}
                required
                placeholder="Brief summary for farmers..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Detailed Description</label>
              <textarea
                value={formData.detailedDescription}
                onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={4}
                placeholder="Full details for reference..."
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Eligibility Criteria *</label>
              <textarea
                value={formData.eligibility}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                required
                placeholder="Who can apply?"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Benefit Amount/Details *</label>
              <textarea
                value={formData.benefit}
                onChange={(e) => setFormData({ ...formData, benefit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                required
                placeholder="e.g., ₹6000 per year"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Application Start Date</label>
              <input
                type="date"
                value={formData.applicationStartDate}
                onChange={(e) => setFormData({ ...formData, applicationStartDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Application End Date</label>
              <input
                type="date"
                value={formData.applicationEndDate}
                onChange={(e) => setFormData({ ...formData, applicationEndDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Documents Required (Comma separated)</label>
              <input
                type="text"
                value={formData.documentsRequired}
                onChange={(e) => setFormData({ ...formData, documentsRequired: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Aadhaar, RTC, Bank Passbook..."
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Source / Authority</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Central Govt">Central Govt</option>
                <option value="State Govt">State Govt</option>
                <option value="Agriculture Dept">Agriculture Dept</option>
                <option value="Horticulture Dept">Horticulture Dept</option>
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Active">Active</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Official Link</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 mb-2 text-sm font-medium">Contact Information</label>
              <input
                type="text"
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Helpline number or email"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : scheme ? 'Update Scheme' : 'Add Scheme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

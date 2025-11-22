import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getServerUrl, publicAnonKey } from '../../utils/supabase/info';
import { FarmerManagement } from './FarmerManagement';
import { CropRatesManagement } from './CropRatesManagement';
import { SchemesManagement } from './SchemesManagement';
import { FertilizerDistribution } from './FertilizerDistribution';
import { LogOut, Users, TrendingUp, FileText, Package } from 'lucide-react';

interface GovernmentDashboardProps {
  onLogout: () => void;
}

export function GovernmentDashboard({ onLogout }: GovernmentDashboardProps) {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'farmers' | 'crops' | 'schemes' | 'fertilizers'>('farmers');
  const [stats, setStats] = useState({
    totalFarmers: 0,
    activeCrops: 0,
    activeSchemes: 0,
    fertilizerDistributions: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  // Refresh stats when fertilizers tab is activated
  useEffect(() => {
    if (activeTab === 'fertilizers') {
      loadStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      // Load farmers count
      const farmersRes = await fetch(
        `${getServerUrl()}/farmers`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      const farmersData = await farmersRes.json();

      // Load schemes count
      const schemesRes = await fetch(
        `${getServerUrl()}/schemes`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const schemesData = await schemesRes.json();

      // Calculate total fertilizer distributions from all farmers
      const totalFertilizerDistributions = farmersData.farmers?.reduce((total: number, farmer: any) => {
        if (farmer.fertilizers && Array.isArray(farmer.fertilizers)) {
          return total + farmer.fertilizers.length;
        }
        return total;
      }, 0) || 0;

      setStats({
        totalFarmers: farmersData.farmers?.length || 0,
        activeCrops:
          farmersData.farmers?.filter(
            (f: any) => (Array.isArray(f.crops) && f.crops.length) || f.crop
          )?.length || 0,
        activeSchemes: schemesData.schemes?.length || 0,
        fertilizerDistributions: totalFertilizerDistributions,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const tabs = [
    { id: 'farmers', label: 'Farmer Management', icon: Users },
    { id: 'crops', label: 'Crop Rates', icon: TrendingUp },
    { id: 'schemes', label: 'Schemes', icon: FileText },
    { id: 'fertilizers', label: 'Fertilizer Distribution', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-gray-900 text-4xl font-bold mb-1">Government Portal</h1>
              <p className="text-gray-600 text-base">{user?.name} - Hobli Authority</p>
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

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Farmers</p>
                <p className="text-gray-900 text-2xl mt-1">{stats.totalFarmers}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Crops</p>
                <p className="text-gray-900 text-2xl mt-1">{stats.activeCrops}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Schemes</p>
                <p className="text-gray-900 text-2xl mt-1">{stats.activeSchemes}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Fertilizer Dist.</p>
                <p className="text-gray-900 text-2xl mt-1">{stats.fertilizerDistributions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'farmers' && <FarmerManagement onUpdate={loadStats} />}
          {activeTab === 'crops' && <CropRatesManagement />}
          {activeTab === 'schemes' && <SchemesManagement onUpdate={loadStats} />}
          {activeTab === 'fertilizers' && <FertilizerDistribution onUpdate={loadStats} />}
        </div>
      </div>
    </div>
  );
}

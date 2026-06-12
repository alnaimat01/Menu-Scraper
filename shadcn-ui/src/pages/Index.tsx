import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { TalabatScraper } from '@/components/TalabatScraper';
import { DeliverooScraper } from '@/components/DeliverooScraper';
import { NoonFoodScraper } from '@/components/NoonFoodScraper';

export default function Index() {
  const [activeTab, setActiveTab] = useState<'talabat' | 'deliveroo' | 'noon'>('talabat');

  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem('menuExtractorUser') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('menuExtractorUser');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {currentUser.username} / {currentUser.role}
            </span>

            {/* Show Admin Dashboard button only for admin users */}
            {(currentUser.role === 'admin' ||
              currentUser.role === 'superadmin') && (
                <Button variant="default" onClick={() => navigate('/admin')}>
                  Admin Dashboard
                </Button>
              )}

            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileSpreadsheet className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Menu Extractor
            </h1>
          </div>

          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Excel استخراج منيو المطاعم بصيغة
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'talabat' ? 'default' : 'outline'}
              onClick={() => setActiveTab('talabat')}
            >
              Talabat
            </Button>

            <Button
              variant={activeTab === 'deliveroo' ? 'default' : 'outline'}
              onClick={() => setActiveTab('deliveroo')}
            >
              Deliveroo
            </Button>
            <Button
              variant={activeTab === 'noon' ? 'default' : 'outline'}
              onClick={() => setActiveTab('noon')}
            >
              Noon Food
            </Button>
          </div>

          {activeTab === 'talabat' && <TalabatScraper />}
          {activeTab === 'deliveroo' && <DeliverooScraper />}
          {activeTab === 'noon' && <NoonFoodScraper />}
        </div>
      </div>
    </div>
  );
}
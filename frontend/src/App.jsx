import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DatasetAudit from './components/DatasetAudit';
import PcaExplorer from './components/PcaExplorer';
import ModelComparison from './components/ModelComparison';
import ClusterProfiles from './components/ClusterProfiles';
import CommunitySearch from './components/CommunitySearch';
import HspcTuning from './components/HspcTuning';
import ExportModal from './components/ExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('comparison');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <DatasetAudit />}
        {activeTab === 'pca' && <PcaExplorer />}
        {activeTab === 'comparison' && <ModelComparison />}
        {activeTab === 'profiles' && <ClusterProfiles />}
        {activeTab === 'search' && <CommunitySearch />}
        {activeTab === 'tuning' && <HspcTuning />}
        {activeTab === 'export' && <ExportModal />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            Socio-Economic Community Profiling &bull; Unsupervised Machine Learning Research System
          </p>
          <p className="text-[11px] text-slate-400">
            Primary Dataset: UCI Communities and Crime (Michael Redmond, DOI: 10.24432/C53W3X) &bull; React + Vite Frontend &bull; FastAPI + SQLite Backend
          </p>
        </div>
      </footer>
    </div>
  );
}

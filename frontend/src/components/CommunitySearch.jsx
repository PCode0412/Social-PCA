import React, { useState, useEffect } from 'react';
import { Search, MapPin, Building, DollarSign, Home, Briefcase, HelpCircle } from 'lucide-react';
import { searchCommunities } from '../api';

export default function CommunitySearch() {
  const [query, setQuery] = useState('New');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  const handleSearch = (q) => {
    if (!q || q.trim().length === 0) return;
    setLoading(true);
    searchCommunities(q).then((res) => {
      setResults(res.matches || []);
      if (res.matches && res.matches.length > 0) {
        setSelectedCommunity(res.matches[0]);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    handleSearch(query);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Bar Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          Interactive Community Explorer
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Look up any of the 1,994 canonical US communities by name or state to inspect cluster assignments and socio-economic indicators.
        </p>

        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder="Search by community name (e.g. Berkeley, Springfield, Lakewood) or state code..."
              className="w-full bg-slate-800 text-slate-200 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <button
            onClick={() => handleSearch(query)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            Search
          </button>
        </div>
      </div>

      {/* Results & Deep Dive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Matching Community List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Matches Found ({results.length})
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching communities found. Try searching another name.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {results.map((comm) => {
                const isSelected = selectedCommunity?.community_idx === comm.community_idx;
                return (
                  <button
                    key={comm.community_idx}
                    onClick={() => setSelectedCommunity(comm)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-sm text-white'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm truncate">{comm.community_name}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-700 text-slate-300">
                        State {comm.state}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                      <span>Cluster {comm.assigned_cluster + 1}</span>
                      <span className="font-mono text-[11px]">
                        PC1: {comm.pc1} | PC2: {comm.pc2}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 2 Cols: Selected Community Detailed Profile */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCommunity ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Community Detail
                  </div>
                  <h3 className="text-2xl font-bold text-white">{selectedCommunity.community_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    State Jurisdiction Code: <span className="font-mono text-slate-200">{selectedCommunity.state}</span> &bull; Index: #{selectedCommunity.community_idx}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">HSPC Cluster</span>
                    <span className="text-xl font-bold text-indigo-400">Cluster {selectedCommunity.assigned_cluster + 1}</span>
                  </div>
                </div>
              </div>

              {/* Latent PCA Coordinates */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-[11px] text-slate-400 block font-medium">PC1 Coordinate</span>
                  <span className="text-lg font-bold font-mono text-white mt-0.5 block">{selectedCommunity.pc1}</span>
                  <span className="text-[10px] text-slate-400">Economic gradient axis</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-[11px] text-slate-400 block font-medium">PC2 Coordinate</span>
                  <span className="text-lg font-bold font-mono text-cyan-400 mt-0.5 block">{selectedCommunity.pc2}</span>
                  <span className="text-[10px] text-slate-400">Urban density axis</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Relative Position</span>
                  <span className="text-sm font-semibold text-emerald-400 mt-1 block">
                    {selectedCommunity.pc1 > 0 ? 'High Affluence' : 'High Need'}
                  </span>
                  <span className="text-[10px] text-slate-400">Standardized space</span>
                </div>
              </div>

              {/* Key Socio-Economic Indicators */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Key Canonical Socio-Economic Indicators (0.0 to 1.0 Decimal Scaled)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400">Median Household Income</span>
                      <p className="font-mono text-white font-bold text-sm mt-0.5">
                        {selectedCommunity.indicators.medIncome}
                      </p>
                    </div>
                    <DollarSign className="w-5 h-5 text-indigo-400" />
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400">Percent Below Poverty</span>
                      <p className="font-mono text-white font-bold text-sm mt-0.5">
                        {selectedCommunity.indicators.PctPopUnderPov}
                      </p>
                    </div>
                    <Briefcase className="w-5 h-5 text-amber-400" />
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400">Home Ownership Rate</span>
                      <p className="font-mono text-white font-bold text-sm mt-0.5">
                        {selectedCommunity.indicators.PctHousOwnOcc}
                      </p>
                    </div>
                    <Home className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400">Unemployment Rate</span>
                      <p className="font-mono text-white font-bold text-sm mt-0.5">
                        {selectedCommunity.indicators.PctUnemployed}
                      </p>
                    </div>
                    <Building className="w-5 h-5 text-rose-400" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
              Select a community from the left list to view detailed profile and indicator breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

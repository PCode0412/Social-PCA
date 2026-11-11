import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { BarChart3, Sliders, Layers, Sparkles, TrendingUp } from 'lucide-react';
import { fetchPcaOverview } from '../api';

export default function PcaExplorer() {
  const [pcaData, setPcaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domainBalanced, setDomainBalanced] = useState(false);
  const [selectedPc, setSelectedPc] = useState('PC1');

  useEffect(() => {
    setLoading(true);
    fetchPcaOverview(domainBalanced, 0.80).then((res) => {
      setPcaData(res);
      setLoading(false);
    });
  }, [domainBalanced]);

  if (loading || !pcaData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { retained_pcs, variance_retained_pct, scree_data, loadings, scatter_samples } = pcaData;
  const activePcInfo = loadings.find((l) => l.pc_name === selectedPc) || loadings[0];

  return (
    <div className="space-y-6">
      {/* Controls & Metrics Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Principal Component Analysis (PCA)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Dimensionality reduction preserving latent socio-economic structure from 89 indicators into orthogonal dimensions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={domainBalanced}
                onChange={(e) => setDomainBalanced(e.target.checked)}
                className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Domain-Balanced Block Scaling (HSPC Representation)</span>
            </label>
          </div>
        </div>

        {/* Retention Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <span className="text-xs text-slate-400 font-medium">Retained Dimensions</span>
            <p className="text-2xl font-bold text-indigo-400 mt-0.5">{retained_pcs} PCs</p>
            <span className="text-[11px] text-slate-400">80% Variance Criterion</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Retained Variance</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{variance_retained_pct}%</p>
            <span className="text-[11px] text-emerald-400/80">Information Preserved</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Dimension Compression</span>
            <p className="text-2xl font-bold text-cyan-400 mt-0.5">8.1x</p>
            <span className="text-[11px] text-slate-400">From 89 down to {retained_pcs}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">PC1 Dominance</span>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">
              {scree_data[0]?.explained_ratio ? (scree_data[0].explained_ratio * 100).toFixed(1) : 26.5}%
            </p>
            <span className="text-[11px] text-slate-400">Primary latent axis</span>
          </div>
        </div>
      </div>

      {/* Scree Plot and Variance Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Scree Plot (Eigenvalue Distribution)</h3>
              <p className="text-xs text-slate-400">Kaiser Rule: Eigenvalues &ge; 1.0 indicate viable components</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Elbow Point ~ PC4-PC5
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scree_data.slice(0, 15)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="pc" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Bar dataKey="eigenvalue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Eigenvalue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Cumulative Explained Variance</h3>
              <p className="text-xs text-slate-400">Target threshold (80%) reached at PC{retained_pcs}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {variance_retained_pct}% Total
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scree_data.slice(0, 15)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="pc" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(val) => [`${(val * 100).toFixed(1)}%`, 'Cumulative Variance']}
                />
                <Line type="monotone" dataKey="cumulative_ratio" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} name="Cumulative" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PC1-PC2 Latent Embedding Scatter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Latent Socio-Economic Manifold (PC1 vs PC2 Scatter)</h3>
            <p className="text-xs text-slate-400">
              PC1 contrasts economic affluence against economic constraint; PC2 reflects urban density and household structure.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Sample: {scatter_samples.length} Communities</span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis type="number" dataKey="pc1" name="PC1" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis type="number" dataKey="pc2" name="PC2" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <ZAxis range={[30, 30]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
                        <p className="font-bold text-white">{d.community_name}, {d.state}</p>
                        <p className="text-indigo-400">PC1: {d.pc1}</p>
                        <p className="text-cyan-400">PC2: {d.pc2}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter name="Communities" data={scatter_samples} fill="#6366f1" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Component Loadings & Interpretation Matrix */}
      {loadings && loadings.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Principal Component Loadings & Domain Drivers</h3>
              <p className="text-xs text-slate-400">Examine the substantive indicators driving each latent dimension</p>
            </div>
            {/* PC Selector pills */}
            <div className="flex flex-wrap gap-1.5">
              {loadings.slice(0, 6).map((item) => (
                <button
                  key={item.pc_name}
                  onClick={() => setSelectedPc(item.pc_name)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedPc === item.pc_name
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.pc_name} ({item.explained_variance}%)
                </button>
              ))}
            </div>
          </div>

          {activePcInfo && (
            <div className="space-y-6">
              {/* Domain Breakdown for this PC */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                <span className="text-xs font-semibold text-slate-300 mb-2 block">
                  Domain Composition of {activePcInfo.pc_name}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(activePcInfo.domain_pcts).map(([domain, pct]) => (
                    <div key={domain} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700/40">
                      <span className="text-[11px] text-slate-400">{domain}</span>
                      <p className="text-base font-bold text-white mt-0.5">{pct}%</p>
                      <div className="w-full bg-slate-700 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            domain === 'Economic' ? 'bg-indigo-400' : domain === 'Housing' ? 'bg-cyan-400' : domain === 'Demographic' ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Loadings Table: Top Positive & Top Negative */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Positive Loadings */}
                <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                    Top Positive Loadings (+)
                  </h4>
                  <div className="space-y-2">
                    {activePcInfo.top_positive.map((item) => (
                      <div key={item.feature} className="flex justify-between items-center text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <div>
                          <span className="font-mono text-slate-200">{item.feature}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.domain}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">+{item.loading}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Negative Loadings */}
                <div className="border border-rose-500/20 bg-rose-500/5 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">
                    Top Negative Loadings (&minus;)
                  </h4>
                  <div className="space-y-2">
                    {activePcInfo.top_negative.map((item) => (
                      <div key={item.feature} className="flex justify-between items-center text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <div>
                          <span className="font-mono text-slate-200">{item.feature}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.domain}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-rose-400">{item.loading}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts';
import { Users, TrendingUp, TrendingDown, MapPin, Tag, Sparkles } from 'lucide-react';
import { fetchClusterProfiles } from '../api';

const CLUSTER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export default function ClusterProfiles() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('HSPC (Hybrid Proposed)');
  const [activeClusterId, setActiveClusterId] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchClusterProfiles(selectedMethod, 4, 0.5).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [selectedMethod]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { profiles, scatter } = data;
  const activeProfile = profiles.find((p) => p.cluster_id === activeClusterId) || profiles[0];

  // Domain score data for bar chart
  const domainChartData = activeProfile
    ? Object.entries(activeProfile.domain_scores).map(([domain, z]) => ({
        domain,
        z_score: z
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header and Method Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Socio-Economic Cluster Profiling & Personas
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Substantive interpretation using original socio-economic indicators and standardized population differences (z-scores).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1">Linkage Method:</span>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setActiveClusterId(0);
              }}
              className="bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="HSPC (Hybrid Proposed)">HSPC (Hybrid Proposed)</option>
              <option value="PCA + Ward">PCA + Ward Linkage</option>
              <option value="PCA + Complete">PCA + Complete Linkage</option>
              <option value="PCA + Average">PCA + Average Linkage</option>
            </select>
          </div>
        </div>

        {/* Cluster Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {profiles.map((p) => {
            const isSelected = p.cluster_id === activeClusterId;
            const color = CLUSTER_COLORS[p.cluster_id % CLUSTER_COLORS.length];
            return (
              <button
                key={p.cluster_id}
                onClick={() => setActiveClusterId(p.cluster_id)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cluster {p.cluster_id + 1}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  ></span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 truncate">{p.persona_tag}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <span>{p.size} communities</span>
                  <span>&bull;</span>
                  <span className="font-mono text-indigo-400">{p.pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Cluster Deep-Dive */}
      {activeProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Domain Profile & Top Distinguishing Features */}
          <div className="lg:col-span-2 space-y-6">
            {/* Domain Standardized Z-Scores */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Domain Standardized Deviations (&sigma; from Population Mean)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Positive z indicates indicator values above national baseline; negative indicates below.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {activeProfile.persona_tag}
                </span>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainChartData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} domain={[-1.5, 1.5]} tickLine={false} />
                    <YAxis type="category" dataKey="domain" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      formatter={(val) => [`${val > 0 ? '+' : ''}${val} σ`, 'Standardized Difference']}
                    />
                    <Bar
                      dataKey="z_score"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Distinguishing Indicators Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-2">
                Top Distinguishing Features for Cluster {activeProfile.cluster_id + 1}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Ranked by magnitude of deviation (|z|) from the overall population average.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-700/60">
                    <tr>
                      <th className="py-2.5 px-3">Indicator</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3">Cluster Mean</th>
                      <th className="py-2.5 px-3">National Mean</th>
                      <th className="py-2.5 px-3">Deviation (z)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {activeProfile.top_features.map((f) => {
                      const isHigh = f.z_score > 0;
                      return (
                        <tr key={f.feature} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-200">{f.feature}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                              {f.domain}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{f.cluster_mean}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{f.pop_mean}</td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isHigh ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isHigh ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {isHigh ? '+' : ''}{f.z_score}&sigma;
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Representative Communities & Persona Breakdown */}
          <div className="space-y-6">
            {/* Persona Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">
                <Tag className="w-3.5 h-3.5" /> Analytical Persona
              </div>
              <h4 className="text-base font-bold text-white mb-2">{activeProfile.persona_tag}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                This cluster encompasses <strong className="text-slate-200">{activeProfile.size} communities</strong> ({activeProfile.pct}% of total sample). The profile exhibits distinct socio-economic characteristics across income, housing tenure, and family structure.
              </p>

              <div className="space-y-2 border-t border-slate-800 pt-4 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Economic Index</span>
                  <span className="font-mono font-bold text-white">
                    {activeProfile.domain_scores.Economic > 0 ? '+' : ''}
                    {activeProfile.domain_scores.Economic}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Housing Index</span>
                  <span className="font-mono font-bold text-white">
                    {activeProfile.domain_scores.Housing > 0 ? '+' : ''}
                    {activeProfile.domain_scores.Housing}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Demographic Index</span>
                  <span className="font-mono font-bold text-white">
                    {activeProfile.domain_scores.Demographic > 0 ? '+' : ''}
                    {activeProfile.domain_scores.Demographic}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Social / Family Index</span>
                  <span className="font-mono font-bold text-white">
                    {activeProfile.domain_scores.Social > 0 ? '+' : ''}
                    {activeProfile.domain_scores.Social}
                  </span>
                </div>
              </div>
            </div>

            {/* Representative Communities Nearest Centroid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-3">
                <MapPin className="w-3.5 h-3.5" /> Representative Communities
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Exemplar communities situated closest to this cluster's centroid:
              </p>
              <div className="space-y-2">
                {activeProfile.representative_communities?.map((comm) => (
                  <div
                    key={comm.community_idx || comm.community_name}
                    className="flex justify-between items-center p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs"
                  >
                    <span className="font-semibold text-slate-200">
                      {comm.name || comm.community_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[11px]">
                      State {comm.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Scatter Manifold */}
      {scatter && scatter.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Cluster Distribution on PC1-PC2 Manifold</h3>
              <p className="text-xs text-slate-400">Visualizing spatial cluster separation and boundaries</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {profiles.map((p) => (
                <span key={p.cluster_id} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CLUSTER_COLORS[p.cluster_id % CLUSTER_COLORS.length] }}
                  ></span>
                  <span className="text-slate-300">C{p.cluster_id + 1}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis type="number" dataKey="pc1" name="PC1" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis type="number" dataKey="pc2" name="PC2" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <ZAxis range={[35, 35]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{d.community_name}, State {d.state}</p>
                          <p className="text-indigo-400 font-semibold">Assigned Cluster: {d.cluster + 1}</p>
                          <p className="text-slate-400 text-[11px]">PC1: {d.pc1} | PC2: {d.pc2}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {profiles.map((p) => {
                  const clusterPoints = scatter.filter((s) => s.cluster === p.cluster_id);
                  return (
                    <Scatter
                      key={p.cluster_id}
                      name={`Cluster ${p.cluster_id + 1}`}
                      data={clusterPoints}
                      fill={CLUSTER_COLORS[p.cluster_id % CLUSTER_COLORS.length]}
                      fillOpacity={0.65}
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

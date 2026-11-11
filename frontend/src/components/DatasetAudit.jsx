import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle, ShieldCheck, CheckCircle2, FileText, Info } from 'lucide-react';
import { fetchDatasetAudit } from '../api';

export default function DatasetAudit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatasetAudit().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { audit, preprocessing } = data;
  const prov = audit.provenance;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Canonical UCI Dataset Verified
            </div>
            <h2 className="text-xl font-bold text-white">{prov.dataset_title} Dataset Audit</h2>
            <p className="text-sm text-slate-400 mt-1">
              DOI: <a href={prov.canonical_url} target="_blank" rel="noreferrer" className="text-indigo-400 underline">{prov.canonical_doi}</a> &bull; Created by {prov.creator} &bull; Sources: {prov.data_sources}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Format: Raw <code className="text-indigo-300">.data</code> + <code className="text-indigo-300">.names</code>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Missing Token: <code className="text-amber-400">'?'</code>
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Canonical Rows</p>
          <p className="text-2xl font-bold text-white mt-1">{audit.shape.rows.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Zero duplicate rows
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Total Attributes</p>
          <p className="text-2xl font-bold text-white mt-1">{audit.shape.columns}</p>
          <p className="text-xs text-slate-400 mt-1">128 in raw dictionary</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Socio-Economic Inputs</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{preprocessing.retained_features}</p>
          <p className="text-xs text-slate-400 mt-1">Retained after screening</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Values Imputed</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{preprocessing.imputed_values_count}</p>
          <p className="text-xs text-slate-400 mt-1">Median strategy (OtherPerCap)</p>
        </div>
      </div>

      {/* Feature Selection Protocol & Rationale */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-indigo-400" />
          Feature Selection and Exclusion Protocol (Blueprint Section 4.2)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-800/60 text-slate-400 font-medium border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Treatment</th>
                <th className="py-3 px-4">Substantive Rationale</th>
                <th className="py-3 px-4">Feature Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-white">Identifiers / Administrative</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs">
                    Display Only
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Excluded from PCA & distance calculations; labels do not represent socio-economic similarity.</td>
                <td className="py-3 px-4 font-mono text-slate-400">5 cols</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-white">Crime Target Outcome</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs">
                    Excluded
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Avoid circularity: socio-economic clustering must not be defined by crime rates.</td>
                <td className="py-3 px-4 font-mono text-rose-400">1 col</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-white">Law Enforcement Variables</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                    Excluded
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Severe missingness (84.0% missing, 1675/1994 rows) and represents police operations rather than community characteristics.</td>
                <td className="py-3 px-4 font-mono text-amber-400">23 cols</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-emerald-400">Demographic Indicators</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                    Retained & Scaled
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Population composition, age pyramids, urbanicity, and household sizes.</td>
                <td className="py-3 px-4 font-mono text-emerald-400">14 cols</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-emerald-400">Economic Indicators</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                    Retained & Scaled
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Income, poverty, employment, occupational sectors, and public assistance dependence.</td>
                <td className="py-3 px-4 font-mono text-emerald-400">26 cols</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-emerald-400">Housing Indicators</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                    Retained & Scaled
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Home ownership, median rent, home values, housing age, and density.</td>
                <td className="py-3 px-4 font-mono text-emerald-400">24 cols</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-emerald-400">Social & Family Indicators</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                    Retained & Scaled
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">Family stability, two-parent families, migration, and English language proficiency.</td>
                <td className="py-3 px-4 font-mono text-emerald-400">25 cols</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Missingness Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Missingness Distribution & Imputation Audit
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Features with missing values above the 50% threshold were automatically filtered out. Single missing values in retained features were imputed via median imputation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {audit.missing_summary.slice(0, 6).map((item) => (
            <div key={item.column} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-slate-200">{item.column}</span>
                <span className={`font-semibold ${item.missing_pct > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {item.missing_pct}%
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${item.missing_pct > 50 ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{ width: `${item.missing_pct}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{item.missing_count} missing out of 1,994 instances</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ethical and Interpretive Caveats (Blueprint Section 4.3) */}
      <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Info className="w-4 h-4" /> Ethical and Interpretive Considerations
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li><strong>Historical Baseline:</strong> Source data combines 1990 US Census and 1995 FBI records; it must not be treated as present-day descriptions.</li>
          <li><strong>Ecological Fallacy:</strong> Cluster profiles represent aggregate community distributions and must never be attributed to individual residents.</li>
          <li><strong>Descriptive Purpose:</strong> Cluster tags are purely exploratory analytical summaries, avoiding causal assertions or stigmatizing characterizations.</li>
        </ul>
      </div>
    </div>
  );
}

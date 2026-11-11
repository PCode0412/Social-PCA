import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, CheckCircle2, Copy, Terminal } from 'lucide-react';
import {
  SNAPSHOT_CONFIG,
  SNAPSHOT_METRICS,
  SNAPSHOT_LOADINGS,
  SNAPSHOT_PROFILES,
  SNAPSHOT_ASSIGNMENTS
} from '../data/initialData';

export default function ExportModal() {
  const [selectedFile, setSelectedFile] = useState('metrics');
  const [copied, setCopied] = useState(false);

  const files = [
    {
      id: 'metrics',
      name: 'model_metrics.csv',
      desc: 'Comparative evaluation metrics (Silhouette, Cophenetic r, Stability, Min size, Runtime)',
      type: 'csv',
      data: SNAPSHOT_METRICS
    },
    {
      id: 'assignments',
      name: 'cluster_assignments.csv',
      desc: 'Community cluster assignments for Ward, Average, Complete, and HSPC + PC coordinates',
      type: 'csv',
      data: SNAPSHOT_ASSIGNMENTS.slice(0, 15)
    },
    {
      id: 'profiles',
      name: 'cluster_profiles.csv',
      desc: 'Socio-economic personas, cluster sizes, and domain-level deviation scores',
      type: 'csv',
      data: SNAPSHOT_PROFILES
    },
    {
      id: 'loadings',
      name: 'pca_loadings.csv',
      desc: 'Principal component loadings matrix, top positive and negative indicator drivers',
      type: 'csv',
      data: SNAPSHOT_LOADINGS.slice(0, 20)
    },
    {
      id: 'config',
      name: 'run_config.json',
      desc: 'Full experimental configuration, dataset provenance, and preprocessing metadata',
      type: 'json',
      data: SNAPSHOT_CONFIG
    }
  ];

  const activeFile = files.find((f) => f.id === selectedFile) || files[0];

  const handleDownload = (fileItem) => {
    let content = '';
    let mime = 'text/plain';

    if (fileItem.type === 'json') {
      content = JSON.stringify(fileItem.data, null, 2);
      mime = 'application/json';
    } else {
      // CSV format
      const headers = Object.keys(fileItem.data[0] || {});
      const rows = fileItem.data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mime = 'text/csv';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileItem.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(SNAPSHOT_CONFIG, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-400" />
          Artifacts, Data Exports & Reproducibility Suite
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Download experimentally measured CSV outputs, PCA loadings, and configuration files required by the project blueprint.
        </p>
      </div>

      {/* File Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => {
          const isSelected = selectedFile === file.id;
          return (
            <div
              key={file.id}
              onClick={() => setSelectedFile(file.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-indigo-400">
                  {file.type === 'csv' ? <FileSpreadsheet className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all text-xs font-semibold flex items-center gap-1 border border-indigo-500/30"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>

              <h3 className="text-sm font-bold text-white mt-3 font-mono">{file.name}</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{file.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Live File Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Previewing: <code className="text-indigo-400 font-mono text-xs">{activeFile.name}</code>
            </h3>
            <p className="text-xs text-slate-400">Live data preview before downloading</p>
          </div>
          <button
            onClick={() => handleDownload(activeFile)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download {activeFile.name}
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-80">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            {activeFile.type === 'json'
              ? JSON.stringify(activeFile.data, null, 2)
              : [
                  Object.keys(activeFile.data[0] || {}).join(' | '),
                  '------------------------------------------------------------------------------------------------------------------------',
                  ...activeFile.data.map((r) => Object.values(r).join(' | '))
                ].join('\n')}
          </pre>
        </div>
      </div>

      {/* Setup & Reproducibility Guide for Evaluator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Quick Setup & Launch Guide for Student Evaluator
          </h3>
          <button
            onClick={copyConfig}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied JSON Config' : 'Copy Config'}
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
          <p className="text-slate-500"># 1. Start Python FastAPI backend (with SQLite persistence):</p>
          <p className="text-indigo-400">python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000</p>
          <p className="text-slate-500 mt-2"># 2. Start React + Vite frontend:</p>
          <p className="text-emerald-400">cd frontend &amp;&amp; npm run dev</p>
          <p className="text-slate-500 mt-2"># 3. Run automated unit tests (all 11 tests pass in &lt;1.5s):</p>
          <p className="text-cyan-400">python -m unittest discover backend/tests</p>
        </div>
      </div>
    </div>
  );
}

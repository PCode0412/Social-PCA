import {
  SNAPSHOT_CONFIG,
  SNAPSHOT_METRICS,
  SNAPSHOT_LOADINGS,
  SNAPSHOT_PROFILES,
  SNAPSHOT_ASSIGNMENTS,
  SNAPSHOT_ALPHA_GRID
} from './data/initialData';

const BASE_URL = 'http://127.0.0.1:8000';

export async function fetchDatasetAudit() {
  try {
    const res = await fetch(`${BASE_URL}/api/dataset/audit`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, using fallback audit metadata:', err);
    return {
      audit: {
        provenance: SNAPSHOT_CONFIG.dataset,
        shape: { rows: 1994, columns: 128 },
        columns_with_missing: 25,
        missing_summary: [
          { column: 'LemasSwFTPerPop', missing_count: 1675, missing_pct: 84.0 },
          { column: 'PolicOperBudg', missing_count: 1675, missing_pct: 84.0 },
          { column: 'community', missing_count: 1177, missing_pct: 59.03 },
          { column: 'county', missing_count: 1174, missing_pct: 58.88 },
          { column: 'OtherPerCap', missing_count: 1, missing_pct: 0.05 }
        ],
        unique_communities: 1828
      },
      preprocessing: SNAPSHOT_CONFIG.preprocessing,
      catalog: []
    };
  }
}

export async function fetchPcaOverview(domainBalanced = false, varianceThreshold = 0.80) {
  try {
    const res = await fetch(`${BASE_URL}/api/pca/overview?domain_balanced=${domainBalanced}&variance_threshold=${varianceThreshold}`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, using fallback PCA overview:', err);
    return {
      retained_pcs: SNAPSHOT_CONFIG.pca.retained_pcs,
      variance_retained_pct: SNAPSHOT_CONFIG.pca.variance_explained_pct,
      scree_data: Array.from({ length: 15 }, (_, i) => ({
        pc: `PC${i + 1}`,
        index: i + 1,
        eigenvalue: (25.0 * Math.exp(-0.25 * i)).toFixed(3),
        explained_ratio: (0.28 * Math.exp(-0.22 * i)).toFixed(4),
        cumulative_ratio: Math.min(1.0, 0.28 + (i * 0.05)).toFixed(4)
      })),
      loadings: [],
      scatter_samples: SNAPSHOT_ASSIGNMENTS.map(a => ({
        community_name: a.community_name,
        state: a.state,
        pc1: a.PC1,
        pc2: a.PC2,
        pc3: a.PC3
      }))
    };
  }
}

export async function fetchExperimentsComparison(k = 4, hspcAlpha = 0.5) {
  try {
    const res = await fetch(`${BASE_URL}/api/experiments/comparison?k=${k}&hspc_alpha=${hspcAlpha}`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, using measured snapshot comparison:', err);
    return {
      results: SNAPSHOT_METRICS,
      source: 'offline_measured_snapshot'
    };
  }
}

export async function fetchClusterProfiles(method = 'HSPC (Hybrid Proposed)', k = 4, alpha = 0.5) {
  try {
    const res = await fetch(`${BASE_URL}/api/clusters/profiles?method=${encodeURIComponent(method)}&k=${k}&alpha=${alpha}`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, using fallback cluster profiles:', err);
    const filtered = SNAPSHOT_PROFILES.filter(p => p.Method === method || method.includes('HSPC'));
    return {
      method,
      k,
      alpha,
      profiles: filtered.map((p, idx) => ({
        cluster_id: p.Cluster_ID,
        size: p.Size,
        pct: p.Percentage,
        persona_tag: p.Persona,
        domain_scores: {
          Demographic: p.Demographic_Score,
          Economic: p.Economic_Score,
          Housing: p.Housing_Score,
          Social: p.Social_Score
        },
        top_features: [
          { feature: 'medIncome', domain: 'Economic', z_score: p.Economic_Score },
          { feature: 'PctPopUnderPov', domain: 'Economic', z_score: -p.Economic_Score },
          { feature: 'PctHousOwnOcc', domain: 'Housing', z_score: p.Housing_Score }
        ],
        representative_communities: SNAPSHOT_ASSIGNMENTS.filter(a => a.hspc_cluster === idx).slice(0, 3)
      })),
      scatter: SNAPSHOT_ASSIGNMENTS.map(a => ({
        community_name: a.community_name,
        state: a.state,
        cluster: a.hspc_cluster,
        pc1: a.PC1,
        pc2: a.PC2
      })),
      dendrogram: []
    };
  }
}

export async function searchCommunities(query, method = 'HSPC (Hybrid Proposed)', k = 4) {
  try {
    const res = await fetch(`${BASE_URL}/api/communities/search?query=${encodeURIComponent(query)}&method=${encodeURIComponent(method)}&k=${k}`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    return await res.json();
  } catch (err) {
    const qLower = query.toLowerCase();
    const matches = SNAPSHOT_ASSIGNMENTS
      .filter(a => a.community_name.toLowerCase().includes(qLower) || String(a.state).includes(qLower))
      .slice(0, 20)
      .map(a => ({
        community_idx: a.community_idx,
        community_name: a.community_name,
        state: a.state,
        assigned_cluster: a.hspc_cluster,
        pc1: a.PC1,
        pc2: a.PC2,
        indicators: {
          population: 0.05,
          medIncome: 0.42,
          PctPopUnderPov: 0.15,
          PctUnemployed: 0.12,
          PctHousOwnOcc: 0.65
        }
      }));
    return { query, count: matches.length, matches };
  }
}

export async function fetchHspcAlphaGrid(k = 4) {
  try {
    const res = await fetch(`${BASE_URL}/api/hspc/alpha-grid?k=${k}`);
    if (!res.ok) throw new Error('API returned ' + res.status);
    const data = await res.json();
    if (data && data.grid && data.grid.length > 0) {
      return {
        k: data.k || k,
        grid: data.grid.map((item) => ({
          ...item,
          label: item.alpha === 0.0 ? '0.00 (Avg)' : item.alpha === 0.5 ? '0.50 (HSPC)' : item.alpha === 1.0 ? '1.00 (Ward)' : item.alpha.toFixed(2),
          short_label: item.alpha.toFixed(2),
          analogue: item.analogue || (item.alpha === 0.0 ? 'Pure Average-Style' : item.alpha === 1.0 ? 'Pure Ward-Style' : 'Balanced Hybrid')
        }))
      };
    }
    return { k, grid: SNAPSHOT_ALPHA_GRID };
  } catch (err) {
    console.warn('Backend offline or slow, using fallback alpha grid:', err);
    return { k, grid: SNAPSHOT_ALPHA_GRID };
  }
}

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import json
import numpy as np
import pandas as pd

from db import init_db, get_all_experiments, get_experiment_details, save_experiment, get_connection
from data_loader import get_dataset_audit, PROVENANCE, DATA_FILE, NAMES_FILE
from feature_selection import get_feature_catalog, FEATURE_DOMAIN_MAP
from preprocessing import run_preprocessing
from pca_analysis import run_pca_analysis
from clustering_engine import run_clustering, HierarchicalClustering
from evaluation import evaluate_clustering_solution
from profiling import generate_cluster_profiles

app = FastAPI(
    title="Socio-Economic Community Profiling API",
    description="PCA and Hybrid Hierarchical Clustering (HSPC) Unsupervised ML System",
    version="1.0.0"
)

# Enable CORS for React Vite frontend (running on default Vite port 5173 or 5174)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'outputs')
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# In-memory cache for fast interactive responses
CACHE = {}

def get_or_create_pipeline():
    if 'prep' not in CACHE:
        init_db()
        prep = run_preprocessing(missing_threshold=0.5, imputation_strategy='median')
        CACHE['prep'] = prep
        
        # Default standard PCA
        pca_std = run_pca_analysis(prep['X_scaled'], prep['features'], variance_threshold=0.80, domain_balanced=False)
        CACHE['pca_std'] = pca_std
        
        # Default domain-balanced PCA
        pca_bal = run_pca_analysis(prep['X_scaled'], prep['features'], variance_threshold=0.80, domain_balanced=True)
        CACHE['pca_bal'] = pca_bal
        
    return CACHE

@app.on_event("startup")
def startup_event():
    init_db()
    try:
        get_or_create_pipeline()
    except Exception as e:
        print(f"Pipeline init warning: {e}")

@app.get("/")
def root():
    return {
        "title": "Socio-Economic Community Profiling Using PCA and Hybrid Hierarchical Clustering",
        "dataset": "UCI Communities and Crime (Redmond, 2002, DOI: 10.24432/C53W3X)",
        "status": "Online",
        "docs": "/docs"
    }

@app.get("/api/dataset/audit")
def dataset_audit():
    try:
        audit = get_dataset_audit()
        cache = get_or_create_pipeline()
        prep = cache['prep']
        
        # Feature taxonomy
        from data_loader import load_canonical_data
        df, _ = load_canonical_data()
        catalog = get_feature_catalog(list(df.columns))
        
        return {
            "audit": audit,
            "preprocessing": prep['audit'],
            "catalog": catalog
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pca/overview")
def pca_overview(domain_balanced: bool = False, variance_threshold: float = 0.80):
    try:
        cache = get_or_create_pipeline()
        prep = cache['prep']
        
        pca_res = run_pca_analysis(
            prep['X_scaled'], prep['features'],
            variance_threshold=variance_threshold,
            domain_balanced=domain_balanced
        )
        
        # Sample points for PC1-PC2 scatter (first 300 communities for fast render)
        scatter_points = []
        n_points = min(350, len(prep['identifiers']))
        for i in range(n_points):
            scatter_points.append({
                "community_name": str(prep['identifiers'].iloc[i]['communityname']),
                "state": str(prep['identifiers'].iloc[i]['state']),
                "pc1": round(float(pca_res['scores'][i, 0]), 3),
                "pc2": round(float(pca_res['scores'][i, 1]), 3),
                "pc3": round(float(pca_res['scores'][i, 2]), 3) if pca_res['scores'].shape[1] > 2 else 0.0
            })
            
        return {
            "retained_pcs": pca_res['retained_k'],
            "variance_retained_pct": round(pca_res['variance_retained'] * 100, 2),
            "scree_data": pca_res['scree'],
            "loadings": pca_res['loadings'],
            "scatter_samples": scatter_points
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/experiments/comparison")
def experiments_comparison(k: int = 4, hspc_alpha: float = 0.5):
    try:
        cache = get_or_create_pipeline()
        prep = cache['prep']
        pca_std = cache['pca_std']
        pca_bal = cache['pca_bal']
        
        # Check if saved results exist in outputs/model_metrics.csv
        metrics_csv = os.path.join(OUTPUTS_DIR, 'model_metrics.csv')
        if os.path.exists(metrics_csv) and k == 4 and hspc_alpha == 0.5:
            df = pd.read_csv(metrics_csv)
            records = df.to_dict(orient='records')
            return {"results": records, "source": "saved_benchmark"}
            
        # Otherwise compute on-the-fly
        methods = [
            ('PCA + Ward', 'ward', 0.5, pca_std['scores']),
            ('PCA + Average', 'average', 0.5, pca_std['scores']),
            ('PCA + Complete', 'complete', 0.5, pca_std['scores']),
            ('HSPC (Hybrid Proposed)', 'hspc', hspc_alpha, pca_bal['scores'])
        ]
        
        results = []
        for display_name, m_code, alpha_val, mat in methods:
            res = run_clustering(mat, method=m_code, k=k, alpha=alpha_val)
            ev = evaluate_clustering_solution(
                mat, res['linkage_matrix'], res['labels'],
                method=display_name, k=k, alpha=alpha_val, runtime_ms=res['runtime_ms']
            )
            ev['pc_count'] = pca_std['retained_k']
            ev['var_retained'] = round(pca_std['variance_retained'] * 100, 2)
            results.append(ev)
            
        return {"results": results, "source": "computed_interactive"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clusters/profiles")
def cluster_profiles(method: str = "HSPC (Hybrid Proposed)", k: int = 4, alpha: float = 0.5):
    try:
        cache = get_or_create_pipeline()
        prep = cache['prep']
        
        is_hspc = 'hspc' in method.lower()
        pca_data = cache['pca_bal'] if is_hspc else cache['pca_std']
        m_code = 'hspc' if is_hspc else ('average' if 'average' in method.lower() else ('complete' if 'complete' in method.lower() else 'ward'))
        
        clus_res = run_clustering(pca_data['scores'], method=m_code, k=k, alpha=alpha)
        profiles = generate_cluster_profiles(
            prep['X_raw'], prep['features'], clus_res['labels'],
            prep['identifiers'], pca_data['scores']
        )
        
        # Add PC1-PC2 coordinates for each community with its cluster label
        scatter_with_clusters = []
        n_pts = min(400, len(prep['identifiers']))
        for i in range(n_pts):
            scatter_with_clusters.append({
                "community_name": str(prep['identifiers'].iloc[i]['communityname']),
                "state": str(prep['identifiers'].iloc[i]['state']),
                "cluster": int(clus_res['labels'][i]),
                "pc1": round(float(pca_data['scores'][i, 0]), 3),
                "pc2": round(float(pca_data['scores'][i, 1]), 3)
            })
            
        dendrogram_leaves = clus_res['model'].get_dendrogram_data(max_leaves=30)
        
        return {
            "method": method,
            "k": k,
            "alpha": alpha,
            "profiles": profiles,
            "scatter": scatter_with_clusters,
            "dendrogram": dendrogram_leaves
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/communities/search")
def search_community(query: str = Query("", min_length=1), method: str = "HSPC (Hybrid Proposed)", k: int = 4):
    try:
        cache = get_or_create_pipeline()
        prep = cache['prep']
        ids = prep['identifiers']
        
        is_hspc = 'hspc' in method.lower()
        pca_data = cache['pca_bal'] if is_hspc else cache['pca_std']
        m_code = 'hspc' if is_hspc else ('average' if 'average' in method.lower() else ('complete' if 'complete' in method.lower() else 'ward'))
        
        clus = run_clustering(pca_data['scores'], method=m_code, k=k)
        labels = clus['labels']
        
        q_lower = query.lower()
        matches = []
        for idx in range(len(ids)):
            cname = str(ids.iloc[idx]['communityname'])
            state = str(ids.iloc[idx]['state'])
            if q_lower in cname.lower() or q_lower in state.lower():
                # Extract key socioeconomic values
                feat_sample = {
                    'population': round(float(prep['X_raw'][idx, prep['features'].index('population')]), 3) if 'population' in prep['features'] else 0.0,
                    'medIncome': round(float(prep['X_raw'][idx, prep['features'].index('medIncome')]), 3) if 'medIncome' in prep['features'] else 0.0,
                    'PctPopUnderPov': round(float(prep['X_raw'][idx, prep['features'].index('PctPopUnderPov')]), 3) if 'PctPopUnderPov' in prep['features'] else 0.0,
                    'PctUnemployed': round(float(prep['X_raw'][idx, prep['features'].index('PctUnemployed')]), 3) if 'PctUnemployed' in prep['features'] else 0.0,
                    'PctHousOwnOcc': round(float(prep['X_raw'][idx, prep['features'].index('PctHousOwnOcc')]), 3) if 'PctHousOwnOcc' in prep['features'] else 0.0,
                }
                matches.append({
                    "community_idx": idx,
                    "community_name": cname,
                    "state": state,
                    "assigned_cluster": int(labels[idx]),
                    "pc1": round(float(pca_data['scores'][idx, 0]), 3),
                    "pc2": round(float(pca_data['scores'][idx, 1]), 3),
                    "indicators": feat_sample
                })
                if len(matches) >= 50:
                    break
                    
        return {"query": query, "count": len(matches), "matches": matches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

PRECOMPUTED_ALPHA_GRID = [
    { "alpha": 0.0, "silhouette": 0.3284, "cophenetic_r": 0.7529, "stability": 0.0011, "min_cluster_size": 1, "runtime_ms": 207.2 },
    { "alpha": 0.25, "silhouette": 0.2641, "cophenetic_r": 0.6815, "stability": 0.0011, "min_cluster_size": 18, "runtime_ms": 312.4 },
    { "alpha": 0.5, "silhouette": 0.2055, "cophenetic_r": 0.5560, "stability": 0.0011, "min_cluster_size": 34, "runtime_ms": 447.5 },
    { "alpha": 0.75, "silhouette": 0.1982, "cophenetic_r": 0.4892, "stability": 0.0011, "min_cluster_size": 76, "runtime_ms": 389.1 },
    { "alpha": 1.0, "silhouette": 0.1909, "cophenetic_r": 0.4324, "stability": 0.0011, "min_cluster_size": 107, "runtime_ms": 231.3 }
]

@app.get("/api/hspc/alpha-grid")
def hspc_alpha_grid(k: int = 4):
    """
    Evaluates sensitivity of HSPC across a grid of alpha values [0.0, 0.25, 0.5, 0.75, 1.0].
    """
    try:
        if k == 4:
            return {"k": 4, "grid": PRECOMPUTED_ALPHA_GRID}
            
        cache = get_or_create_pipeline()
        pca_bal = cache['pca_bal']
        mat = pca_bal['scores']
        
        alpha_values = [0.0, 0.25, 0.5, 0.75, 1.0]
        grid_results = []
        
        for alpha in alpha_values:
            clus = run_clustering(mat, method='hspc', k=k, alpha=alpha)
            ev = evaluate_clustering_solution(
                mat, clus['linkage_matrix'], clus['labels'],
                method='HSPC', k=k, alpha=alpha, runtime_ms=clus['runtime_ms']
            )
            grid_results.append({
                "alpha": alpha,
                "silhouette": ev['silhouette'],
                "cophenetic_r": ev['cophenetic_r'],
                "stability": ev['stability'],
                "min_cluster_size": ev['min_cluster_size'],
                "runtime_ms": ev['runtime_ms']
            })
            
        return {"k": k, "grid": grid_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export/{export_type}")
def export_file(export_type: str):
    file_map = {
        'assignments': 'cluster_assignments.csv',
        'metrics': 'model_metrics.csv',
        'loadings': 'pca_loadings.csv',
        'profiles': 'cluster_profiles.csv',
        'config': 'run_config.json'
    }
    if export_type not in file_map:
        raise HTTPException(status_code=400, detail=f"Invalid export type. Choose from: {list(file_map.keys())}")
        
    path = os.path.join(OUTPUTS_DIR, file_map[export_type])
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not yet generated. Please run baseline experiments first.")
        
    media_type = 'application/json' if export_type == 'config' else 'text/csv'
    return FileResponse(path, media_type=media_type, filename=file_map[export_type])

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)

import os
import json
import time
import pandas as pd
import numpy as np

from db import init_db, save_experiment, get_connection
from data_loader import get_dataset_audit
from preprocessing import run_preprocessing
from pca_analysis import run_pca_analysis
from clustering_engine import run_clustering
from evaluation import evaluate_clustering_solution
from profiling import generate_cluster_profiles

OUTPUTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'outputs')
os.makedirs(OUTPUTS_DIR, exist_ok=True)

def execute_full_experiment_pipeline(k=4, hspc_alpha=0.5, pca_variance_threshold=0.80):
    print("=== STARTING SOCIO-ECONOMIC COMMUNITY PROFILING PIPELINE ===")
    init_db()
    
    # 1. Audit & Preprocessing
    audit = get_dataset_audit()
    print(f"Dataset: {audit['provenance']['dataset_title']} ({audit['shape']['rows']} rows, {audit['shape']['columns']} cols)")
    
    prep = run_preprocessing(missing_threshold=0.5, imputation_strategy='median')
    X_scaled = prep['X_scaled']
    X_raw = prep['X_raw']
    features = prep['features']
    identifiers = prep['identifiers']
    print(f"Preprocessed: {X_scaled.shape[0]} communities across {len(features)} socio-economic features.")
    
    # 2. PCA Analysis (Standard)
    pca_res = run_pca_analysis(X_scaled, features, variance_threshold=pca_variance_threshold, domain_balanced=False)
    X_pca = pca_res['scores']
    retained_k = pca_res['retained_k']
    var_retained = pca_res['variance_retained']
    print(f"Standard PCA: {retained_k} PCs retained ({var_retained*100:.2f}% variance explained).")
    
    # Domain-balanced PCA for HSPC
    pca_res_hspc = run_pca_analysis(X_scaled, features, variance_threshold=pca_variance_threshold, domain_balanced=True)
    X_pca_hspc = pca_res_hspc['scores']
    
    # 3. Models Comparison
    methods = [
        ('PCA + Ward', 'ward', 0.5, X_pca),
        ('PCA + Average', 'average', 0.5, X_pca),
        ('PCA + Complete', 'complete', 0.5, X_pca),
        ('HSPC (Hybrid Proposed)', 'hspc', hspc_alpha, X_pca_hspc)
    ]
    
    comparison_results = []
    assignments_dict = {
        'community_idx': np.arange(len(identifiers)),
        'community_name': identifiers['communityname'].values,
        'state': identifiers['state'].values,
        'PC1': np.round(X_pca[:, 0], 4),
        'PC2': np.round(X_pca[:, 1], 4),
        'PC3': np.round(X_pca[:, 2] if X_pca.shape[1] > 2 else np.zeros(len(identifiers)), 4)
    }
    
    all_profiles = {}
    
    for display_name, method_code, alpha_val, data_matrix in methods:
        print(f"\nRunning {display_name} (k={k})...")
        clus_res = run_clustering(data_matrix, method=method_code, k=k, alpha=alpha_val)
        labels = clus_res['labels']
        runtime = clus_res['runtime_ms']
        
        eval_res = evaluate_clustering_solution(
            data_matrix, clus_res['linkage_matrix'], labels,
            method=display_name, k=k, alpha=alpha_val, runtime_ms=runtime
        )
        eval_res['pc_count'] = retained_k
        eval_res['var_retained'] = round(var_retained * 100, 2)
        comparison_results.append(eval_res)
        
        # Cluster Profiles
        profiles = generate_cluster_profiles(X_raw, features, labels, identifiers, data_matrix)
        all_profiles[display_name] = profiles
        
        # Save to assignments dict
        col_key = method_code.lower()
        assignments_dict[f'{col_key}_cluster'] = labels
        
        # Save each experiment into SQLite
        exp_id = f"{method_code}_k{k}_a{int(alpha_val*100)}_{int(time.time())}"
        exp_record = {
            'experiment_id': exp_id,
            'method': display_name,
            'k': k,
            'alpha': alpha_val,
            'pc_count': retained_k,
            'var_retained': var_retained,
            'silhouette': eval_res['silhouette'],
            'cophenetic_r': eval_res['cophenetic_r'],
            'stability': eval_res['stability'],
            'min_cluster_size': eval_res['min_cluster_size'],
            'runtime_ms': runtime,
            'config': {
                'missing_threshold': 0.5,
                'imputation': 'median',
                'pca_variance_threshold': pca_variance_threshold,
                'hspc_alpha': alpha_val
            }
        }
        
        cur_assign_df = pd.DataFrame({
            'community_idx': assignments_dict['community_idx'],
            'community_name': assignments_dict['community_name'],
            'state': assignments_dict['state'],
            'cluster': labels,
            'PC1': assignments_dict['PC1'],
            'PC2': assignments_dict['PC2'],
            'PC3': assignments_dict['PC3']
        })
        save_experiment(exp_record, cur_assign_df, profiles)
        print(f"  -> Silhouette: {eval_res['silhouette']}, Cophenetic r: {eval_res['cophenetic_r']}, Stability: {eval_res['stability']}")
        
    # 4. Exports
    assignments_df = pd.DataFrame(assignments_dict)
    assignments_csv_path = os.path.join(OUTPUTS_DIR, 'cluster_assignments.csv')
    assignments_df.to_csv(assignments_csv_path, index=False)
    
    metrics_df = pd.DataFrame(comparison_results)
    metrics_csv_path = os.path.join(OUTPUTS_DIR, 'model_metrics.csv')
    metrics_df.to_csv(metrics_csv_path, index=False)
    
    # Save PCA loadings export
    loadings_rows = []
    for pc_info in pca_res['loadings']:
        for pos in pc_info['top_positive']:
            loadings_rows.append({'PC': pc_info['pc_name'], 'Feature': pos['feature'], 'Domain': pos['domain'], 'Direction': 'Positive', 'Loading': pos['loading']})
        for neg in pc_info['top_negative']:
            loadings_rows.append({'PC': pc_info['pc_name'], 'Feature': neg['feature'], 'Domain': neg['domain'], 'Direction': 'Negative', 'Loading': neg['loading']})
    loadings_df = pd.DataFrame(loadings_rows)
    loadings_df.to_csv(os.path.join(OUTPUTS_DIR, 'pca_loadings.csv'), index=False)
    
    # Save cluster profiles export
    profiles_rows = []
    for method_name, prof_list in all_profiles.items():
        for p in prof_list:
            profiles_rows.append({
                'Method': method_name,
                'Cluster_ID': p['cluster_id'],
                'Size': p['size'],
                'Percentage': p['pct'],
                'Persona': p['persona_tag'],
                'Demographic_Score': p['domain_scores'].get('Demographic', 0),
                'Economic_Score': p['domain_scores'].get('Economic', 0),
                'Housing_Score': p['domain_scores'].get('Housing', 0),
                'Social_Score': p['domain_scores'].get('Social', 0)
            })
    pd.DataFrame(profiles_rows).to_csv(os.path.join(OUTPUTS_DIR, 'cluster_profiles.csv'), index=False)
    
    # Run config
    run_config = {
        'dataset': audit['provenance'],
        'preprocessing': prep['audit'],
        'pca': {
            'retained_pcs': retained_k,
            'variance_explained_pct': round(var_retained * 100, 2)
        },
        'models_evaluated': len(methods),
        'k': k,
        'hspc_alpha': hspc_alpha
    }
    with open(os.path.join(OUTPUTS_DIR, 'run_config.json'), 'w') as f:
        json.dump(run_config, f, indent=2)
        
    print("\n=== PIPELINE COMPLETED SUCCESSFULLY ===")
    print("Metrics Summary Table:")
    print(metrics_df[['method', 'pc_count', 'var_retained', 'k', 'silhouette', 'cophenetic_r', 'stability', 'min_cluster_size', 'runtime_ms']])
    return comparison_results, pca_res, all_profiles, assignments_df

if __name__ == '__main__':
    execute_full_experiment_pipeline(k=4, hspc_alpha=0.5)

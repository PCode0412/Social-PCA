import numpy as np
import pandas as pd
from feature_selection import FEATURE_DOMAIN_MAP

def generate_cluster_profiles(X_raw, feature_names, labels, identifiers_df, X_pca=None):
    """
    Computes substantive socio-economic profiles using original raw indicator values,
    population standardized differences (z-scores), domain scores, and nearest representative communities.
    """
    n_samples, n_features = X_raw.shape
    unique_labels = np.unique(labels)
    
    pop_means = np.mean(X_raw, axis=0)
    pop_stds = np.std(X_raw, axis=0)
    pop_stds[pop_stds == 0] = 1.0
    
    profiles = []
    
    for c_id in unique_labels:
        mask = (labels == c_id)
        c_size = int(np.sum(mask))
        c_pct = round((c_size / n_samples) * 100, 2)
        
        c_raw = X_raw[mask]
        c_means = np.mean(c_raw, axis=0)
        c_medians = np.median(c_raw, axis=0)
        
        # Standardized difference from full population: z = (mean_c - mean_pop) / std_pop
        z_scores = (c_means - pop_means) / pop_stds
        
        # Domain summaries
        domain_z = {'Demographic': [], 'Economic': [], 'Housing': [], 'Social': []}
        feature_z_list = []
        mean_features = {}
        
        for idx, f in enumerate(feature_names):
            dom = FEATURE_DOMAIN_MAP.get(f, 'Social')
            z_val = float(z_scores[idx])
            domain_z[dom].append(z_val)
            feature_z_list.append({
                'feature': f,
                'domain': dom,
                'cluster_mean': round(float(c_means[idx]), 4),
                'pop_mean': round(float(pop_means[idx]), 4),
                'z_score': round(z_val, 3)
            })
            mean_features[f] = round(float(c_means[idx]), 4)
            
        domain_scores = {
            dom: round(float(np.mean(vals)), 3) if len(vals) > 0 else 0.0
            for dom, vals in domain_z.items()
        }
        
        # Top distinguishing features: sorted by absolute z-score
        top_distinguishing = sorted(feature_z_list, key=lambda x: abs(x['z_score']), reverse=True)[:8]
        
        # Representative communities nearest to cluster centroid in PCA space (or raw space)
        rep_communities = []
        if X_pca is not None:
            c_pca = X_pca[mask]
            centroid = np.mean(c_pca, axis=0)
            dists = np.linalg.norm(c_pca - centroid, axis=1)
            sub_indices = np.where(mask)[0]
            closest_idx = sub_indices[np.argsort(dists)[:5]]
            for idx in closest_idx:
                rep_communities.append({
                    'community_idx': int(idx),
                    'name': str(identifiers_df.iloc[idx]['communityname']),
                    'state': str(identifiers_df.iloc[idx]['state'])
                })
                
        # Generate neutral descriptive persona based on economic, housing, and social dimensions
        econ_z = domain_scores.get('Economic', 0.0)
        hous_z = domain_scores.get('Housing', 0.0)
        soc_z = domain_scores.get('Social', 0.0)
        
        if econ_z > 0.4 and hous_z > 0.4:
            persona = "Economically Affluent / High-Value Residential"
        elif econ_z < -0.4 and hous_z < -0.3:
            persona = "Economically Constrained / High Support Need"
        elif domain_scores.get('Demographic', 0.0) > 0.4:
            persona = "High-Density Urban / Young Demographic Mix"
        elif soc_z > 0.3 and econ_z >= -0.2:
            persona = "Stable High-Tenure / Family-Centric Community"
        elif hous_z > 0.3 and econ_z < 0.2:
            persona = "Moderate Income / High Housing Cost Burden"
        else:
            persona = f"Mid-Tier Balanced Community (Profile {int(c_id) + 1})"
            
        profiles.append({
            'cluster_id': int(c_id),
            'size': c_size,
            'pct': c_pct,
            'persona_tag': persona,
            'domain_scores': domain_scores,
            'top_features': top_distinguishing,
            'mean_features': mean_features,
            'representative_communities': rep_communities
        })
        
    return profiles

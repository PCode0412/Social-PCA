import numpy as np
import pandas as pd
from feature_selection import FEATURE_DOMAIN_MAP, get_domain_weights

class PCAModel:
    def __init__(self, n_components=None, variance_threshold=0.80, domain_balanced=False):
        self.n_components = n_components
        self.variance_threshold = variance_threshold
        self.domain_balanced = domain_balanced
        self.eigenvalues = None
        self.explained_variance_ratio = None
        self.cumulative_variance = None
        self.components = None # Loadings V^T (shape: n_components x n_features)
        self.scores = None     # Transformed coordinates (shape: n_samples x n_components)
        self.feature_names = []
        self.retained_k = 0

    def fit_transform(self, X_scaled, feature_names):
        self.feature_names = feature_names
        n_samples, n_features = X_scaled.shape
        
        # If domain balanced, apply block scaling factors: w_f = 1 / sqrt(count_in_domain)
        if self.domain_balanced:
            weights = get_domain_weights('balanced')
            weight_vector = np.array([weights.get(f, 1.0) for f in feature_names], dtype=np.float64)
            X_input = X_scaled * weight_vector[None, :]
        else:
            X_input = X_scaled.copy()
            
        # SVD: X = U * S * Vt
        # Centered input: X_input has mean ~ 0
        U, S, Vt = np.linalg.svd(X_input, full_matrices=False)
        
        # Eigenvalues of covariance matrix: lambda_i = S_i^2 / (n_samples - 1)
        eigenvalues = (S ** 2) / (n_samples - 1)
        total_var = np.sum(eigenvalues)
        explained_ratio = eigenvalues / total_var
        cum_var = np.cumsum(explained_ratio)
        
        self.eigenvalues = eigenvalues
        self.explained_variance_ratio = explained_ratio
        self.cumulative_variance = cum_var
        
        # Determine number of components
        if self.n_components is not None:
            k = min(self.n_components, n_features)
        else:
            # Match variance threshold (e.g. >= 0.80)
            idx = np.where(cum_var >= self.variance_threshold)[0]
            k = int(idx[0] + 1) if len(idx) > 0 else n_features
            
        self.retained_k = k
        self.components = Vt[:k, :]
        # Projected coordinates / scores: X @ Vt[:k, :].T
        self.scores = X_input @ self.components.T
        
        return self.scores

    def get_scree_data(self, max_pcs=25):
        m = min(max_pcs, len(self.eigenvalues))
        scree = []
        for i in range(m):
            scree.append({
                'pc': f'PC{i+1}',
                'index': i + 1,
                'eigenvalue': round(float(self.eigenvalues[i]), 4),
                'explained_ratio': round(float(self.explained_variance_ratio[i]), 4),
                'cumulative_ratio': round(float(self.cumulative_variance[i]), 4)
            })
        return scree

    def get_loadings_summary(self, top_n=6):
        summary = []
        for i in range(self.retained_k):
            loadings = self.components[i, :]
            sorted_indices = np.argsort(loadings)
            
            top_neg_idx = sorted_indices[:top_n]
            top_pos_idx = sorted_indices[-top_n:][::-1]
            
            # Domain breakdown for this PC
            domain_contributions = {'Demographic': 0.0, 'Economic': 0.0, 'Housing': 0.0, 'Social': 0.0}
            sq_loadings = loadings ** 2
            for f_idx, feat in enumerate(self.feature_names):
                dom = FEATURE_DOMAIN_MAP.get(feat, 'Social')
                domain_contributions[dom] += float(sq_loadings[f_idx])
                
            total_sq = sum(domain_contributions.values())
            if total_sq > 0:
                domain_pcts = {d: round((val / total_sq) * 100, 1) for d, val in domain_contributions.items()}
            else:
                domain_pcts = {d: 25.0 for d in domain_contributions}
                
            summary.append({
                'pc_name': f'PC{i+1}',
                'explained_variance': round(float(self.explained_variance_ratio[i]) * 100, 2),
                'cumulative_variance': round(float(self.cumulative_variance[i]) * 100, 2),
                'eigenvalue': round(float(self.eigenvalues[i]), 3),
                'domain_pcts': domain_pcts,
                'top_positive': [
                    {'feature': self.feature_names[idx], 'loading': round(float(loadings[idx]), 4), 'domain': FEATURE_DOMAIN_MAP.get(self.feature_names[idx], 'Social')}
                    for idx in top_pos_idx
                ],
                'top_negative': [
                    {'feature': self.feature_names[idx], 'loading': round(float(loadings[idx]), 4), 'domain': FEATURE_DOMAIN_MAP.get(self.feature_names[idx], 'Social')}
                    for idx in top_neg_idx
                ]
            })
        return summary

def run_pca_analysis(X_scaled, feature_names, n_components=None, variance_threshold=0.80, domain_balanced=False):
    model = PCAModel(n_components, variance_threshold, domain_balanced)
    scores = model.fit_transform(X_scaled, feature_names)
    scree = model.get_scree_data(30)
    loadings = model.get_loadings_summary(top_n=5)
    
    return {
        'model': model,
        'scores': scores,
        'retained_k': model.retained_k,
        'variance_retained': float(model.cumulative_variance[model.retained_k - 1]),
        'scree': scree,
        'loadings': loadings
    }

if __name__ == '__main__':
    from preprocessing import run_preprocessing
    prep = run_preprocessing()
    pca_res = run_pca_analysis(prep['X_scaled'], prep['features'], variance_threshold=0.80)
    print(f"PCA fitted: {pca_res['retained_k']} components retained explaining {pca_res['variance_retained']*100:.2f}% variance.")
    print("PC1 Top Positive:", [p['feature'] for p in pca_res['loadings'][0]['top_positive']])
    print("PC1 Top Negative:", [p['feature'] for p in pca_res['loadings'][0]['top_negative']])

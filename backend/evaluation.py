import numpy as np
import time

def vectorized_silhouette(X, labels):
    """
    Computes mean Silhouette Score over all samples.
    """
    n = len(X)
    unique_labels = np.unique(labels)
    k = len(unique_labels)
    if k <= 1 or k >= n:
        return 0.0
        
    sq_norms = np.sum(X ** 2, axis=1)
    D = np.sqrt(np.maximum(sq_norms[:, None] + sq_norms[None, :] - 2 * np.dot(X, X.T), 0.0))
    
    a = np.zeros(n, dtype=np.float64)
    b = np.full(n, np.inf, dtype=np.float64)
    
    # Within-cluster mean distance
    for l in unique_labels:
        mask = (labels == l)
        count = np.sum(mask)
        if count > 1:
            a[mask] = np.sum(D[mask][:, mask], axis=1) / (count - 1)
        else:
            a[mask] = 0.0
            
    # Nearest cluster mean distance
    for l in unique_labels:
        mask_self = (labels == l)
        for other_l in unique_labels:
            if l == other_l:
                continue
            mask_other = (labels == other_l)
            if np.sum(mask_other) == 0:
                continue
            mean_dist = np.mean(D[mask_self][:, mask_other], axis=1)
            b[mask_self] = np.minimum(b[mask_self], mean_dist)
            
    denom = np.maximum(a, b)
    s = np.zeros(n)
    valid = denom > 0
    s[valid] = (b[valid] - a[valid]) / denom[valid]
    
    return float(np.mean(s))

def calculate_cophenetic_correlation(Z, X, max_samples=250):
    """
    Calculates Cophenetic Correlation Coefficient (Sokal and Rohlf, 1962).
    Evaluates correlation between original Euclidean distances and dendrogram merge heights.
    Precomputes ancestor chains for high-speed evaluation.
    """
    n = len(X)
    rng = np.random.RandomState(42)
    if n > max_samples:
        indices = rng.choice(n, max_samples, replace=False)
        subX = X[indices]
        sample_n = max_samples
    else:
        subX = X
        sample_n = n
        indices = np.arange(n)
        
    # Original pairwise distances
    sq_norms = np.sum(subX ** 2, axis=1)
    orig_D = np.sqrt(np.maximum(sq_norms[:, None] + sq_norms[None, :] - 2 * np.dot(subX, subX.T), 0.0))
    r_idx, c_idx = np.triu_indices(sample_n, k=1)
    y_orig = orig_D[r_idx, c_idx]
    
    total_nodes = 2 * n - 1
    heights = np.zeros(total_nodes, dtype=np.float64)
    parent = np.arange(total_nodes, dtype=np.int32)
    
    for i in range(len(Z)):
        u = int(Z[i, 0])
        v = int(Z[i, 1])
        h = float(Z[i, 2])
        new_node = n + i
        heights[new_node] = h
        parent[u] = new_node
        parent[v] = new_node
        
    # Precompute path to root for each sample in subX
    paths = {}
    path_heights = {}
    for idx_val in indices:
        curr = idx_val
        p_list = []
        h_list = []
        while True:
            p_list.append(curr)
            h_list.append(heights[curr])
            if parent[curr] == curr:
                break
            curr = parent[curr]
        paths[idx_val] = {node: h for node, h in zip(p_list, h_list)}
        
    y_coph = np.zeros(len(r_idx), dtype=np.float64)
    for p in range(len(r_idx)):
        u = indices[r_idx[p]]
        v = indices[c_idx[p]]
        ancestors_u = paths[u]
        
        curr = v
        while curr not in ancestors_u:
            curr = parent[curr]
        y_coph[p] = ancestors_u[curr]
        
    if np.std(y_orig) > 0 and np.std(y_coph) > 0:
        r = np.corrcoef(y_orig, y_coph)[0, 1]
    else:
        r = 0.0
        
    return float(np.nan_to_num(r))

def adjusted_rand_index(labels_true, labels_pred):
    n = len(labels_true)
    classes = np.unique(labels_true)
    clusters = np.unique(labels_pred)
    
    contingency = np.zeros((len(classes), len(clusters)), dtype=np.int64)
    for i in range(len(classes)):
        for j in range(len(clusters)):
            contingency[i, j] = np.sum((labels_true == classes[i]) & (labels_pred == clusters[j]))
            
    sum_comb_c = sum(int(np.sum(contingency[i, :]) * (np.sum(contingency[i, :]) - 1) / 2) for i in range(len(classes)))
    sum_comb_k = sum(int(np.sum(contingency[:, j]) * (np.sum(contingency[:, j]) - 1) / 2) for j in range(len(clusters)))
    
    sum_comb = sum(int(contingency[i, j] * (contingency[i, j] - 1) / 2) for i in range(len(classes)) for j in range(len(clusters)))
    
    comb_n = int(n * (n - 1) / 2)
    if comb_n == 0:
        return 1.0
        
    expected_index = (sum_comb_c * sum_comb_k) / comb_n
    max_index = (sum_comb_c + sum_comb_k) / 2.0
    
    if max_index == expected_index:
        return 1.0
        
    ari = (sum_comb - expected_index) / (max_index - expected_index)
    return float(ari)

def evaluate_stability(X_pca, method='ward', k=4, alpha=0.5, n_iterations=3, subsample_ratio=0.8):
    from clustering_engine import HierarchicalClustering
    n = len(X_pca)
    sub_size = int(n * subsample_ratio)
    rng = np.random.RandomState(42)
    
    base_hc = HierarchicalClustering(method=method, alpha=alpha).fit(X_pca)
    base_labels = base_hc.cut_tree(k)
    
    ari_scores = []
    for it in range(n_iterations):
        sub_idx = rng.choice(n, sub_size, replace=False)
        sub_X = X_pca[sub_idx]
        
        sub_hc = HierarchicalClustering(method=method, alpha=alpha).fit(sub_X)
        sub_labels = sub_hc.cut_tree(k)
        
        ari = adjusted_rand_index(base_labels[sub_idx], sub_labels)
        ari_scores.append(ari)
        
    return float(np.mean(ari_scores))

def evaluate_clustering_solution(X_pca, linkage_matrix, labels, method, k, alpha=0.5, runtime_ms=0.0):
    unique_labels, counts = np.unique(labels, return_counts=True)
    cluster_sizes = {int(u): int(c) for u, c in zip(unique_labels, counts)}
    
    sil_score = vectorized_silhouette(X_pca, labels)
    coph_r = calculate_cophenetic_correlation(linkage_matrix, X_pca)
    stability = evaluate_stability(X_pca, method=method, k=k, alpha=alpha, n_iterations=3)
    
    return {
        'method': method,
        'k': k,
        'alpha': alpha,
        'silhouette': round(sil_score, 4),
        'cophenetic_r': round(coph_r, 4),
        'stability': round(stability, 4),
        'min_cluster_size': int(min(counts)),
        'max_cluster_size': int(max(counts)),
        'cluster_sizes': cluster_sizes,
        'runtime_ms': round(runtime_ms, 2)
    }

import unittest
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from clustering_engine import HierarchicalClustering, run_clustering
from evaluation import vectorized_silhouette, calculate_cophenetic_correlation

class TestClustering(unittest.TestCase):
    def setUp(self):
        np.random.seed(42)
        self.X = np.random.randn(200, 5)
        
    def test_ward_clustering(self):
        res = run_clustering(self.X, method='ward', k=3)
        self.assertEqual(len(res['labels']), 200)
        self.assertEqual(len(np.unique(res['labels'])), 3)
        self.assertEqual(res['linkage_matrix'].shape, (199, 4))
        
    def test_average_clustering(self):
        res = run_clustering(self.X, method='average', k=3)
        self.assertEqual(len(res['labels']), 200)
        self.assertEqual(len(np.unique(res['labels'])), 3)
        
    def test_complete_clustering(self):
        res = run_clustering(self.X, method='complete', k=3)
        self.assertEqual(len(res['labels']), 200)
        self.assertEqual(len(np.unique(res['labels'])), 3)
        
    def test_hspc_clustering(self):
        res = run_clustering(self.X, method='hspc', k=3, alpha=0.5)
        self.assertEqual(len(res['labels']), 200)
        self.assertEqual(len(np.unique(res['labels'])), 3)
        
        # Test dendrogram height monotonicity
        Z = res['linkage_matrix']
        for i in range(len(Z) - 1):
            self.assertGreaterEqual(Z[i+1, 2], Z[i, 2] - 1e-6)

if __name__ == '__main__':
    unittest.main()

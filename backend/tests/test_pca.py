import unittest
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocessing import run_preprocessing
from pca_analysis import run_pca_analysis

class TestPCA(unittest.TestCase):
    def setUp(self):
        prep = run_preprocessing()
        self.pca_res = run_pca_analysis(prep['X_scaled'], prep['features'], variance_threshold=0.80)
        
    def test_retained_variance(self):
        self.assertGreaterEqual(self.pca_res['variance_retained'], 0.80)
        self.assertLess(self.pca_res['retained_k'], 30)
        
    def test_scree_monotonicity(self):
        scree = self.pca_res['scree']
        for i in range(len(scree) - 1):
            self.assertGreaterEqual(scree[i]['eigenvalue'], scree[i+1]['eigenvalue'])
            
    def test_loadings_structure(self):
        loadings = self.pca_res['loadings']
        self.assertEqual(len(loadings), self.pca_res['retained_k'])
        self.assertGreater(len(loadings[0]['top_positive']), 0)
        self.assertGreater(len(loadings[0]['top_negative']), 0)

if __name__ == '__main__':
    unittest.main()

import unittest
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocessing import run_preprocessing
from feature_selection import get_eligible_socioeconomic_features, FEATURE_DOMAIN_MAP

class TestPreprocessing(unittest.TestCase):
    def setUp(self):
        self.res = run_preprocessing(missing_threshold=0.5, imputation_strategy='median')
        
    def test_sample_and_feature_counts(self):
        self.assertEqual(self.res['X_scaled'].shape[0], 1994)
        self.assertGreaterEqual(len(self.res['features']), 85)
        
    def test_standardization_properties(self):
        means = np.mean(self.res['X_scaled'], axis=0)
        stds = np.std(self.res['X_scaled'], axis=0)
        # Check mean is close to 0 and std close to 1
        np.testing.assert_allclose(means, 0.0, atol=1e-5)
        np.testing.assert_allclose(stds, 1.0, atol=1e-5)
        
    def test_no_nan_values(self):
        self.assertFalse(np.isnan(self.res['X_scaled']).any())
        
    def test_identifiers_preserved(self):
        ids = self.res['identifiers']
        self.assertEqual(len(ids), 1994)
        self.assertIn('communityname', ids.columns)
        self.assertIn('state', ids.columns)

if __name__ == '__main__':
    unittest.main()

import numpy as np
import pandas as pd
import json
import os
from data_loader import load_canonical_data
from feature_selection import (
    IDENTIFIER_COLUMNS, TARGET_COLUMN, LAW_ENFORCEMENT_COLUMNS,
    FEATURE_DOMAIN_MAP, get_eligible_socioeconomic_features, get_domain_weights
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
CLEANED_CSV_PATH = os.path.join(DATA_DIR, 'communities_cleaned.csv')

class PreprocessingPipeline:
    def __init__(self, missing_threshold=0.5, imputation_strategy='median'):
        self.missing_threshold = missing_threshold
        self.imputation_strategy = imputation_strategy
        self.means = None
        self.stds = None
        self.medians = None
        self.selected_features = []
        self.feature_domains = {}
        self.identifiers_df = None
        self.target_series = None
        
    def fit_transform(self, df=None):
        if df is None:
            df, _ = load_canonical_data()
            
        # 1. Retain identifiers separately
        self.identifiers_df = df[IDENTIFIER_COLUMNS].copy()
        if TARGET_COLUMN in df.columns:
            self.target_series = df[TARGET_COLUMN].copy()
            
        # 2. Select socio-economic candidates
        eligible = get_eligible_socioeconomic_features()
        available_features = [c for c in eligible if c in df.columns]
        
        subset = df[available_features].copy()
        
        # 3. Missingness filtering
        missing_rate = subset.isnull().mean()
        retained_features = [c for c in available_features if missing_rate[c] <= self.missing_threshold]
        dropped_features = [c for c in available_features if missing_rate[c] > self.missing_threshold]
        
        self.selected_features = retained_features
        self.feature_domains = {f: FEATURE_DOMAIN_MAP.get(f, 'Unclassified') for f in retained_features}
        
        X_df = subset[retained_features].copy()
        
        # 4. Imputation
        if self.imputation_strategy == 'median':
            self.medians = X_df.median()
            X_imputed = X_df.fillna(self.medians)
        elif self.imputation_strategy == 'mean':
            self.means = X_df.mean()
            X_imputed = X_df.fillna(self.means)
        else:
            self.medians = X_df.median()
            X_imputed = X_df.fillna(self.medians)
            
        # 5. Standardization (StandardScaler)
        X_vals = X_imputed.values.astype(np.float64)
        self.scaler_mean = np.mean(X_vals, axis=0)
        self.scaler_std = np.std(X_vals, axis=0)
        # Avoid division by zero
        self.scaler_std[self.scaler_std == 0] = 1.0
        
        X_scaled = (X_vals - self.scaler_mean) / self.scaler_std
        
        # Save cleaned dataset for reproducible exports
        export_df = self.identifiers_df.copy()
        for idx, col in enumerate(self.selected_features):
            export_df[col] = X_imputed[col].values
        export_df.to_csv(CLEANED_CSV_PATH, index=False)
        
        audit_info = {
            'total_original_features': df.shape[1],
            'eligible_features': len(available_features),
            'retained_features': len(retained_features),
            'dropped_for_missingness': dropped_features,
            'imputation_strategy': self.imputation_strategy,
            'imputed_values_count': int(subset[retained_features].isnull().sum().sum()),
            'sample_count': len(df)
        }
        
        return X_scaled, X_imputed.values, self.selected_features, self.identifiers_df, audit_info

def run_preprocessing(missing_threshold=0.5, imputation_strategy='median'):
    pipeline = PreprocessingPipeline(missing_threshold, imputation_strategy)
    X_scaled, X_raw, features, ids, audit = pipeline.fit_transform()
    return {
        'pipeline': pipeline,
        'X_scaled': X_scaled,
        'X_raw': X_raw,
        'features': features,
        'identifiers': ids,
        'audit': audit
    }

if __name__ == '__main__':
    res = run_preprocessing()
    print("Preprocessing completed!")
    print(f"X_scaled shape: {res['X_scaled'].shape}")
    print(f"Retained features: {len(res['features'])}")
    print(f"Imputed values count: {res['audit']['imputed_values_count']}")

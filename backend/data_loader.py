import os
import re
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
DATA_FILE = os.path.join(DATA_DIR, 'communities.data')
NAMES_FILE = os.path.join(DATA_DIR, 'communities.names')
CLEANED_FILE = os.path.join(DATA_DIR, 'communities_cleaned.csv')

PROVENANCE = {
    'dataset_title': 'Communities and Crime',
    'repository': 'UCI Machine Learning Repository',
    'canonical_doi': '10.24432/C53W3X',
    'canonical_url': 'https://archive.ics.uci.edu/dataset/183/communities%2Band%2Bcrime',
    'creator': 'Michael Redmond, La Salle University',
    'date_donated': '2009-07-13',
    'data_sources': '1990 US Census, 1990 LEMAS survey, 1995 FBI UCR',
    'raw_rows': 1994,
    'raw_attributes': 128,
    'missing_token': '?'
}

def parse_attribute_names(names_path=NAMES_FILE):
    if not os.path.exists(names_path):
        raise FileNotFoundError(f"Attribute documentation not found at {names_path}")
    
    with open(names_path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
        
    matches = re.findall(r'@attribute\s+(\S+)\s+(\S+)', text)
    if not matches:
        raise ValueError("Could not parse @attribute lines from .names file.")
    
    attributes = [{'name': m[0], 'type': m[1], 'index': idx} for idx, m in enumerate(matches)]
    return attributes

def load_canonical_data():
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(f"Raw data file not found at {DATA_FILE}")
        
    attributes = parse_attribute_names(NAMES_FILE)
    col_names = [a['name'] for a in attributes]
    
    df = pd.read_csv(
        DATA_FILE,
        header=None,
        names=col_names,
        na_values='?',
        keep_default_na=True,
        low_memory=False
    )
    
    # Audit assertions
    assert df.shape[0] == 1994, f"Expected 1994 rows, got {df.shape[0]}"
    assert df.shape[1] == 128, f"Expected 128 attributes, got {df.shape[1]}"
    
    return df, attributes

def get_dataset_audit():
    df, attributes = load_canonical_data()
    
    missing_counts = df.isnull().sum()
    missing_pct = (missing_counts / len(df)) * 100
    
    missing_summary = []
    for col in df.columns:
        cnt = int(missing_counts[col])
        if cnt > 0:
            missing_summary.append({
                'column': col,
                'missing_count': cnt,
                'missing_pct': round(float(missing_pct[col]), 2)
            })
            
    # Sort by highest missing count
    missing_summary.sort(key=lambda x: x['missing_count'], reverse=True)
    
    return {
        'provenance': PROVENANCE,
        'shape': {'rows': df.shape[0], 'columns': df.shape[1]},
        'columns_with_missing': len(missing_summary),
        'missing_summary': missing_summary,
        'duplicate_rows': int(df.duplicated().sum()),
        'unique_communities': int(df['communityname'].nunique())
    }

if __name__ == '__main__':
    audit = get_dataset_audit()
    print("Dataset audit completed successfully!")
    print(f"Rows: {audit['shape']['rows']}, Columns: {audit['shape']['columns']}")
    print(f"Columns with missing values: {audit['columns_with_missing']}")
    print(f"Unique communities: {audit['unique_communities']}")

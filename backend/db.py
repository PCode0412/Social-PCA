import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'community_profiling.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Dataset metadata
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS dataset_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        canonical_doi TEXT,
        canonical_url TEXT,
        retrieval_date TEXT,
        total_rows INTEGER,
        total_attributes INTEGER,
        socioeconomic_features INTEGER,
        missing_handled_count INTEGER
    )
    ''')
    
    # Experiments table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id TEXT UNIQUE,
        timestamp TEXT,
        method TEXT,
        k INTEGER,
        alpha REAL,
        pc_count INTEGER,
        var_retained REAL,
        silhouette REAL,
        cophenetic_r REAL,
        stability REAL,
        min_cluster_size INTEGER,
        runtime_ms REAL,
        config_json TEXT
    )
    ''')
    
    # Cluster assignments
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cluster_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id TEXT,
        community_idx INTEGER,
        community_name TEXT,
        state TEXT,
        cluster_id INTEGER,
        pc1 REAL,
        pc2 REAL,
        pc3 REAL
    )
    ''')
    
    # Cluster profiles
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cluster_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        experiment_id TEXT,
        cluster_id INTEGER,
        cluster_size INTEGER,
        cluster_pct REAL,
        persona_tag TEXT,
        top_features_json TEXT,
        domain_scores_json TEXT,
        mean_features_json TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

def save_experiment(experiment_data, assignments_df, profiles_list):
    conn = get_connection()
    cursor = conn.cursor()
    exp_id = experiment_data['experiment_id']
    
    # Upsert experiment record
    cursor.execute('''
    INSERT OR REPLACE INTO experiments (
        experiment_id, timestamp, method, k, alpha, pc_count, var_retained,
        silhouette, cophenetic_r, stability, min_cluster_size, runtime_ms, config_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        exp_id,
        experiment_data.get('timestamp', datetime.now().isoformat()),
        experiment_data['method'],
        experiment_data['k'],
        experiment_data.get('alpha', 0.5),
        experiment_data['pc_count'],
        experiment_data['var_retained'],
        experiment_data['silhouette'],
        experiment_data['cophenetic_r'],
        experiment_data['stability'],
        experiment_data['min_cluster_size'],
        experiment_data['runtime_ms'],
        json.dumps(experiment_data.get('config', {}))
    ))
    
    # Clear old assignments if re-running
    cursor.execute('DELETE FROM cluster_assignments WHERE experiment_id = ?', (exp_id,))
    cursor.execute('DELETE FROM cluster_profiles WHERE experiment_id = ?', (exp_id,))
    
    # Insert assignments
    assignment_rows = []
    for _, row in assignments_df.iterrows():
        assignment_rows.append((
            exp_id,
            int(row['community_idx']),
            str(row['community_name']),
            str(row['state']),
            int(row['cluster']),
            float(row.get('PC1', 0.0)),
            float(row.get('PC2', 0.0)),
            float(row.get('PC3', 0.0))
        ))
    cursor.executemany('''
    INSERT INTO cluster_assignments (
        experiment_id, community_idx, community_name, state, cluster_id, pc1, pc2, pc3
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', assignment_rows)
    
    # Insert profiles
    profile_rows = []
    for p in profiles_list:
        profile_rows.append((
            exp_id,
            int(p['cluster_id']),
            int(p['size']),
            float(p['pct']),
            str(p['persona_tag']),
            json.dumps(p['top_features']),
            json.dumps(p['domain_scores']),
            json.dumps(p.get('mean_features', {}))
        ))
    cursor.executemany('''
    INSERT INTO cluster_profiles (
        experiment_id, cluster_id, cluster_size, cluster_pct, persona_tag,
        top_features_json, domain_scores_json, mean_features_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', profile_rows)
    
    conn.commit()
    conn.close()

def get_all_experiments():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM experiments ORDER BY id DESC')
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_experiment_details(experiment_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM experiments WHERE experiment_id = ?', (experiment_id,))
    exp = cursor.fetchone()
    if not exp:
        conn.close()
        return None
    
    exp_dict = dict(exp)
    
    cursor.execute('SELECT * FROM cluster_profiles WHERE experiment_id = ? ORDER BY cluster_id', (experiment_id,))
    profiles = []
    for r in cursor.fetchall():
        d = dict(r)
        d['top_features'] = json.loads(d['top_features_json'])
        d['domain_scores'] = json.loads(d['domain_scores_json'])
        d['mean_features'] = json.loads(d['mean_features_json'])
        profiles.append(d)
        
    cursor.execute('SELECT * FROM cluster_assignments WHERE experiment_id = ?', (experiment_id,))
    assignments = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    return {
        'experiment': exp_dict,
        'profiles': profiles,
        'assignments': assignments
    }

if __name__ == '__main__':
    init_db()
    print('SQLite database initialized successfully at:', DB_PATH)

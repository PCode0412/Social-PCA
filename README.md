# Socio-Economic Community Profiling Using PCA and Hybrid Hierarchical Clustering (HSPC)

An interactive, reproducible unsupervised machine learning system designed to profile communities based on socio-economic indicators using Principal Component Analysis (PCA) and a proposed Hybrid Hierarchical Clustering algorithm (HSPC).

Built with a **React + Vite** frontend, **FastAPI** REST backend, and **SQLite** persistence.

---

## 1. Dataset Provenance & Integrity

* **Dataset Title:** Communities and Crime
* **Repository:** UCI Machine Learning Repository
* **Canonical DOI:** [10.24432/C53W3X](https://doi.org/10.24432/C53W3X)
* **Canonical URL:** [https://archive.ics.uci.edu/dataset/183/communities%2Band%2Bcrime](https://archive.ics.uci.edu/dataset/183/communities%2Band%2Bcrime)
* **Creator / Donator:** Michael Redmond, Department of Mathematics and Computer Science, La Salle University
* **Source Attribution:** 1990 US Census, 1990 Law Enforcement Management and Administrative Statistics (LEMAS), 1995 FBI Uniform Crime Reporting (UCR)
* **Dataset Shape:** Exactly **1,994 instances** and **128 attributes**
* **Duplicate Rows:** 0 duplicate rows detected
* **Missing Value Token:** Canonical `'?'`
* **Integrity Audit:** 
  * 22 Law Enforcement (`Lemas*`, `Polic*`) features have **1,675 missing observations** (84.0% missingness). These were excluded to avoid bias and preserve socio-economic focus.
  * Geographic codes (`community`, `county`) are metadata identifiers retained for traceability only.
  * Only a single value in `OtherPerCap` is missing across the eligible socio-economic features; it is imputed using the median.
  * The target crime outcome (`ViolentCrimesPerPop`) is strictly excluded from clustering to avoid circularity.

---

## 2. Theoretical Architecture & Feature Taxonomy

### 2.1 Domain-Aware Feature Taxonomy (89 Socio-Economic Indicators)
Indicators are categorized into four substantive domains:
1. **Demographic (14 features):** Population size, age distribution (`agePct12t21`, `agePct65up`), racial composition, household density, and urbanicity.
2. **Economic (26 features):** Median family income, per capita income, poverty rates (`PctPopUnderPov`), employment/unemployment, and managerial vs. manufacturing occupations.
3. **Housing (24 features):** Home ownership rates (`PctHousOwnOcc`), median home values, median rent, vacancy rates, plumbing, and age of housing stock.
4. **Social & Family Structure (25 features):** Family cohesion (`pctKids2Par`), single-parent households, divorce rates, immigration recency, and language proficiency.

### 2.2 Principal Component Analysis (PCA)
Features are standardized via $\text{StandardScaler}$ ($\mu = 0, \sigma = 1$). Singular Value Decomposition (SVD) decomposes the centered data matrix:
$$X = U \Sigma V^T$$
Eigenvalues $\lambda_i = \frac{S_i^2}{n - 1}$ determine component variance. **11 Principal Components** are retained, explaining **81.14% cumulative variance** (meeting the 80–90% retention criterion).

### 2.3 Proposed Method: Hybrid Socio-Economic PCA Clustering (HSPC)
HSPC introduces two methodological contributions:
1. **Domain-Balanced Block Scaling:** Pre-PCA feature scaling factor $w_d = \frac{1}{\sqrt{m_d}}$ where $m_d$ is the number of features in domain $d$, ensuring balanced domain influence across the latent manifold.
2. **Scale-Reconciled Hybrid Merge Criterion:**
   $$D_H(A, B) = \alpha \cdot D_W^{\text{norm}}(A, B) + (1 - \alpha) \cdot D_A(A, B)$$
   Where $D_W$ is Ward's minimum-variance increase and $D_A$ is the Average linkage pairwise Euclidean distance. Dynamic scale normalization ensures strict monotonicity of merge heights.

---

## 3. Measured Experimental Results (k = 4)

All metrics below are measured directly on the canonical 1,994 community instances:

| Method | PC Count | Variance Retained | k | Silhouette Score &uarr; | Cophenetic $r$ &uarr; | Stability (ARI) | Min Cluster Size | Runtime (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PCA + Ward Linkage** | 11 | 81.14% | 4 | 0.1909 | 0.4324 | 0.0011 | 107 | 231.3 ms |
| **PCA + Average Linkage** | 11 | 81.14% | 4 | **0.3284** | **0.7529** | 0.0011 | **1** *(Degenerate)* | 207.2 ms |
| **PCA + Complete Linkage** | 11 | 81.14% | 4 | 0.1559 | 0.5364 | 0.0011 | 38 | 211.7 ms |
| **Proposed HSPC ($\alpha=0.5$)** | 11 | 81.14% | 4 | **0.2055** | **0.5560** | 0.0011 | **34** | 447.5 ms |

### Key Methodological Insights:
* **Average Linkage Failure:** While Average linkage achieves the highest cophenetic correlation ($r = 0.7529$), it degenerates by isolating a single outlier community (min size = 1), causing severe chaining.
* **Ward's Trade-Off:** Ward's method enforces compact, balanced clusters (min size = 107) but distorts the pairwise tree hierarchy (cophenetic $r = 0.4324$).
* **HSPC Pareto Advantage:** The proposed HSPC method provides a superior Pareto trade-off: higher Silhouette separation ($0.2055$) than Ward and Complete, superior Cophenetic fidelity ($0.5560$) over Ward, while maintaining non-degenerate, substantively meaningful cluster sizes (min size = 34).

---

## 4. Socio-Economic Cluster Profiles & Personas

* **Cluster 1 (Economically Affluent / High-Value Residential):**
  * Size: 531 communities (26.6%)
  * Distinguishing Features: High median income ($+1.12\sigma$), high home values ($+1.08\sigma$), low poverty ($-0.94\sigma$).
* **Cluster 2 (Economically Constrained / High Support Need):**
  * Size: 618 communities (31.0%)
  * Distinguishing Features: Elevated poverty ($+1.04\sigma$), lower median income ($-0.98\sigma$), higher unemployment.
* **Cluster 3 (High-Density Urban / Young Demographic Mix):**
  * Size: 34 communities (1.7%)
  * Distinguishing Features: High population density, diverse demographics, multi-family housing stock.
* **Cluster 4 (Mid-Tier Balanced / Working Family Communities):**
  * Size: 811 communities (40.7%)
  * Distinguishing Features: Moderate housing costs, balanced manufacturing/service employment, stable tenure.

---

## 5. System Setup & Launch Instructions

### Prerequisites
* **Python 3.10+** (with `pip`)
* **Node.js v18+** and `npm`

### Step 1: Install Python Dependencies & Verify Database
```bash
# In the root workspace:
python -m pip install -r requirements.txt
```

### Step 2: Run Unit Tests
Verify that all 11 unit tests pass:
```bash
python -m unittest discover backend/tests
```

### Step 3: Start the Backend (FastAPI + SQLite)
```bash
python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
```
*API interactive documentation will be available at:* `http://127.0.0.1:8000/docs`

### Step 4: Start the Frontend (React + Vite)
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Open your browser at:* `http://localhost:5173`

*(Note: The React frontend includes full offline snapshot data, allowing instant exploration even before starting the backend!)*

---

## 6. Generated Output Artifacts

All required deliverables are saved in the `outputs/` directory:
* `outputs/cluster_assignments.csv`: Complete community cluster assignments and PC1–PC3 coordinates.
* `outputs/model_metrics.csv`: Measured metrics table for all 4 models.
* `outputs/pca_loadings.csv`: Component-feature loading values and domain drivers.
* `outputs/cluster_profiles.csv`: Standardized cluster profiles, persona labels, and domain scores.
* `outputs/run_config.json`: Run configuration, dataset provenance, and preprocessing parameters.

---

## 7. References
1. Redmond, M. (2002). *Communities and Crime Dataset*. UCI Machine Learning Repository. DOI: [10.24432/C53W3X](https://doi.org/10.24432/C53W3X).
2. Jolliffe, I. T., & Cadima, J. (2016). *Principal Component Analysis: A Review and Recent Developments*. Philosophical Transactions of the Royal Society A. DOI: [10.1098/rsta.2015.0202](https://doi.org/10.1098/rsta.2015.0202).
3. Vyas, S., & Kumaranayake, L. (2006). *Constructing Socio-Economic Status Indices: How to Use Principal Components Analysis*. Health Policy and Planning. DOI: [10.1093/heapol/czl029](https://doi.org/10.1093/heapol/czl029).
4. Sokal, R. R., & Rohlf, F. J. (1962). *The Comparison of Dendrograms by Objective Methods*. Taxon. DOI: [10.2307/1217208](https://doi.org/10.2307/1217208).

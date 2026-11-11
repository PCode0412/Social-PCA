"""
Feature Selection and Taxonomy for Socio-Economic Community Profiling
Categorizes canonical UCI Communities & Crime indicators into substantive domains.
Excludes identifiers, crime targets, and law-enforcement features.
"""

IDENTIFIER_COLUMNS = ['state', 'county', 'community', 'communityname', 'fold']
TARGET_COLUMN = 'ViolentCrimesPerPop'

# 23 Law enforcement indicators with ~84% missingness and distinct institutional construct
LAW_ENFORCEMENT_COLUMNS = [
    'PolicCars', 'PolicOperBudg', 'LemasPctPolicOnPatr', 'LemasGangUnitDeploy',
    'LemasPctOfficDrugUn', 'PolicBudgPerPop', 'LemasSwFTPerPop', 'LemasSwornFT',
    'LemasSwFTFieldOps', 'LemasSwFTFieldPerPop', 'LemasTotalReq', 'LemasTotReqPerPop',
    'PolicReqPerOffic', 'PolicPerPop', 'RacialMatchCommPol', 'PctPolicWhite',
    'PctPolicBlack', 'PctPolicHisp', 'PctPolicAsian', 'PctPolicMinor',
    'OfficAssgnDrugUnits', 'NumKindsDrugsSeiz', 'PolicAveOTWorked'
]

# Domain taxonomy for 99 socio-economic indicators
DEMOGRAPHIC_FEATURES = [
    'population', 'householdsize', 'racepctblack', 'racePctWhite', 'racePctAsian',
    'racePctHisp', 'agePct12t21', 'agePct12t29', 'agePct16t24', 'agePct65up',
    'numbUrban', 'pctUrban', 'LandArea', 'PopDens'
]

ECONOMIC_FEATURES = [
    'medIncome', 'pctWWage', 'pctWFarmSelf', 'pctWInvInc', 'pctWSocSec',
    'pctWPubAsst', 'pctWRetire', 'medFamInc', 'perCapInc', 'whitePerCap',
    'blackPerCap', 'indianPerCap', 'AsianPerCap', 'OtherPerCap', 'HispPerCap',
    'NumUnderPov', 'PctPopUnderPov', 'PctLess9thGrade', 'PctNotHSGrad',
    'PctBSorMore', 'PctUnemployed', 'PctEmploy', 'PctEmplManu', 'PctEmplProfServ',
    'PctOccupManu', 'PctOccupMgmt'
]

HOUSING_FEATURES = [
    'PctOccup', 'PctHousOccup', 'PctHousOwnOcc', 'PctVacantBoarded', 'PctVacMore6Mos',
    'MedYrHousBuilt', 'PctHousNoPhone', 'PctWOFullPlumb', 'OwnOccLowQuart', 'OwnOccMedVal',
    'OwnOccHiQuart', 'RentLowQ', 'RentMedian', 'RentHighQ', 'MedRent',
    'MedRentPctHousInc', 'MedOwnCostPctInc', 'MedOwnCostPctIncNoMtg', 'NumInShelters',
    'NumStreet', 'HousVacant', 'PctPersDenseHous', 'PctHousLess3BR', 'MedNumBR'
]

SOCIAL_FEATURES = [
    'pctKids2Par', 'pctPctWorkMom', 'pctWorkMomYoungKids', 'pctWorkMom',
    'NumKidsBornNeverMar', 'PctKidsBornNeverMar', 'NumImmig', 'PctImmigRecent',
    'PctImmigRec5', 'PctImmigRec8', 'PctImmigRec10', 'PctRecentImmig',
    'PctRecImmig5', 'PctRecImmig8', 'PctRecImmig10', 'PctSpeakEnglOnly',
    'PctNotSpeakEnglWell', 'PctLargHouseFam', 'PctLargHouseOccup', 'PersPerOccupHous',
    'PersPerOwnOccHous', 'PersPerRentOccHous', 'PersPerFam', 'PctPersOwnOccup',
    'PctForeignBorn', 'PctBornSameState', 'PctSameHouse85', 'PctSameCity85',
    'PctSameState85', 'MalePctDivorce', 'MalePctNevMarr', 'FemalePctDiv', 'TotalPctDiv'
]

# Combined dictionary of all feature domains
FEATURE_DOMAIN_MAP = {}
for f in DEMOGRAPHIC_FEATURES: FEATURE_DOMAIN_MAP[f] = 'Demographic'
for f in ECONOMIC_FEATURES: FEATURE_DOMAIN_MAP[f] = 'Economic'
for f in HOUSING_FEATURES: FEATURE_DOMAIN_MAP[f] = 'Housing'
for f in SOCIAL_FEATURES: FEATURE_DOMAIN_MAP[f] = 'Social'

def get_feature_catalog(all_columns):
    catalog = []
    for c in all_columns:
        if c in IDENTIFIER_COLUMNS:
            status = 'Excluded (Display / Identifier)'
            domain = 'Identifier'
            reason = 'Administrative / Nominal identifier'
        elif c == TARGET_COLUMN:
            status = 'Excluded (Outcome / Target)'
            domain = 'Outcome'
            reason = 'Avoid defining socio-economic clusters by crime outcome'
        elif c in LAW_ENFORCEMENT_COLUMNS:
            status = 'Excluded (Law Enforcement)'
            domain = 'Law Enforcement'
            reason = 'High missingness (84%) and institutional distinctness'
        elif c in FEATURE_DOMAIN_MAP:
            domain = FEATURE_DOMAIN_MAP[c]
            status = f'Included ({domain})'
            reason = f'Core indicator representing {domain.lower()} characteristics'
        else:
            domain = 'Other'
            status = 'Excluded'
            reason = 'Unclassified indicator'
            
        catalog.append({
            'column': c,
            'domain': domain,
            'status': status,
            'reason': reason
        })
    return catalog

def get_eligible_socioeconomic_features():
    return list(FEATURE_DOMAIN_MAP.keys())

def get_domain_weights(weighting_scheme='balanced'):
    """
    Computes domain weighting factors for domain-balanced PCA representation.
    In ordinary PCA, all features have weight 1.0.
    In balanced representation, each domain receives an equal aggregate variance weight:
    w_d = 1.0 / sqrt(num_features_in_domain)
    so sum_{f in d} w_d^2 = 1.0 for each domain.
    """
    domain_counts = {}
    for f, d in FEATURE_DOMAIN_MAP.items():
        domain_counts[d] = domain_counts.get(d, 0) + 1
        
    weights = {}
    if weighting_scheme == 'balanced':
        for f, d in FEATURE_DOMAIN_MAP.items():
            weights[f] = 1.0 / (domain_counts[d] ** 0.5)
    else:
        for f in FEATURE_DOMAIN_MAP.keys():
            weights[f] = 1.0
            
    return weights

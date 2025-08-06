// Official ICD-10 Diagnosis Codes from CMS.gov
// Comprehensive medical diagnosis codes for prior authorization requests
// Source: CMS.gov ICD-10-CM FY 2026 (effective October 1, 2025)

export const COMMON_ICD10_DIAGNOSIS_CODES = [
  // Chapter A: Certain infectious and parasitic diseases (A00-B99)
  { icd10Code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified', category: 'Infectious Diseases', chapterCode: 'A', chapterDescription: 'Certain infectious and parasitic diseases' },
  { icd10Code: 'B34.9', description: 'Viral infection, unspecified', category: 'Infectious Diseases', chapterCode: 'A', chapterDescription: 'Certain infectious and parasitic diseases' },
  
  // Chapter C: Malignant neoplasms (C00-C97)
  { icd10Code: 'C78.00', description: 'Secondary malignant neoplasm of unspecified lung', category: 'Neoplasms', chapterCode: 'C', chapterDescription: 'Neoplasms' },
  { icd10Code: 'C80.1', description: 'Malignant neoplasm, unspecified', category: 'Neoplasms', chapterCode: 'C', chapterDescription: 'Neoplasms' },
  
  // Chapter E: Endocrine, nutritional and metabolic diseases (E00-E89)
  { icd10Code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine/Metabolic', chapterCode: 'E', chapterDescription: 'Endocrine, nutritional and metabolic diseases' },
  { icd10Code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'Endocrine/Metabolic', chapterCode: 'E', chapterDescription: 'Endocrine, nutritional and metabolic diseases' },
  { icd10Code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'Endocrine/Metabolic', chapterCode: 'E', chapterDescription: 'Endocrine, nutritional and metabolic diseases' },
  { icd10Code: 'E66.9', description: 'Obesity, unspecified', category: 'Endocrine/Metabolic', chapterCode: 'E', chapterDescription: 'Endocrine, nutritional and metabolic diseases' },
  
  // Chapter F: Mental, Behavioral and Neurodevelopmental disorders (F01-F99)
  { icd10Code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Mental Health', chapterCode: 'F', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders' },
  { icd10Code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'Mental Health', chapterCode: 'F', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders' },
  { icd10Code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified', category: 'Mental Health', chapterCode: 'F', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders' },
  
  // Chapter G: Diseases of the nervous system (G00-G99)
  { icd10Code: 'G43.909', description: 'Migraine, unspecified, not intractable, without status migrainosus', category: 'Neurological', chapterCode: 'G', chapterDescription: 'Diseases of the nervous system' },
  { icd10Code: 'G89.3', description: 'Neoplasm related pain (acute) (chronic)', category: 'Neurological', chapterCode: 'G', chapterDescription: 'Diseases of the nervous system' },
  { icd10Code: 'G89.29', description: 'Other chronic pain', category: 'Neurological', chapterCode: 'G', chapterDescription: 'Diseases of the nervous system' },
  
  // Chapter I: Diseases of the circulatory system (I00-I99)
  { icd10Code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular', chapterCode: 'I', chapterDescription: 'Diseases of the circulatory system' },
  { icd10Code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', category: 'Cardiovascular', chapterCode: 'I', chapterDescription: 'Diseases of the circulatory system' },
  { icd10Code: 'I48.91', description: 'Unspecified atrial fibrillation', category: 'Cardiovascular', chapterCode: 'I', chapterDescription: 'Diseases of the circulatory system' },
  
  // Chapter J: Diseases of the respiratory system (J00-J99)
  { icd10Code: 'J44.1', description: 'Chronic obstructive pulmonary disease with acute exacerbation', category: 'Respiratory', chapterCode: 'J', chapterDescription: 'Diseases of the respiratory system' },
  { icd10Code: 'J45.9', description: 'Asthma, unspecified', category: 'Respiratory', chapterCode: 'J', chapterDescription: 'Diseases of the respiratory system' },
  { icd10Code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'Respiratory', chapterCode: 'J', chapterDescription: 'Diseases of the respiratory system' },
  
  // Chapter K: Diseases of the digestive system (K00-K95)
  { icd10Code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive', chapterCode: 'K', chapterDescription: 'Diseases of the digestive system' },
  { icd10Code: 'K59.00', description: 'Constipation, unspecified', category: 'Digestive', chapterCode: 'K', chapterDescription: 'Diseases of the digestive system' },
  { icd10Code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis without obstruction', category: 'Digestive', chapterCode: 'K', chapterDescription: 'Diseases of the digestive system' },
  
  // Chapter M: Diseases of the musculoskeletal system (M00-M99)
  { icd10Code: 'M25.511', description: 'Pain in right shoulder', category: 'Musculoskeletal', chapterCode: 'M', chapterDescription: 'Diseases of the musculoskeletal system and connective tissue' },
  { icd10Code: 'M25.512', description: 'Pain in left shoulder', category: 'Musculoskeletal', chapterCode: 'M', chapterDescription: 'Diseases of the musculoskeletal system and connective tissue' },
  { icd10Code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal', chapterCode: 'M', chapterDescription: 'Diseases of the musculoskeletal system and connective tissue' },
  { icd10Code: 'M79.3', description: 'Panniculitis, unspecified', category: 'Musculoskeletal', chapterCode: 'M', chapterDescription: 'Diseases of the musculoskeletal system and connective tissue' },
  { icd10Code: 'M17.11', description: 'Unilateral primary osteoarthritis, right knee', category: 'Musculoskeletal', chapterCode: 'M', chapterDescription: 'Diseases of the musculoskeletal system and connective tissue' },
  { icd10Code: 'M17.12', description: 'Unilateral primary osteoarthritis, left knee', category: 'Musculoskeletal', chapterCode: 'M', chapterDescription: 'Diseases of the musculoskeletal system and connective tissue' },
  
  // Chapter N: Diseases of the genitourinary system (N00-N99)
  { icd10Code: 'N18.6', description: 'End stage renal disease', category: 'Genitourinary', chapterCode: 'N', chapterDescription: 'Diseases of the genitourinary system' },
  { icd10Code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Genitourinary', chapterCode: 'N', chapterDescription: 'Diseases of the genitourinary system' },
  
  // Chapter R: Symptoms, signs and abnormal clinical findings (R00-R99)
  { icd10Code: 'R06.02', description: 'Shortness of breath', category: 'Symptoms/Signs', chapterCode: 'R', chapterDescription: 'Symptoms, signs and abnormal clinical and laboratory findings' },
  { icd10Code: 'R50.9', description: 'Fever, unspecified', category: 'Symptoms/Signs', chapterCode: 'R', chapterDescription: 'Symptoms, signs and abnormal clinical and laboratory findings' },
  { icd10Code: 'R06.00', description: 'Dyspnea, unspecified', category: 'Symptoms/Signs', chapterCode: 'R', chapterDescription: 'Symptoms, signs and abnormal clinical and laboratory findings' },
  
  // Chapter S: Injury, poisoning and consequences of external causes (S00-T88)
  { icd10Code: 'S72.001A', description: 'Fracture of unspecified part of neck of right femur, initial encounter for closed fracture', category: 'Injury/Poisoning', chapterCode: 'S', chapterDescription: 'Injury, poisoning and certain other consequences of external causes' },
  { icd10Code: 'S83.511A', description: 'Sprain of anterior cruciate ligament of right knee, initial encounter', category: 'Injury/Poisoning', chapterCode: 'S', chapterDescription: 'Injury, poisoning and certain other consequences of external causes' },
  
  // Chapter Z: Factors influencing health status (Z00-Z99)
  { icd10Code: 'Z51.11', description: 'Encounter for antineoplastic chemotherapy', category: 'Health Status Factors', chapterCode: 'Z', chapterDescription: 'Factors influencing health status and contact with health services' },
  { icd10Code: 'Z12.11', description: 'Encounter for screening for malignant neoplasm of colon', category: 'Health Status Factors', chapterCode: 'Z', chapterDescription: 'Factors influencing health status and contact with health services' },
];

// Common diagnoses requiring prior authorization for specific treatments
export const PRIOR_AUTH_DIAGNOSIS_CODES = [
  // Cancer diagnoses requiring specialized treatments
  { icd10Code: 'C25.9', description: 'Malignant neoplasm of pancreas, unspecified', category: 'Oncology', requiresPriorAuth: true },
  { icd10Code: 'C78.30', description: 'Secondary malignant neoplasm of unspecified respiratory organ', category: 'Oncology', requiresPriorAuth: true },
  
  // Chronic conditions requiring ongoing management
  { icd10Code: 'M05.9', description: 'Rheumatoid arthritis, unspecified', category: 'Rheumatology', requiresPriorAuth: true },
  { icd10Code: 'M32.9', description: 'Systemic lupus erythematosus, unspecified', category: 'Rheumatology', requiresPriorAuth: true },
  
  // Neurological conditions requiring specialized interventions
  { icd10Code: 'G35', description: 'Multiple sclerosis', category: 'Neurology', requiresPriorAuth: true },
  { icd10Code: 'G20', description: 'Parkinson\'s disease', category: 'Neurology', requiresPriorAuth: true },
  
  // Mental health conditions requiring specialized treatments
  { icd10Code: 'F20.9', description: 'Schizophrenia, unspecified', category: 'Psychiatry', requiresPriorAuth: true },
  { icd10Code: 'F31.9', description: 'Bipolar disorder, unspecified', category: 'Psychiatry', requiresPriorAuth: true },
];

// All ICD-10 codes combined for seeding
export const ALL_ICD10_CODES = [
  ...COMMON_ICD10_DIAGNOSIS_CODES.map(code => ({ ...code, requiresPriorAuth: false })),
  ...PRIOR_AUTH_DIAGNOSIS_CODES
];
// CPT Codes with Medical Descriptions and Prior Authorization Requirements
// Based on healthcare industry standards and common medical procedures

export interface CPTCodeData {
  code: string;
  description: string;
  category: string;
  requiresPriorAuth: boolean;
  treatmentType: string;
}

export const cptCodesData: CPTCodeData[] = [
  // Imaging/Radiology
  {
    code: "70450",
    description: "CT scan of head or brain without contrast",
    category: "Diagnostic Imaging",
    requiresPriorAuth: true,
    treatmentType: "CT Scan - Head/Brain"
  },
  {
    code: "70460",
    description: "CT scan of head or brain with contrast",
    category: "Diagnostic Imaging", 
    requiresPriorAuth: true,
    treatmentType: "CT Scan - Head/Brain with Contrast"
  },
  {
    code: "72148",
    description: "MRI scan of lumbar spine without contrast",
    category: "Diagnostic Imaging",
    requiresPriorAuth: true,
    treatmentType: "MRI Scan - Lumbar Spine"
  },
  {
    code: "72149",
    description: "MRI scan of lumbar spine with contrast",
    category: "Diagnostic Imaging",
    requiresPriorAuth: true,
    treatmentType: "MRI Scan - Lumbar Spine with Contrast"
  },
  {
    code: "73721",
    description: "MRI scan of knee joint without contrast",
    category: "Diagnostic Imaging",
    requiresPriorAuth: true,
    treatmentType: "MRI Scan - Knee Joint"
  },
  {
    code: "73722",
    description: "MRI scan of knee joint with contrast",
    category: "Diagnostic Imaging",
    requiresPriorAuth: true,
    treatmentType: "MRI Scan - Knee Joint with Contrast"
  },
  {
    code: "76700",
    description: "Ultrasound examination of abdomen",
    category: "Diagnostic Imaging",
    requiresPriorAuth: false,
    treatmentType: "Ultrasound - Abdominal"
  },
  
  // Cardiology
  {
    code: "93000",
    description: "Electrocardiogram with interpretation and report",
    category: "Cardiovascular",
    requiresPriorAuth: false,
    treatmentType: "Electrocardiogram (ECG/EKG)"
  },
  {
    code: "93306",
    description: "Echocardiography transthoracic with interpretation",
    category: "Cardiovascular",
    requiresPriorAuth: true,
    treatmentType: "Echocardiogram"
  },
  {
    code: "93015",
    description: "Cardiovascular stress test with physician supervision",
    category: "Cardiovascular",
    requiresPriorAuth: true,
    treatmentType: "Cardiac Stress Test"
  },
  
  // Surgery/Procedures
  {
    code: "29881",
    description: "Arthroscopy of knee with meniscectomy",
    category: "Orthopedic Surgery",
    requiresPriorAuth: true,
    treatmentType: "Knee Arthroscopy - Meniscectomy"
  },
  {
    code: "64483",
    description: "Injection of anesthetic agent; lumbar or sacral",
    category: "Pain Management",
    requiresPriorAuth: true,
    treatmentType: "Epidural Steroid Injection - Lumbar"
  },
  {
    code: "20610",
    description: "Arthrocentesis, aspiration and/or injection of joint",
    category: "Orthopedic Procedures",
    requiresPriorAuth: false,
    treatmentType: "Joint Injection/Aspiration"
  },
  
  // Physical Therapy
  {
    code: "97110",
    description: "Therapeutic exercises to develop strength and endurance",
    category: "Physical Therapy",
    requiresPriorAuth: true,
    treatmentType: "Physical Therapy - Therapeutic Exercise"
  },
  {
    code: "97112",
    description: "Neuromuscular reeducation of movement, balance, coordination",
    category: "Physical Therapy", 
    requiresPriorAuth: true,
    treatmentType: "Physical Therapy - Neuromuscular Reeducation"
  },
  {
    code: "97140",
    description: "Manual therapy techniques to mobilize soft tissue and joints",
    category: "Physical Therapy",
    requiresPriorAuth: true,
    treatmentType: "Physical Therapy - Manual Therapy"
  },
  
  // Gastroenterology
  {
    code: "45378",
    description: "Colonoscopy with examination of entire colon",
    category: "Gastroenterology",
    requiresPriorAuth: true,
    treatmentType: "Colonoscopy - Diagnostic"
  },
  {
    code: "43235",
    description: "Upper endoscopy with examination of esophagus, stomach, duodenum",
    category: "Gastroenterology",
    requiresPriorAuth: true,
    treatmentType: "Upper Endoscopy (EGD)"
  },
  
  // Laboratory/Pathology
  {
    code: "80053",
    description: "Comprehensive metabolic panel",
    category: "Laboratory",
    requiresPriorAuth: false,
    treatmentType: "Blood Test - Comprehensive Metabolic Panel"
  },
  {
    code: "85025",
    description: "Complete blood count with automated differential",
    category: "Laboratory",
    requiresPriorAuth: false,
    treatmentType: "Blood Test - Complete Blood Count"
  },
  
  // Dermatology
  {
    code: "11100",
    description: "Biopsy of skin, single lesion",
    category: "Dermatology",
    requiresPriorAuth: false,
    treatmentType: "Skin Biopsy"
  },
  {
    code: "17000",
    description: "Destruction of benign lesion, first lesion",
    category: "Dermatology",
    requiresPriorAuth: false,
    treatmentType: "Lesion Removal - Destruction"
  },
  
  // Ophthalmology
  {
    code: "92004",
    description: "Comprehensive eye examination for new patient",
    category: "Ophthalmology",
    requiresPriorAuth: false,
    treatmentType: "Comprehensive Eye Exam"
  },
  {
    code: "66984",
    description: "Cataract surgery with intraocular lens insertion",
    category: "Ophthalmology",
    requiresPriorAuth: true,
    treatmentType: "Cataract Surgery"
  },
  
  // Mental Health
  {
    code: "90791",
    description: "Psychiatric diagnostic evaluation",
    category: "Mental Health",
    requiresPriorAuth: true,
    treatmentType: "Psychiatric Evaluation"
  },
  {
    code: "90837",
    description: "Individual psychotherapy session, 60 minutes",
    category: "Mental Health",
    requiresPriorAuth: true,
    treatmentType: "Individual Psychotherapy"
  },
  
  // Specialty Consultations
  {
    code: "99205",
    description: "New patient comprehensive consultation, high complexity",
    category: "Consultation",
    requiresPriorAuth: false,
    treatmentType: "Specialist Consultation - New Patient"
  },
  {
    code: "99215",
    description: "Established patient visit, high complexity",
    category: "Office Visit",
    requiresPriorAuth: false,
    treatmentType: "Office Visit - High Complexity"
  }
];

// Function to get treatment type from CPT code
export function getTreatmentTypeFromCPT(cptCode: string): string {
  const cptData = cptCodesData.find(code => code.code === cptCode);
  return cptData?.treatmentType || "Medical Treatment";
}

// Function to check if CPT code requires prior authorization
export function requiresPriorAuthorization(cptCode: string): boolean {
  const cptData = cptCodesData.find(code => code.code === cptCode);
  return cptData?.requiresPriorAuth || false;
}

// Function to get CPT code description
export function getCPTDescription(cptCode: string): string {
  const cptData = cptCodesData.find(code => code.code === cptCode);
  return cptData?.description || "Medical procedure";
}

// Function to get CPT codes by category
export function getCPTCodesByCategory(category: string) {
  return cptCodesData.filter(code => code.category === category);
}

// Function to get all categories
export function getAllCategories(): string[] {
  return Array.from(new Set(cptCodesData.map(code => code.category)));
}
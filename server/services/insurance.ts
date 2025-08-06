import { PatientInsurance, InsuranceProvider } from "@shared/schema";

export interface InsuranceVerificationResult {
  isValid: boolean;
  isActive: boolean;
  coverageDetails: {
    deductible: number;
    copay: number;
    coinsurance: number;
    outOfPocketMax: number;
  };
  priorAuthRequired: boolean;
  effectiveDate: string;
  expirationDate: string;
  memberStatus: string;
  message: string;
}

export interface PriorAuthSubmission {
  patientId: number;
  insuranceId: number;
  treatmentType: string;
  cptCode: string;
  icd10Code: string;
  clinicalJustification: string;
  requestedDate: string;
  documents: string[];
}

export interface PriorAuthResponse {
  authorizationId: string;
  status: 'pending' | 'approved' | 'denied';
  referenceNumber: string;
  message: string;
  expirationDate?: string;
  denialReason?: string;
  appealDeadline?: string;
}

class InsuranceService {
  // Mock insurance verification - in production, this would integrate with real insurance APIs
  async verifyInsurance(insurance: PatientInsurance, provider: InsuranceProvider): Promise<InsuranceVerificationResult> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock different responses based on provider
    const mockResponses = {
      'BCBS': {
        isValid: true,
        isActive: true,
        coverageDetails: {
          deductible: 1000,
          copay: 25,
          coinsurance: 20,
          outOfPocketMax: 5000,
        },
        priorAuthRequired: true,
        memberStatus: 'Active',
        message: 'Coverage verified successfully',
      },
      'AETNA': {
        isValid: true,
        isActive: true,
        coverageDetails: {
          deductible: 1500,
          copay: 30,
          coinsurance: 25,
          outOfPocketMax: 6000,
        },
        priorAuthRequired: true,
        memberStatus: 'Active',
        message: 'Coverage verified successfully',
      },
      'UNITED': {
        isValid: true,
        isActive: true,
        coverageDetails: {
          deductible: 2000,
          copay: 35,
          coinsurance: 30,
          outOfPocketMax: 7000,
        },
        priorAuthRequired: false,
        memberStatus: 'Active',
        message: 'Coverage verified successfully',
      },
    };

    const response = mockResponses[provider.code as keyof typeof mockResponses] || mockResponses['BCBS'];

    return {
      ...response,
      effectiveDate: insurance.effectiveDate.toISOString(),
      expirationDate: insurance.expirationDate?.toISOString() || '',
    };
  }

  // Mock prior authorization submission
  async submitPriorAuthorization(submission: PriorAuthSubmission): Promise<PriorAuthResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const referenceNumber = `PA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock different responses based on treatment type
    const mockResponses = {
      'MRI': {
        status: 'pending' as const,
        message: 'Prior authorization request submitted successfully. Review in progress.',
      },
      'Physical Therapy': {
        status: 'approved' as const,
        message: 'Prior authorization approved. Valid for 90 days.',
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'Specialty Medication': {
        status: 'denied' as const,
        message: 'Prior authorization denied. Alternative treatment required.',
        denialReason: 'Medical necessity not established. Please provide additional clinical documentation.',
        appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    const response = mockResponses[submission.treatmentType as keyof typeof mockResponses] || mockResponses['MRI'];

    return {
      authorizationId: `AUTH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      referenceNumber,
      ...response,
    };
  }

  // Mock status check
  async checkAuthorizationStatus(authorizationId: string): Promise<PriorAuthResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock status update
    const statuses = ['pending', 'approved', 'denied'] as const;
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      authorizationId,
      status: randomStatus,
      referenceNumber: `PA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: `Authorization status: ${randomStatus}`,
      ...(randomStatus === 'approved' && {
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      ...(randomStatus === 'denied' && {
        denialReason: 'Medical necessity not established',
        appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    };
  }

  // Get supported insurance providers
  getSupportedProviders(): InsuranceProvider[] {
    return [
      { id: 1, name: 'Blue Cross Blue Shield', code: 'BCBS', contactInfo: { phone: '1-800-BCBS-INFO' }, isActive: true },
      { id: 2, name: 'Aetna', code: 'AETNA', contactInfo: { phone: '1-800-AETNA-HELP' }, isActive: true },
      { id: 3, name: 'UnitedHealth', code: 'UNITED', contactInfo: { phone: '1-800-UNITED-1' }, isActive: true },
      { id: 4, name: 'Cigna', code: 'CIGNA', contactInfo: { phone: '1-800-CIGNA-24' }, isActive: true },
    ];
  }

  // Get treatment types that require prior authorization
  getTreatmentTypes(): { code: string; name: string; requiresPriorAuth: boolean }[] {
    return [
      { code: 'MRI', name: 'MRI Brain w/ Contrast', requiresPriorAuth: true },
      { code: 'CT', name: 'CT Scan', requiresPriorAuth: true },
      { code: 'PT', name: 'Physical Therapy', requiresPriorAuth: true },
      { code: 'SPECIALTY_MED', name: 'Specialty Medication', requiresPriorAuth: true },
      { code: 'SURGERY', name: 'Surgery', requiresPriorAuth: true },
      { code: 'ROUTINE_VISIT', name: 'Routine Office Visit', requiresPriorAuth: false },
    ];
  }
}

export const insuranceService = new InsuranceService();

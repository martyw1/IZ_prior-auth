import { storage } from "../storage";
import { auditService } from "./audit";
import { InsertPriorAuthWorkflowStep, PriorAuthorization } from "@shared/schema";

// Prior Authorization Workflow Steps based on the comprehensive workflow document
export const PRIOR_AUTH_WORKFLOW_STEPS = [
  {
    stepNumber: 1,
    stepName: "Clinical Decision & Insurance Check",
    description: "Determine medical necessity and verify PA requirements",
    formFields: ["treatmentType", "cptCode", "icd10Code", "clinicalJustification"]
  },
  {
    stepNumber: 2,
    stepName: "Patient & Insurance Verification",
    description: "Verify patient eligibility and insurance coverage",
    formFields: ["patientId", "insuranceId", "memberId", "groupNumber"]
  },
  {
    stepNumber: 3,
    stepName: "Clinical Evidence Gathering",
    description: "Collect provider notes, lab results, previous treatments",
    formFields: ["clinicalEvidence", "previousTreatments", "providerNotes"]
  },
  {
    stepNumber: 4,
    stepName: "Documentation Preparation",
    description: "Prepare clinical documentation and attestation",
    formFields: ["documents", "attestation", "medicalNecessity"]
  },
  {
    stepNumber: 5,
    stepName: "Form Selection & Completion",
    description: "Select state-specific forms and complete required fields",
    formFields: ["stateFormTemplate", "formData", "procedureCodes"]
  },
  {
    stepNumber: 6,
    stepName: "Prior Authorization Submission",
    description: "Submit PA request through appropriate channel",
    formFields: ["submissionMethod", "submissionDate", "trackingNumber"]
  },
  {
    stepNumber: 7,
    stepName: "Tracking & Follow-up",
    description: "Monitor submission status and respond to requests",
    formFields: ["status", "reviewProgress", "additionalRequests"]
  },
  {
    stepNumber: 8,
    stepName: "Decision Processing",
    description: "Process approval/denial and next steps",
    formFields: ["decision", "authorizationNumber", "denialReason", "appealOptions"]
  },
  {
    stepNumber: 9,
    stepName: "Service Authorization",
    description: "Authorize service delivery and claim submission",
    formFields: ["serviceAuthorization", "expirationDate", "serviceDelivery"]
  },
  {
    stepNumber: 10,
    stepName: "Renewal & Monitoring",
    description: "Track renewals and ongoing monitoring",
    formFields: ["renewalTracking", "continuedNecessity", "outcomeMonitoring"]
  }
];

export class PriorAuthWorkflowService {
  
  // Initialize workflow for new prior authorization
  async initializeWorkflow(authorizationId: number, userId: number): Promise<void> {
    try {
      for (const step of PRIOR_AUTH_WORKFLOW_STEPS) {
        const workflowStep: InsertPriorAuthWorkflowStep = {
          authorizationId,
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          status: step.stepNumber === 1 ? 'in_progress' : 'pending',
          assignedTo: step.stepNumber === 1 ? userId : undefined,
          notes: step.description,
          formData: null,
        };
        
        await storage.createPriorAuthWorkflowStep(workflowStep);
      }
      
      // Log workflow initialization
      await auditService.logPriorAuthActivity(
        userId,
        authorizationId,
        'WORKFLOW_INITIALIZED',
        'initialization',
        null,
        { workflowSteps: PRIOR_AUTH_WORKFLOW_STEPS.length, status: 'started' },
        '',
        ''
      );
    } catch (error) {
      console.error('Failed to initialize workflow:', error);
      throw error;
    }
  }

  // Complete a workflow step
  async completeStep(
    authorizationId: number,
    stepNumber: number,
    formData: any,
    userId: number,
    notes?: string
  ): Promise<void> {
    try {
      const step = await storage.getPriorAuthWorkflowStep(authorizationId, stepNumber);
      if (!step) {
        throw new Error(`Workflow step ${stepNumber} not found`);
      }

      const beforeData = { ...step };
      
      // Update step as completed
      await storage.updatePriorAuthWorkflowStep(step.id, {
        status: 'completed',
        completedBy: userId,
        completedAt: new Date(),
        formData,
        notes: notes || step.notes,
      });

      // Move to next step if not final step
      if (stepNumber < PRIOR_AUTH_WORKFLOW_STEPS.length) {
        await storage.updatePriorAuthWorkflowStep(
          await this.getStepId(authorizationId, stepNumber + 1),
          {
            status: 'in_progress',
            assignedTo: userId,
          }
        );
      }

      // Update main authorization current step
      await storage.updatePriorAuthorization(authorizationId, {
        currentStep: stepNumber + 1,
      });

      const afterData = { ...step, status: 'completed', completedBy: userId, formData };

      // Log step completion
      await auditService.logPriorAuthActivity(
        userId,
        authorizationId,
        'STEP_COMPLETED',
        `step_${stepNumber}`,
        beforeData,
        afterData,
        '',
        ''
      );

    } catch (error) {
      console.error('Failed to complete workflow step:', error);
      throw error;
    }
  }

  // Get current step for authorization
  async getCurrentStep(authorizationId: number): Promise<any> {
    try {
      const authorization = await storage.getPriorAuthorization(authorizationId);
      if (!authorization) return null;

      const currentStep = await storage.getPriorAuthWorkflowStep(authorizationId, authorization.currentStep);
      return currentStep;
    } catch (error) {
      console.error('Failed to get current step:', error);
      return null;
    }
  }

  // Get all workflow steps for authorization
  async getWorkflowSteps(authorizationId: number): Promise<any[]> {
    try {
      return await storage.getPriorAuthWorkflowSteps(authorizationId);
    } catch (error) {
      console.error('Failed to get workflow steps:', error);
      return [];
    }
  }

  // Generate state-specific form package
  async generateFormPackage(authorizationId: number, state: string): Promise<string> {
    try {
      const authorization = await storage.getPriorAuthorization(authorizationId);
      if (!authorization) {
        throw new Error('Authorization not found');
      }

      const workflowSteps = await this.getWorkflowSteps(authorizationId);
      const patient = await storage.getPatient(authorization.patientId);
      const insurance = await storage.getPatientInsurance(authorization.insuranceId);

      // Aggregate all form data from workflow steps
      const aggregatedFormData = workflowSteps.reduce((acc, step) => {
        if (step.formData) {
          return { ...acc, ...step.formData };
        }
        return acc;
      }, {});

      // Get state form template
      const template = await storage.getStateFormTemplate(state, 'prior_auth');
      
      if (!template) {
        throw new Error(`No form template found for state: ${state}`);
      }

      // Generate complete form package data
      const formPackageData = {
        authorization,
        patient,
        insurance,
        workflowData: aggregatedFormData,
        template,
        generatedAt: new Date().toISOString(),
        state,
      };

      // Store form package data in authorization record
      const formPackagePath = `/forms/packages/${authorizationId}-${state}-${Date.now()}.json`;
      await storage.updatePriorAuthorization(authorizationId, {
        generatedFormData: formPackageData,
      });

      return formPackagePath;
    } catch (error) {
      console.error('Failed to generate form package:', error);
      throw error;
    }
  }

  private async getStepId(authorizationId: number, stepNumber: number): Promise<number> {
    const step = await storage.getPriorAuthWorkflowStep(authorizationId, stepNumber);
    return step?.id || 0;
  }
}

export const priorAuthWorkflowService = new PriorAuthWorkflowService();
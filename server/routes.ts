import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticate, authorize, generateToken, hashPassword, comparePassword, AuthenticatedRequest } from "./middleware/auth";
import { auditService } from "./services/audit";
import { appLogger } from "./services/app-logger";
import { insuranceService } from "./services/insurance";
import { encryptPHI, decryptPHI } from "./middleware/encryption";
import { insertUserSchema, insertPatientSchema, insertPriorAuthorizationSchema, insertPatientInsuranceSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { registerPriorAuthWorkflowRoutes } from "./routes/prior-auth-workflow";
import priorAuthGeneratorRoutes from "./routes/prior-auth-generator";
import icd10CodesRoutes from "./routes/icd10-codes";
import insuranceRoutes from "./routes/insurance";
import modmedEmaRoutes from "./routes/modmed-ema";
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize medical specialties data
  await storage.seedMedicalSpecialties();
  
  // Initialize default users
  await storage.seedDefaultUsers();
  
  // Initialize insurance providers
  await storage.seedInsuranceProviders();
  
  // Initialize system configuration
  await storage.seedSystemConfig();
  
  // Medical specialties routes
  app.get("/api/medical-specialties", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const specialties = await storage.getMedicalSpecialties();
      res.json(specialties);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/medical-specialties/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const specialty = await storage.getMedicalSpecialty(id);
      
      if (!specialty) {
        return res.status(404).json({ message: "Specialty not found" });
      }
      
      res.json(specialty);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.isActive) {
        await auditService.logLogin(0, false, req.ip || '', req.get("User-Agent") || '');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await comparePassword(password, user.password);
      
      if (!validPassword) {
        await auditService.logLogin(user.id, false, req.ip || '', req.get("User-Agent") || '');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user);
      await auditService.logLogin(user.id, true, req.ip || '', req.get("User-Agent") || '');
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user) {
        await auditService.logLogout(req.user.id, req.ip || '', req.get("User-Agent") || '');
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes
  app.post("/api/users", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      userData.password = await hashPassword(userData.password);
      
      const user = await storage.createUser(userData);
      
      await auditService.log(req.user!.id, 'USER_CREATE', 'user', user.id, {
        newUser: user.username,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all procedure codes endpoint
  app.get("/api/procedure-codes", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const codes = await storage.getAllProcedureCodes();
      res.json(codes);
    } catch (error) {
      appLogger.error("Failed to fetch procedure codes", error as Error, { 
        userId: req.user?.id 
      });
      res.status(500).json({ error: "Failed to fetch procedure codes" });
    }
  });

  app.get("/api/users/me", authenticate, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Patient routes
  app.get("/api/patients", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      const [patients, totalCount] = await Promise.all([
        storage.getPatients(limit, offset),
        storage.getPatientsCount()
      ]);
      
      const totalPages = Math.ceil(totalCount / limit);
      
      await auditService.log(req.user!.id, 'PATIENT_LIST_VIEW', 'patient', null, {
        page,
        limit,
        totalCount,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json({ 
        patients, 
        totalCount, 
        totalPages, 
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patients/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const patient = await storage.getPatient(parseInt(req.params.id));
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      await auditService.logPatientAccess(req.user!.id, patient.id, 'PATIENT_VIEW', null, null, req.ip || '', req.get("User-Agent") || '');
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/patients", authenticate, authorize(["admin", "doctor", "staff"]), async (req: AuthenticatedRequest, res) => {
    try {
      // Prepare patient data with proper date parsing and defaults
      const requestData = {
        ...req.body,
        dateOfBirth: new Date(req.body.dateOfBirth),
        patientId: req.body.patientId || `PAT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        gender: req.body.gender || 'other',
        phone: req.body.phone || '',
        email: req.body.email || '',
        address: req.body.address || '',
        emergencyContact: req.body.emergencyContact || ''
      };
      
      const patientData = insertPatientSchema.parse(requestData);
      const patient = await storage.createPatient(patientData);
      
      await auditService.log(req.user!.id, 'PATIENT_CREATE', 'patient', patient.id, {
        patientId: patient.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`
      }, req.ip || '', req.get("User-Agent") || '');
      
      appLogger.info("New patient created", { 
        userId: req.user?.id, 
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`
      });
      
      res.status(201).json(patient);
    } catch (error) {
      appLogger.error("Failed to create patient", { userId: req.user?.id }, error as Error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/patients/:id", authenticate, authorize(["admin", "doctor", "staff"]), async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ message: "Invalid patient ID" });
      }

      // Get existing patient for audit trail
      const existingPatient = await storage.getPatient(patientId);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Create a simple validation schema for patient updates
      const updatePatientSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        gender: z.string().optional(),
        race: z.string().optional(),
        ethnicity: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
      });

      const validatedData = updatePatientSchema.parse(req.body);
      
      // Convert dateOfBirth string to Date if provided
      const updates: any = { ...validatedData };
      if (updates.dateOfBirth) {
        updates.dateOfBirth = new Date(updates.dateOfBirth);
      }

      const updatedPatient = await storage.updatePatient(patientId, updates);
      
      if (!updatedPatient) {
        return res.status(404).json({ message: "Failed to update patient" });
      }
      
      await auditService.log(req.user!.id, 'PATIENT_UPDATE', 'patient', updatedPatient.id, {
        before: existingPatient,
        after: updatedPatient,
        updates: validatedData,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single patient
  app.get("/api/patients/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      await auditService.log(req.user!.id, 'PATIENT_VIEW', 'patient', patient.id, {
        patientId: patient.patientId,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete patient
  app.delete("/api/patients/:id", authenticate, authorize(["admin", "doctor"]), async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      
      // Check if patient exists first
      const existingPatient = await storage.getPatient(patientId);
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const deleted = await storage.deletePatient(patientId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete patient" });
      }
      
      await auditService.log(req.user!.id, 'PATIENT_DELETE', 'patient', patientId, {
        patientId: existingPatient.patientId,
        patientName: `${existingPatient.firstName} ${existingPatient.lastName}`,
      }, req.ip || '', req.get("User-Agent") || '', existingPatient, null);
      
      appLogger.info("Patient deleted", { 
        userId: req.user?.id, 
        patientId,
        patientName: `${existingPatient.firstName} ${existingPatient.lastName}`
      });
      
      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      appLogger.error("Failed to delete patient", { userId: req.user?.id, error: (error as Error).message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test route without authentication
  app.get("/api/test-simple", async (req, res) => {
    console.log("Simple test route reached successfully");
    res.json({ message: "Simple test route working" });
  });

  // Test route to verify auth works
  app.get("/api/patients/delete-all-test", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    console.log("Auth test route reached successfully");
    res.json({ message: "Auth test route working", user: req.user?.username });
  });

  // Delete all patients route with a different path to avoid conflicts
  app.delete("/api/patients-deleteall", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      // Manual role check
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("DELETEALL: Starting delete operation...");
      
      // Use direct SQL to delete all patients
      const result = await db.execute(sql`DELETE FROM patients`);
      const deletedCount = result.rowCount || 0;
      
      console.log(`DELETEALL: Successfully deleted ${deletedCount} patients`);
      
      res.json({ 
        message: "All patients deleted successfully", 
        deletedCount 
      });
    } catch (error) {
      console.error("DELETEALL: Error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/patients/search", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const patients = await storage.searchPatients(query);
      
      await auditService.log(req.user!.id, 'PATIENT_SEARCH', 'patient', null, {
        query,
        resultCount: patients.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Insurance routes
  app.get("/api/insurance/providers", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const providers = await storage.getInsuranceProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/insurance/verify", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, insuranceId } = req.body;
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      const insurance = await storage.getPatientInsurance(patientId);
      const targetInsurance = insurance.find(ins => ins.id === insuranceId);
      
      if (!targetInsurance) {
        return res.status(404).json({ message: "Insurance not found" });
      }

      const provider = await storage.getInsuranceProvider(targetInsurance.insuranceProviderId);
      if (!provider) {
        return res.status(404).json({ message: "Insurance provider not found" });
      }

      const result = await insuranceService.verifyInsurance(targetInsurance, provider);
      
      await auditService.log(req.user!.id, 'INSURANCE_VERIFICATION', 'insurance', insuranceId, {
        patientId,
        providerId: provider.id,
        result: result.isValid,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patient insurance information
  app.get("/api/patients/:id/insurance", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      const insuranceRecords = await storage.getPatientInsurance(patientId);
      
      // Join with insurance provider information
      const insuranceWithProviders = await Promise.all(
        insuranceRecords.map(async (insurance) => {
          const provider = await storage.getInsuranceProvider(insurance.insuranceProviderId);
          return {
            ...insurance,
            provider: provider
          };
        })
      );

      await auditService.log(req.user!.id, 'PATIENT_INSURANCE_VIEW', 'patient_insurance', patientId, {
        patientId,
        insuranceRecordsCount: insuranceRecords.length,
      }, req.ip || '', req.get("User-Agent") || '');

      res.json(insuranceWithProviders);
    } catch (error) {
      console.error("Error fetching patient insurance:", error);
      res.status(500).json({ error: "Failed to fetch patient insurance" });
    }
  });

  app.post("/api/patients/:id/insurance", authenticate, authorize(["admin", "doctor", "staff"]), async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const insuranceData = insertPatientInsuranceSchema.parse(req.body);
      insuranceData.patientId = patientId;
      
      const insurance = await storage.createPatientInsurance(insuranceData);
      
      await auditService.log(req.user!.id, 'PATIENT_INSURANCE_CREATE', 'patient_insurance', insurance.id, {
        patientId,
        insuranceProviderId: insurance.insuranceProviderId,
        memberId: insurance.memberId,
        isPrimary: insurance.isPrimary,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.status(201).json(insurance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid insurance data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Prior Authorization routes
  app.get("/api/authorizations", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      const authorizations = await storage.getPriorAuthorizations(limit, offset);
      
      await auditService.log(req.user!.id, 'AUTHORIZATION_LIST_VIEW', 'authorization', null, {
        page,
        limit,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(authorizations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update authorization status endpoint
  app.patch("/api/authorizations/:id/status", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const authorizationId = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const validStatuses = ["pending", "approved", "denied", "in_review", "appealed", "expired"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const updated = await storage.updatePriorAuthorizationStatus(authorizationId, status);
      
      if (!updated) {
        return res.status(404).json({ error: "Authorization not found" });
      }

      appLogger.info("Authorization status updated", {
        userId: req.user?.id,
        authorizationId,
        newStatus: status
      });

      res.json({ success: true, status });
    } catch (error) {
      appLogger.error("Failed to update authorization status", { 
        userId: req.user?.id 
      }, error as Error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.get("/api/authorizations/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const authorization = await storage.getPriorAuthorization(parseInt(req.params.id));
      
      if (!authorization) {
        return res.status(404).json({ message: "Authorization not found" });
      }
      
      await auditService.logAuthorizationAccess(req.user!.id, authorization.id, 'AUTHORIZATION_VIEW', req.ip || '', req.get("User-Agent") || '');
      
      res.json(authorization);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/authorizations", authenticate, authorize(["admin", "doctor", "staff"]), async (req: AuthenticatedRequest, res) => {
    try {
      // Create minimal schema for API request
      const createAuthSchema = z.object({
        patientId: z.number(),
        insuranceId: z.number(),
        treatmentType: z.string(),
        cptCode: z.string(),
        icd10Code: z.string(),
        clinicalJustification: z.string(),
        urgentRequest: z.boolean().optional(),
      });
      
      // Validate only required input fields
      const validatedInput = createAuthSchema.parse(req.body);
      
      // Generate authorization ID and set all required defaults
      const authorizationId = `AUTH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const authData = {
        ...validatedInput,
        authorizationId,
        submittedBy: req.user!.id,
        requestedDate: new Date(),
        urgentRequest: validatedInput.urgentRequest || false,
      };
      
      const authorization = await storage.createPriorAuthorization(authData);
      
      // Submit to insurance service
      try {
        const submission = {
          patientId: authorization.patientId,
          insuranceId: authorization.insuranceId,
          treatmentType: authorization.treatmentType,
          cptCode: authorization.cptCode,
          icd10Code: authorization.icd10Code,
          clinicalJustification: authorization.clinicalJustification,
          requestedDate: authorization.requestedDate.toISOString(),
          documents: [], // TODO: Add document references
        };
        
        const response = await insuranceService.submitPriorAuthorization(submission);
        
        // Update authorization with response
        await storage.updatePriorAuthorization(authorization.id, {
          status: response.status,
          submittedDate: new Date(),
          ...(response.status === 'approved' && response.expirationDate && {
            approvalDate: new Date(),
            expirationDate: new Date(response.expirationDate),
          }),
          ...(response.status === 'denied' && {
            denialReason: response.denialReason,
          }),
        });
      } catch (error) {
        console.error('Failed to submit to insurance service:', error);
      }
      
      await auditService.log(req.user!.id, 'AUTHORIZATION_CREATE', 'authorization', authorization.id, {
        authorizationId: authorization.authorizationId,
        patientId: authorization.patientId,
        treatmentType: authorization.treatmentType,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.status(201).json(authorization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid authorization data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/authorizations/:id", authenticate, authorize(["admin", "doctor", "staff"]), async (req: AuthenticatedRequest, res) => {
    try {
      const authId = parseInt(req.params.id);
      
      // Get existing authorization for audit trail
      const existingAuth = await storage.getPriorAuthorization(authId);
      if (!existingAuth) {
        return res.status(404).json({ message: "Authorization not found" });
      }
      
      const updates = insertPriorAuthorizationSchema.partial().parse(req.body);
      const authorization = await storage.updatePriorAuthorization(authId, updates);
      
      if (!authorization) {
        return res.status(404).json({ message: "Authorization not found" });
      }
      
      await auditService.log(req.user!.id, 'AUTHORIZATION_UPDATE', 'authorization', authorization.id, {
        authorizationId: authorization.authorizationId,
        changes: updates,
        previousData: {
          treatmentType: existingAuth.treatmentType,
          cptCodes: existingAuth.cptCodes,
          icd10Codes: existingAuth.icd10Codes,
          clinicalJustification: existingAuth.clinicalJustification,
          status: existingAuth.status,
        },
        newData: {
          treatmentType: authorization.treatmentType,
          cptCodes: authorization.cptCodes,
          icd10Codes: authorization.icd10Codes,
          clinicalJustification: authorization.clinicalJustification,
          status: authorization.status,
        },
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(authorization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid authorization data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/authorizations/patient/:patientId", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const authorizations = await storage.getPriorAuthorizationsByPatient(patientId);
      
      await auditService.log(req.user!.id, 'AUTHORIZATION_PATIENT_VIEW', 'authorization', null, {
        patientId,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(authorizations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/authorizations/status/:status", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const status = req.params.status;
      const authorizations = await storage.getPriorAuthorizationsByStatus(status);
      
      await auditService.log(req.user!.id, 'AUTHORIZATION_STATUS_VIEW', 'authorization', null, {
        status,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(authorizations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete authorization
  app.delete("/api/authorizations/:id", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const authId = parseInt(req.params.id);
      
      // Get existing authorization for audit trail
      const existingAuth = await storage.getPriorAuthorization(authId);
      if (!existingAuth) {
        return res.status(404).json({ message: "Authorization not found" });
      }
      
      const deleted = await storage.deletePriorAuthorization(authId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete authorization" });
      }
      
      await auditService.log(req.user!.id, 'AUTHORIZATION_DELETE', 'authorization', authId, {
        deletedAuthorization: {
          authorizationId: existingAuth.authorizationId,
          patientId: existingAuth.patientId,
          treatmentType: existingAuth.treatmentType,
          cptCodes: existingAuth.cptCodes,
          icd10Codes: existingAuth.icd10Codes,
          status: existingAuth.status,
          clinicalJustification: existingAuth.clinicalJustification,
        },
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json({ message: "Authorization deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete authorization" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getAuthorizationStats();
      
      await auditService.log(req.user!.id, 'DASHBOARD_VIEW', 'dashboard', null, {}, req.ip || '', req.get("User-Agent") || '');
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // External connections audit route
  app.post("/api/audit/external-connection", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { action, connectionId, changes } = req.body;
      
      await auditService.log(req.user!.id, action, 'external_connection', connectionId || null, {
        changes,
        timestamp: new Date().toISOString(),
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Audit routes
  app.get("/api/audit/logs", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = (page - 1) * limit;
      
      const logs = await storage.getAuditLogs(limit, offset);
      
      // Log the audit view access
      await auditService.log(req.user!.id, 'AUDIT_LOGS_VIEW', 'audit', null, {
        page,
        limit,
        totalLogs: logs.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/audit/report", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const resourceType = req.query.resourceType as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      const report = await auditService.getAuditReport(startDate, endDate, resourceType, userId);
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // App Event Logs API
  app.get("/api/app-logs", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { limit = 100, offset = 0, level, component } = req.query;
      
      // Disable caching for app logs to always show fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const logs = await appLogger.getLogs(
        parseInt(limit as string),
        parseInt(offset as string),
        level as string,
        component as string
      );
      
      res.json(logs);
    } catch (error) {
      appLogger.error("Failed to fetch app logs", { userId: req.user?.id }, error as Error);
      res.status(500).json({ message: "Failed to fetch app logs", error: (error as Error).message });
    }
  });

  // Create multer instance outside the route
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // Import API
  app.post("/api/import/process", 
    authenticate, 
    authorize(["admin", "doctor", "staff"]),
    upload.single('file'),
    async (req: AuthenticatedRequest, res) => {
      const startTime = Date.now();
      
      try {
        console.log('Import request received', { 
          user: req.user?.id, 
          hasFile: !!req.file,
          type: req.body.type,
          filename: req.file?.originalname
        });

        // Log import attempt
        await appLogger.info(`Data import started`, {
          userId: req.user?.id,
          type: req.body.type,
          filename: req.file?.originalname,
          fileSize: req.file?.size,
          updateExisting: req.body.updateExisting === 'true'
        });

        const file = req.file;
        const type = req.body.type;

        if (!file) {
          await appLogger.error(`Import failed - no file uploaded`, {
            userId: req.user?.id,
            type: req.body.type
          });
          return res.status(400).json({ message: "No file uploaded" });
        }

        let result;
        if (type === 'patients' && file.originalname.endsWith('.csv')) {
          console.log('Processing patient CSV...');
          const updateExisting = req.body.updateExisting === 'true';
          result = await processPatientCSV(file.buffer.toString('utf-8'), req.user!.id, { updateExisting });
        } else if (type === 'authorizations' && file.originalname.endsWith('.csv')) {
          console.log('Processing authorization CSV...');
          result = await processAuthorizationCSV(file.buffer.toString('utf-8'), req.user!.id);
        } else {
          await appLogger.error(`Import failed - unsupported file type`, {
            userId: req.user?.id,
            type: req.body.type,
            filename: file.originalname,
            supportedTypes: ['patients.csv', 'authorizations.csv']
          });
          return res.status(400).json({ message: `Unsupported file format or type. Got type: ${type}, filename: ${file.originalname}` });
        }

        console.log('Import result:', result);
        const duration = Date.now() - startTime;

        // Log successful import
        await appLogger.info(`Data import completed successfully`, {
          userId: req.user?.id,
          type,
          filename: file.originalname,
          duration: `${duration}ms`,
          recordsProcessed: result.recordsProcessed,
          recordsImported: result.recordsImported,
          recordsUpdated: (result as any).recordsUpdated || 0,
          duplicatesSkipped: (result as any).duplicatesSkipped || 0,
          errorCount: result.errors || 0
        });

        await auditService.log(req.user!.id, 'DATA_IMPORT', 'import', null, {
          type,
          fileName: file.originalname,
          result,
          duration: `${duration}ms`
        }, req.ip || '', req.get("User-Agent") || '');

        res.json(result);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error('Import processing error:', error);
        console.error('Error stack:', error.stack);
        
        // Log import failure
        await appLogger.error(`Data import failed`, {
          userId: req.user?.id,
          type: req.body.type,
          filename: req.file?.originalname,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack
        });
        
        res.status(500).json({ message: "Import processing failed", error: error.message, details: error.stack });
      }
    }
  );

  // CSV processing functions
  async function processPatientCSV(csvContent: string, userId: number, options: { updateExisting?: boolean } = {}) {
    try {
      console.log('Starting CSV processing...');
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      console.log(`Processing ${lines.length - 1} records with headers:`, headers);
      
      let recordsProcessed = 0;
      let recordsImported = 0;
      let recordsUpdated = 0;
      let duplicatesSkipped = 0;
      const errors: string[] = [];
      const duplicates: any[] = [];
      const updates: any[] = [];
      
      // Process in optimized batches for production volumes
      const batchSize = 20; // Optimal batch size for 1000+ records
      const totalRows = lines.length - 1;
      const maxRecords = totalRows; // Process all records
      const recordsToProcess = Math.min(totalRows, maxRecords);
      
      console.log(`Processing ${recordsToProcess} records from CSV file with optimized batching`);
      
      for (let batchStart = 1; batchStart <= recordsToProcess; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, recordsToProcess + 1);
        console.log(`Processing batch ${Math.ceil(batchStart / batchSize)} of ${Math.ceil(recordsToProcess / batchSize)} (rows ${batchStart}-${batchEnd - 1})`);
        
        for (let i = batchStart; i < batchEnd && i <= recordsToProcess; i++) {
          recordsProcessed++;
          
          try {
            // Skip empty lines
            if (!lines[i] || lines[i].trim() === '') {
              console.log(`Skipping empty line ${i + 1}`);
              continue;
            }
            
            // Better CSV parsing to handle commas in quoted fields
            const csvLine = lines[i];
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < csvLine.length; j++) {
              const char = csvLine[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim()); // Push the last value
            
            const record: any = {};
            headers.forEach((header, index) => {
              record[header] = values[index] || '';
            });

            // Map CSV fields to our patient schema
            const patientData = {
              patientId: record.Id ? record.Id.substring(0, 50) : `PAT-${new Date().getFullYear()}-${String(Date.now() + i).slice(-6)}`,
              firstName: (record.FIRST || record.firstName || '').substring(0, 100),
              lastName: (record.LAST || record.lastName || '').substring(0, 100),
              dateOfBirth: record.BIRTHDATE ? new Date(record.BIRTHDATE) : new Date('1990-01-01'),
              gender: ((record.GENDER || 'unknown').toLowerCase() === 'f' ? 'female' : 
                       (record.GENDER || 'unknown').toLowerCase() === 'm' ? 'male' : 'other'),
              phone: (record.phone || '555-000-0000').substring(0, 20),
              email: (record.email || `${(record.FIRST || 'patient').toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`).substring(0, 255),
              address: ([record.ADDRESS, record.CITY, record.STATE].filter(Boolean).join(', ') || 'No address provided').substring(0, 500),
              emergencyContact: (record.emergencyContact || 'Emergency contact not provided').substring(0, 255),
            };

            // Validate required fields
            if (!patientData.firstName || !patientData.lastName) {
              errors.push(`Row ${i + 1}: Missing required name fields (First: "${record.FIRST}", Last: "${record.LAST}")`);
              continue;
            }

            console.log(`Processing row ${i + 1}: ${patientData.firstName} ${patientData.lastName}`);

            // Check for duplicates by patient ID and name combination with timeout
            let existingByPatientId = null;
            let existingByName = null;
            
            try {
              existingByPatientId = await Promise.race([
                storage.getPatientByPatientId(patientData.patientId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000)) // Reasonable timeout
              ]) as any;
            } catch (error: any) {
              console.log(`Patient ID lookup timeout/error for ${patientData.patientId}:`, error.message);
              // Skip duplicate check on timeout to prevent hanging
              existingByPatientId = null;
            }
            
            try {
              existingByName = await Promise.race([
                storage.getPatientByName(patientData.firstName, patientData.lastName, patientData.dateOfBirth),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 2000)) // Reasonable timeout
              ]) as any;
            } catch (error: any) {
              console.log(`Patient name lookup timeout/error for ${patientData.firstName} ${patientData.lastName}:`, error.message);
              // Skip duplicate check on timeout to prevent hanging
              existingByName = null;
            }
            
            let existingPatient = existingByPatientId || existingByName;
            
            if (existingPatient) {
              // Check if data has changed
              const hasChanges = (
                existingPatient.firstName !== patientData.firstName ||
                existingPatient.lastName !== patientData.lastName ||
                existingPatient.phone !== patientData.phone ||
                existingPatient.email !== patientData.email ||
                existingPatient.address !== patientData.address ||
                existingPatient.emergencyContact !== patientData.emergencyContact ||
                existingPatient.gender !== patientData.gender ||
                new Date(existingPatient.dateOfBirth).getTime() !== patientData.dateOfBirth.getTime()
              );

              if (hasChanges) {
                const duplicateInfo = {
                  rowNumber: i + 1,
                  patientId: patientData.patientId,
                  existing: {
                    id: existingPatient.id,
                    patientId: existingPatient.patientId,
                    name: `${existingPatient.firstName} ${existingPatient.lastName}`,
                    dateOfBirth: existingPatient.dateOfBirth,
                    phone: existingPatient.phone,
                    email: existingPatient.email,
                    address: existingPatient.address
                  },
                  incoming: {
                    name: `${patientData.firstName} ${patientData.lastName}`,
                    dateOfBirth: patientData.dateOfBirth,
                    phone: patientData.phone,
                    email: patientData.email,
                    address: patientData.address
                  },
                  changes: {
                    firstName: existingPatient.firstName !== patientData.firstName,
                    lastName: existingPatient.lastName !== patientData.lastName,
                    phone: existingPatient.phone !== patientData.phone,
                    email: existingPatient.email !== patientData.email,
                    address: existingPatient.address !== patientData.address,
                    dateOfBirth: new Date(existingPatient.dateOfBirth).getTime() !== patientData.dateOfBirth.getTime(),
                    gender: existingPatient.gender !== patientData.gender,
                    emergencyContact: existingPatient.emergencyContact !== patientData.emergencyContact
                  }
                };

                if (options.updateExisting) {
                  try {
                    await Promise.race([
                      storage.updatePatient(existingPatient.id, patientData),
                      new Promise((_, reject) => setTimeout(() => reject(new Error('Update timeout')), 5000)) // Standard timeout
                    ]);
                    recordsUpdated++;
                    updates.push(duplicateInfo);
                    console.log(`Updated patient: ${patientData.firstName} ${patientData.lastName}`);
                  } catch (error: any) {
                    console.error(`Failed to update patient ${patientData.firstName} ${patientData.lastName}:`, error.message);
                    errors.push(`Row ${i + 1}: Update failed - ${error.message}`);
                  }
                } else {
                  duplicates.push(duplicateInfo);
                  duplicatesSkipped++;
                  console.log(`Duplicate found: ${patientData.firstName} ${patientData.lastName}`);
                }
              } else {
                // Exact duplicate - skip
                duplicatesSkipped++;
                console.log(`Exact duplicate skipped: ${patientData.firstName} ${patientData.lastName}`);
              }
            } else {
              // New patient - create it
              try {
                await Promise.race([
                  storage.createPatient(patientData),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Create timeout')), 5000)) // Standard timeout
                ]);
                recordsImported++;
                console.log(`Created new patient: ${patientData.firstName} ${patientData.lastName}`);
              } catch (error: any) {
                console.error(`Failed to create patient ${patientData.firstName} ${patientData.lastName}:`, error.message);
                errors.push(`Row ${i + 1}: Create failed - ${error.message}`);
              }
            }
          } catch (error: any) {
            const errorMsg = `Row ${i + 1}: ${error.message}`;
            errors.push(errorMsg);
            console.error(`CSV processing error on row ${i + 1}:`, error);
            console.error('Failed row data:', csvRecords[i]);
          }
        }
        
        // Small delay between batches to prevent overwhelming the database
        if (batchEnd <= recordsToProcess) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Efficient delay for production
        }
      }

      return {
        recordsProcessed,
        recordsImported,
        recordsUpdated,
        duplicatesSkipped,
        errors: errors.length,
        errorDetails: errors.slice(0, 10),
        duplicates: duplicates.slice(0, 20), // Limit duplicates shown
        updates: updates.slice(0, 20) // Show what was updated if updateExisting was true
      };
    } catch (error: any) {
      console.error('CSV processing failed:', error);
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }

  async function processAuthorizationCSV(csvContent: string, userId: number) {
    // Similar implementation for authorization CSV processing
    return {
      recordsProcessed: 0,
      recordsImported: 0,
      errors: 0,
      errorDetails: [],
    };
  }

  // System Configuration API
  app.get("/api/system-config", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const configs = await storage.getAllSystemConfig();
      
      await auditService.log(req.user!.id, 'SYSTEM_CONFIG_LIST_VIEW', 'system_config', null, {
        configCount: configs.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(configs);
    } catch (error) {
      appLogger.error("Failed to fetch system configuration", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to fetch system configuration" });
    }
  });

  app.get("/api/system-config/:key", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { key } = req.params;
      const config = await storage.getSystemConfig(key);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      await auditService.log(req.user!.id, 'SYSTEM_CONFIG_VIEW', 'system_config', config.id, {
        key,
        value: config.value,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(config);
    } catch (error) {
      appLogger.error("Failed to fetch system configuration", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to fetch system configuration" });
    }
  });

  app.put("/api/system-config/:key", authenticate, authorize(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: "Value is required" });
      }

      const existingConfig = await storage.getSystemConfig(key);
      const config = await storage.setSystemConfig(key, value, description);
      
      await auditService.log(req.user!.id, 'SYSTEM_CONFIG_UPDATE', 'system_config', config.id, {
        key,
        previousValue: existingConfig?.value,
        newValue: value,
        description,
      }, req.ip || '', req.get("User-Agent") || '');
      
      appLogger.info(`System configuration updated: ${key}`, { userId: req.user?.id, key, value });
      res.json(config);
    } catch (error) {
      appLogger.error("Failed to update system configuration", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to update system configuration" });
    }
  });

  // Document Routes
  app.get("/api/documents", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, authorizationId } = req.query;
      let documents;
      
      if (patientId) {
        documents = await storage.getDocumentsByPatient(parseInt(patientId as string));
      } else if (authorizationId) {
        documents = await storage.getDocumentsByAuthorization(parseInt(authorizationId as string));
      } else {
        // Get all documents - implement this method in storage
        documents = await storage.getAllDocuments();
      }
      
      await auditService.log(req.user!.id, 'DOCUMENT_LIST_VIEW', 'document', null, {
        patientId: patientId as string,
        authorizationId: authorizationId as string,
        documentCount: documents.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(documents);
    } catch (error) {
      appLogger.error("Failed to fetch documents", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents/upload", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { fileName, fileType, fileSize, patientId, authorizationId, fileContent } = req.body;
      
      if (!fileName || !fileType || !fileSize || !fileContent) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // In a real implementation, you would save the file to a secure storage location
      // For now, we'll create a simulated encrypted path
      const encryptedPath = `/secure/documents/${Date.now()}_${fileName}`;
      
      const documentData = {
        fileName,
        fileType,
        fileSize,
        encryptedPath,
        uploadedBy: req.user!.id,
        patientId: patientId ? parseInt(patientId) : null,
        authorizationId: authorizationId ? parseInt(authorizationId) : null,
      };

      const document = await storage.createDocument(documentData);
      
      await auditService.log(req.user!.id, 'DOCUMENT_UPLOAD', 'document', document.id, {
        fileName,
        fileType,
        fileSize,
        patientId: documentData.patientId,
        authorizationId: documentData.authorizationId,
      }, req.ip || '', req.get("User-Agent") || '');
      
      appLogger.info("Document uploaded", { 
        userId: req.user?.id, 
        documentId: document.id, 
        fileName 
      });
      
      res.status(201).json(document);
    } catch (error) {
      appLogger.error("Failed to upload document", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/documents/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const document = await storage.getDocument(parseInt(req.params.id));
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // For viewing, serve the file content with proper content type
      // In a real implementation, you would read from the encrypted storage
      // For now, create sample content based on file type
      let content: string;
      let contentType: string;
      
      if (document.fileType.includes('text') || document.fileType.includes('txt')) {
        content = `Sample text document: ${document.fileName}\n\nThis is a demonstration of the ${document.fileName} file.\nDocument ID: ${document.id}\nUploaded by User ID: ${document.uploadedBy}\nUpload Date: ${document.createdAt}`;
        contentType = 'text/plain';
      } else if (document.fileType.includes('pdf')) {
        content = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n\nSample PDF content for ${document.fileName}`;
        contentType = 'application/pdf';
      } else {
        content = `Sample content for ${document.fileName}\nDocument Type: ${document.fileType}\nDocument ID: ${document.id}`;
        contentType = document.fileType || 'application/octet-stream';
      }
      
      await auditService.log(req.user!.id, 'DOCUMENT_VIEW', 'document', document.id, {
        fileName: document.fileName,
        fileType: document.fileType,
        patientId: document.patientId,
        authorizationId: document.authorizationId,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
      res.send(content);
      
      appLogger.info("Document viewed", { 
        userId: req.user?.id, 
        documentId: document.id, 
        fileName: document.fileName 
      });
    } catch (error) {
      appLogger.error("Failed to fetch document", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.get("/api/documents/:id/download", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const document = await storage.getDocument(parseInt(req.params.id));
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // In a real implementation, you would read from the encrypted storage
      // For now, create more realistic sample content based on file type
      let content: string;
      let contentType: string;
      
      if (document.fileType.includes('text') || document.fileType.includes('txt')) {
        content = `Sample Medical Document: ${document.fileName}\n\nPatient Information and Authorization Details\n\nThis is a demonstration of the ${document.fileName} file.\n\nDocument Details:\n- Document ID: ${document.id}\n- File Type: ${document.fileType}\n- File Size: ${document.fileSize} bytes\n- Uploaded by User ID: ${document.uploadedBy}\n- Upload Date: ${document.createdAt}\n\nThis document contains sample medical information for demonstration purposes.`;
        contentType = 'text/plain';
      } else if (document.fileType.includes('pdf')) {
        content = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Contents 4 0 R\n>>\nendobj\n\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Sample PDF: ${document.fileName}) Tj\nET\nendstream\nendobj\n\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000079 00000 n\n0000000173 00000 n\n0000000301 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n380\n%%EOF`;
        contentType = 'application/pdf';
      } else if (document.fileType.includes('word') || document.fileType.includes('doc')) {
        content = `Sample Microsoft Word Document: ${document.fileName}\n\nMedical Authorization Document\n\nThis is a demonstration Word document for ${document.fileName}.\n\nDocument Information:\n- ID: ${document.id}\n- Type: ${document.fileType}\n- Size: ${document.fileSize} bytes\n- Created: ${document.createdAt}`;
        contentType = document.fileType;
      } else {
        content = `Sample Medical Document: ${document.fileName}\n\nDocument Type: ${document.fileType}\nDocument ID: ${document.id}\nFile Size: ${document.fileSize} bytes\nUpload Date: ${document.createdAt}\n\nThis is a sample document for demonstration purposes.`;
        contentType = document.fileType || 'application/octet-stream';
      }
      
      await auditService.log(req.user!.id, 'DOCUMENT_DOWNLOAD', 'document', document.id, {
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        patientId: document.patientId,
        authorizationId: document.authorizationId,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', Buffer.byteLength(content).toString());
      res.send(content);
      
      appLogger.info("Document downloaded", { 
        userId: req.user?.id, 
        documentId: document.id, 
        fileName: document.fileName 
      });
    } catch (error) {
      appLogger.error("Failed to download document", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  app.delete("/api/documents/:id", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const deleted = await storage.deleteDocument(documentId);
      
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete document" });
      }
      
      await auditService.log(req.user!.id, 'DOCUMENT_DELETE', 'document', documentId, {
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        patientId: document.patientId,
        authorizationId: document.authorizationId,
      }, req.ip || '', req.get("User-Agent") || '');
      
      appLogger.info("Document deleted", { 
        userId: req.user?.id, 
        documentId, 
        fileName: document.fileName 
      });
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      appLogger.error("Failed to delete document", { userId: req.user?.id }, error as Error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Register prior authorization workflow routes
  registerPriorAuthWorkflowRoutes(app);

  // Register prior authorization generator routes  
  app.use("/api/prior-auth", priorAuthGeneratorRoutes);
  
  // Initialize ICD-10 codes and add API endpoints
  await storage.seedIcd10Codes();
  
  // Register ICD-10 codes routes
  app.use("/api/icd10-codes", icd10CodesRoutes);
  
  // Register Insurance provider routes
  app.use("/api/insurance", insuranceRoutes);
  
  // Register ModMed EMA integration routes
  app.use("/api/modmed-ema", modmedEmaRoutes);

  const httpServer = createServer(app);
  return httpServer;
}

import { 
  medicalSpecialties, users, patients, insuranceProviders, patientInsurance, 
  priorAuthorizations, documents, auditLogs, systemConfig, procedureCodes,
  priorAuthWorkflowSteps, stateFormTemplates, icd10Codes,
  type MedicalSpecialty, type InsertMedicalSpecialty,
  type User, type InsertUser, type Patient, type InsertPatient,
  type InsuranceProvider, type InsertInsuranceProvider,
  type PatientInsurance, type InsertPatientInsurance,
  type PriorAuthorization, type InsertPriorAuthorization,
  type Document, type InsertDocument,
  type AuditLog, type InsertAuditLog,
  type SystemConfig, type InsertSystemConfig,
  type ProcedureCode, type InsertProcedureCode,
  type Icd10Code, type InsertIcd10Code,
  type PriorAuthWorkflowStep, type InsertPriorAuthWorkflowStep,
  type StateFormTemplate, type InsertStateFormTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // Medical Specialties
  getMedicalSpecialties(): Promise<MedicalSpecialty[]>;
  getMedicalSpecialty(id: number): Promise<MedicalSpecialty | undefined>;
  createMedicalSpecialty(specialty: InsertMedicalSpecialty): Promise<MedicalSpecialty>;
  seedMedicalSpecialties(): Promise<void>;
  seedDefaultUsers(): Promise<void>;
  seedInsuranceProviders(): Promise<void>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Patients
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByPatientId(patientId: string): Promise<Patient | undefined>;
  getPatients(limit?: number, offset?: number): Promise<Patient[]>;
  getPatientsCount(): Promise<number>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<boolean>;
  deleteAllPatients(): Promise<number>;
  searchPatients(query: string): Promise<Patient[]>;
  
  // Insurance Providers
  getInsuranceProviders(): Promise<InsuranceProvider[]>;
  getInsuranceProvider(id: number): Promise<InsuranceProvider | undefined>;
  createInsuranceProvider(provider: InsertInsuranceProvider): Promise<InsuranceProvider>;
  updateInsuranceProvider(id: number, updates: Partial<InsertInsuranceProvider>): Promise<InsuranceProvider | undefined>;
  deleteInsuranceProvider(id: number): Promise<boolean>;
  
  // Patient Insurance
  getPatientInsurance(patientId: number): Promise<PatientInsurance[]>;
  createPatientInsurance(insurance: InsertPatientInsurance): Promise<PatientInsurance>;
  updatePatientInsurance(id: number, updates: Partial<InsertPatientInsurance>): Promise<PatientInsurance | undefined>;
  
  // Prior Authorizations
  getPriorAuthorization(id: number): Promise<PriorAuthorization | undefined>;
  getPriorAuthorizationByAuthId(authId: string): Promise<PriorAuthorization | undefined>;
  getPriorAuthorizations(limit?: number, offset?: number): Promise<PriorAuthorization[]>;
  getPriorAuthorizationsByPatient(patientId: number): Promise<PriorAuthorization[]>;
  getPriorAuthorizationsByStatus(status: string): Promise<PriorAuthorization[]>;
  createPriorAuthorization(authorization: InsertPriorAuthorization): Promise<PriorAuthorization>;
  updatePriorAuthorization(id: number, updates: Partial<InsertPriorAuthorization>): Promise<PriorAuthorization | undefined>;
  updatePriorAuthorizationStatus(id: number, status: string): Promise<boolean>;
  getAuthorizationStats(): Promise<{
    pending: number;
    approved: number;
    denied: number;
    total: number;
  }>;
  
  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByAuthorization(authId: number): Promise<Document[]>;
  getDocumentsByPatient(patientId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: number): Promise<AuditLog[]>;
  getAuditLogsByResource(resourceType: string, resourceId: number): Promise<AuditLog[]>;
  
  // System Configuration
  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  setSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig>;
  getAllSystemConfig(): Promise<SystemConfig[]>;
  seedSystemConfig(): Promise<void>;

  // Procedure Codes
  getProcedureCode(id: number): Promise<ProcedureCode | undefined>;
  getProcedureCodeByCPT(cptCode: string): Promise<ProcedureCode | undefined>;
  getAllProcedureCodes(): Promise<ProcedureCode[]>;
  getProcedureCodes(limit?: number, offset?: number): Promise<ProcedureCode[]>;
  searchProcedureCodes(query: string, category?: string): Promise<ProcedureCode[]>;
  getProceduresByCategory(category: string): Promise<ProcedureCode[]>;
  getProcedureCategories(): Promise<string[]>;
  createProcedureCode(procedure: InsertProcedureCode): Promise<ProcedureCode>;
  updateProcedureCode(id: number, updates: Partial<InsertProcedureCode>): Promise<ProcedureCode | undefined>;

  // Prior Auth Workflow Steps
  getPriorAuthWorkflowStep(authorizationId: number, stepNumber: number): Promise<PriorAuthWorkflowStep | undefined>;
  getPriorAuthWorkflowSteps(authorizationId: number): Promise<PriorAuthWorkflowStep[]>;
  createPriorAuthWorkflowStep(step: InsertPriorAuthWorkflowStep): Promise<PriorAuthWorkflowStep>;
  updatePriorAuthWorkflowStep(id: number, updates: Partial<InsertPriorAuthWorkflowStep>): Promise<PriorAuthWorkflowStep | undefined>;

  // State Form Templates
  getStateFormTemplate(state: string, formType: string): Promise<StateFormTemplate | undefined>;
  getStateFormTemplates(): Promise<StateFormTemplate[]>;
  createStateFormTemplate(template: InsertStateFormTemplate): Promise<StateFormTemplate>;
  updateStateFormTemplate(id: number, updates: Partial<InsertStateFormTemplate>): Promise<StateFormTemplate | undefined>;
  
  // ICD-10 Codes
  getIcd10Codes(limit?: number): Promise<Icd10Code[]>;
  getIcd10CodeByCode(code: string): Promise<Icd10Code | undefined>;
  createIcd10Code(code: InsertIcd10Code): Promise<Icd10Code>;
}

export class DatabaseStorage implements IStorage {
  // Medical Specialties
  async getMedicalSpecialties(): Promise<MedicalSpecialty[]> {
    return await db.select().from(medicalSpecialties).where(eq(medicalSpecialties.isActive, true));
  }

  async getMedicalSpecialty(id: number): Promise<MedicalSpecialty | undefined> {
    const [specialty] = await db.select().from(medicalSpecialties).where(eq(medicalSpecialties.id, id));
    return specialty || undefined;
  }

  async createMedicalSpecialty(insertSpecialty: InsertMedicalSpecialty): Promise<MedicalSpecialty> {
    const [specialty] = await db.insert(medicalSpecialties).values(insertSpecialty).returning();
    return specialty;
  }

  async seedMedicalSpecialties(): Promise<void> {
    const specialtiesData = [
      { specialty: "Allergy & Immunology", subspecialty: null },
      { specialty: "Anesthesiology", subspecialty: "Adult Cardiac Anesthesiology" },
      { specialty: "Anesthesiology", subspecialty: "Critical Care Medicine" },
      { specialty: "Anesthesiology", subspecialty: "Health Care Administration, Leadership, and Management" },
      { specialty: "Anesthesiology", subspecialty: "Hospice and Palliative Medicine" },
      { specialty: "Anesthesiology", subspecialty: "Neurocritical Care" },
      { specialty: "Anesthesiology", subspecialty: "Pain Medicine" },
      { specialty: "Anesthesiology", subspecialty: "Pediatric Anesthesiology" },
      { specialty: "Anesthesiology", subspecialty: "Sleep Medicine" },
      { specialty: "Colon & Rectal Surgery", subspecialty: null },
      { specialty: "Dermatology", subspecialty: "Dermatopathology" },
      { specialty: "Dermatology", subspecialty: "Micrographic Dermatologic Surgery" },
      { specialty: "Dermatology", subspecialty: "Pediatric Dermatology" },
      { specialty: "Emergency Medicine", subspecialty: "Anesthesiology Critical Care Medicine" },
      { specialty: "Emergency Medicine", subspecialty: "Emergency Medical Services" },
      { specialty: "Emergency Medicine", subspecialty: "Health Care Administration, Leadership, and Management" },
      { specialty: "Emergency Medicine", subspecialty: "Hospice and Palliative Medicine" },
      { specialty: "Emergency Medicine", subspecialty: "Internal Medicine–Critical Care Medicine" },
      { specialty: "Emergency Medicine", subspecialty: "Medical Toxicology" },
      { specialty: "Emergency Medicine", subspecialty: "Neurocritical Care" },
      { specialty: "Emergency Medicine", subspecialty: "Pain Medicine" },
      { specialty: "Emergency Medicine", subspecialty: "Pediatric Emergency Medicine" },
      { specialty: "Emergency Medicine", subspecialty: "Sports Medicine" },
      { specialty: "Emergency Medicine", subspecialty: "Undersea and Hyperbaric Medicine" },
      { specialty: "Family Medicine", subspecialty: "Adolescent Medicine" },
      { specialty: "Family Medicine", subspecialty: "Geriatric Medicine" },
      { specialty: "Family Medicine", subspecialty: "Health Care Administration, Leadership, and Management" },
      { specialty: "Family Medicine", subspecialty: "Hospice and Palliative Medicine" },
      { specialty: "Family Medicine", subspecialty: "Pain Medicine" },
      { specialty: "Family Medicine", subspecialty: "Sleep Medicine" },
      { specialty: "Family Medicine", subspecialty: "Sports Medicine" },
      { specialty: "Internal Medicine", subspecialty: "Adolescent Medicine" },
      { specialty: "Internal Medicine", subspecialty: "Adult Congenital Heart Disease" },
      { specialty: "Internal Medicine", subspecialty: "Advanced Heart Failure & Transplant Cardiology" },
      { specialty: "Internal Medicine", subspecialty: "Cardiovascular Disease" },
      { specialty: "Internal Medicine", subspecialty: "Clinical Cardiac Electrophysiology" },
      { specialty: "Internal Medicine", subspecialty: "Critical Care Medicine" },
      { specialty: "Internal Medicine", subspecialty: "Endocrinology, Diabetes & Metabolism" },
      { specialty: "Internal Medicine", subspecialty: "Gastroenterology" },
      { specialty: "Internal Medicine", subspecialty: "Geriatric Medicine" },
      { specialty: "Internal Medicine", subspecialty: "Hematology" },
      { specialty: "Internal Medicine", subspecialty: "Hospice & Palliative Medicine" },
      { specialty: "Internal Medicine", subspecialty: "Infectious Disease" },
      { specialty: "Internal Medicine", subspecialty: "Interventional Cardiology" },
      { specialty: "Internal Medicine", subspecialty: "Medical Oncology" },
      { specialty: "Internal Medicine", subspecialty: "Complex General Surgical Oncology" },
      { specialty: "Internal Medicine", subspecialty: "Pediatric Surgery" },
      { specialty: "Internal Medicine", subspecialty: "Surgery of the Hand" },
      { specialty: "Internal Medicine", subspecialty: "Surgical Critical Care" },
      { specialty: "Medical Genetics & Genomics", subspecialty: "Clinical Genetics" },
      { specialty: "Medical Genetics & Genomics", subspecialty: "Laboratory Genetics & Genomics" },
      { specialty: "Neurological Surgery", subspecialty: null },
      { specialty: "Nuclear Medicine", subspecialty: null },
      { specialty: "Obstetrics & Gynecology", subspecialty: "Maternal–Fetal Medicine" },
      { specialty: "Obstetrics & Gynecology", subspecialty: "Reproductive Endocrinology & Infertility" },
      { specialty: "Obstetrics & Gynecology", subspecialty: "Gynecologic Oncology" },
      { specialty: "Obstetrics & Gynecology", subspecialty: "Urogynecology & Reconstructive Pelvic Surgery" },
      { specialty: "Obstetrics & Gynecology", subspecialty: "Complex Family Planning" },
      { specialty: "Obstetrics & Gynecology", subspecialty: "Critical Care Medicine" },
      { specialty: "Ophthalmology", subspecialty: "Retina" },
      { specialty: "Ophthalmology", subspecialty: "Glaucoma" },
      { specialty: "Ophthalmology", subspecialty: "Pediatric Ophthalmology" },
      { specialty: "Ophthalmology", subspecialty: "Oculoplastics" },
      { specialty: "Ophthalmology", subspecialty: "Neuro‑Ophthalmology" },
      { specialty: "Orthopaedic Surgery", subspecialty: "Orthopaedic Sports Medicine" },
      { specialty: "Orthopaedic Surgery", subspecialty: "Hand Surgery" },
      { specialty: "Otolaryngology – Head & Neck Surgery", subspecialty: "Neurotology" },
      { specialty: "Otolaryngology – Head & Neck Surgery", subspecialty: "Pediatric ENT" },
      { specialty: "Otolaryngology – Head & Neck Surgery", subspecialty: "Sleep Medicine" },
      { specialty: "Pathology", subspecialty: "(see Molecular, Cytopathology, Forensic, etc.)" },
      { specialty: "Pediatrics", subspecialty: "(see Neonatology, Cardio, Endo, GI, Heme-Onc, ID, etc.)" },
      { specialty: "Physical Medicine & Rehabilitation", subspecialty: "Brain Injury Medicine" },
      { specialty: "Physical Medicine & Rehabilitation", subspecialty: "Spinal Cord Injury Medicine" },
      { specialty: "Physical Medicine & Rehabilitation", subspecialty: "Sports Medicine" },
      { specialty: "Physical Medicine & Rehabilitation", subspecialty: "Pain Medicine" },
      { specialty: "Physical Medicine & Rehabilitation", subspecialty: "Pediatric Rehabilitation" },
      { specialty: "Plastic Surgery", subspecialty: null },
      { specialty: "Preventive Medicine", subspecialty: null },
      { specialty: "Psychiatry", subspecialty: "Child & Adolescent Psychiatry" },
      { specialty: "Psychiatry", subspecialty: "Geriatric Psychiatry" },
      { specialty: "Psychiatry", subspecialty: "Addiction Psychiatry" },
      { specialty: "Psychiatry", subspecialty: "Consultation‑Liaison Psychiatry" },
      { specialty: "Psychiatry", subspecialty: "Forensic Psychiatry" },
      { specialty: "Psychiatry", subspecialty: "Neuropsychiatry" },
      { specialty: "Psychiatry", subspecialty: "Sleep Medicine" },
      { specialty: "Psychiatry", subspecialty: "Hospice & Palliative Medicine" },
      { specialty: "Radiation Oncology", subspecialty: null },
      { specialty: "Radiology", subspecialty: "Interventional Radiology" },
      { specialty: "Radiology", subspecialty: "Neuroradiology" },
      { specialty: "Radiology", subspecialty: "Nuclear Radiology" },
      { specialty: "Radiology", subspecialty: "Pediatric Radiology" },
      { specialty: "General Surgery", subspecialty: "Colorectal Surgery" },
      { specialty: "General Surgery", subspecialty: "Trauma Surgery" },
      { specialty: "General Surgery", subspecialty: "Transplant Surgery" },
      { specialty: "Thoracic Surgery", subspecialty: "Cardiothoracic Surgery" },
      { specialty: "Urology", subspecialty: "Pediatric Urology" },
      { specialty: "Urology", subspecialty: "Urologic Oncology" },
      { specialty: "Urology", subspecialty: "Endourology" }
    ];

    // Check if specialties already exist
    const existingSpecialties = await db.select().from(medicalSpecialties).limit(1);
    if (existingSpecialties.length === 0) {
      await db.insert(medicalSpecialties).values(specialtiesData);
    }
  }

  async seedDefaultUsers(): Promise<void> {
    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      const { hashPassword } = await import("./middleware/auth");
      
      const defaultUsers = [
        {
          username: "admin",
          email: "admin@medauthpro.com",
          password: await hashPassword("admin123"),
          role: "admin",
          firstName: "System",
          lastName: "Administrator",
          specialtyId: null,
          isActive: true,
        },
        {
          username: "doctor",
          email: "doctor@medauthpro.com", 
          password: await hashPassword("doctor123"),
          role: "doctor",
          firstName: "Dr. Sarah",
          lastName: "Johnson",
          specialtyId: null,
          isActive: true,
        },
        {
          username: "staff",
          email: "staff@medauthpro.com",
          password: await hashPassword("staff123"),
          role: "staff",
          firstName: "Mary",
          lastName: "Williams",
          specialtyId: null,
          isActive: true,
        }
      ];
      
      await db.insert(users).values(defaultUsers);
    }
  }

  async seedInsuranceProviders(): Promise<void> {
    // Check if insurance providers already exist
    const existingProviders = await db.select().from(insuranceProviders).limit(1);
    if (existingProviders.length === 0) {
      const providers = [
        {
          name: "Aetna",
          code: "AETNA",
          contactInfo: { 
            phone: "1-800-872-3862",
            website: "https://www.aetna.com",
            priorAuthPhone: "1-855-240-0546"
          },
          priorAuthPhone: "1-855-240-0546",
          averageProcessingDays: 5,
          urgentProcessingDays: 2,
          isActive: true
        },
        {
          name: "Blue Cross Blue Shield",
          code: "BCBS",
          contactInfo: { 
            phone: "1-888-630-2583",
            website: "https://www.bcbs.com",
            priorAuthPhone: "1-800-810-2583"
          },
          priorAuthPhone: "1-800-810-2583",
          averageProcessingDays: 7,
          urgentProcessingDays: 2,
          isActive: true
        },
        {
          name: "Cigna",
          code: "CIGNA",
          contactInfo: { 
            phone: "1-800-244-6224",
            website: "https://www.cigna.com",
            priorAuthPhone: "1-800-88-CIGNA"
          },
          priorAuthPhone: "1-800-88-CIGNA",
          averageProcessingDays: 5,
          urgentProcessingDays: 1,
          isActive: true
        },
        {
          name: "UnitedHealth",
          code: "UHC",
          contactInfo: { 
            phone: "1-877-842-3210",
            website: "https://www.uhc.com",
            priorAuthPhone: "1-866-889-7339"
          },
          priorAuthPhone: "1-866-889-7339",
          averageProcessingDays: 6,
          urgentProcessingDays: 2,
          isActive: true
        },
        {
          name: "Humana",
          code: "HUMANA",
          contactInfo: { 
            phone: "1-800-448-6262",
            website: "https://www.humana.com",
            priorAuthPhone: "1-800-555-1234"
          },
          priorAuthPhone: "1-800-555-1234",
          averageProcessingDays: 5,
          urgentProcessingDays: 2,
          isActive: true
        },
        {
          name: "Kaiser Permanente",
          code: "KAISER",
          contactInfo: { 
            phone: "1-800-464-4000",
            website: "https://www.kaiserpermanente.org",
            priorAuthPhone: "1-800-777-7902"
          },
          priorAuthPhone: "1-800-777-7902",
          averageProcessingDays: 4,
          urgentProcessingDays: 1,
          isActive: true
        },
        {
          name: "Medicare",
          code: "MEDICARE",
          contactInfo: { 
            phone: "1-800-633-4227",
            website: "https://www.medicare.gov",
            priorAuthPhone: "1-800-Medicare"
          },
          priorAuthPhone: "1-800-Medicare",
          averageProcessingDays: 10,
          urgentProcessingDays: 3,
          isActive: true
        },
        {
          name: "Medicaid",
          code: "MEDICAID",
          contactInfo: { 
            phone: "1-800-318-2596",
            website: "https://www.medicaid.gov",
            priorAuthPhone: "1-800-538-9295"
          },
          priorAuthPhone: "1-800-538-9295",
          averageProcessingDays: 14,
          urgentProcessingDays: 5,
          isActive: true
        }
      ];
      
      await db.insert(insuranceProviders).values(providers);
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Patients
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientByPatientId(patientId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientId, patientId));
    return patient || undefined;
  }

  async getPatientByName(firstName: string, lastName: string, dateOfBirth: Date): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(
      and(
        eq(patients.firstName, firstName),
        eq(patients.lastName, lastName),
        eq(patients.dateOfBirth, dateOfBirth)
      )
    );
    return patient || undefined;
  }

  async getPatients(limit = 50, offset = 0): Promise<Patient[]> {
    return await db.select().from(patients).limit(limit).offset(offset).orderBy(desc(patients.createdAt));
  }

  async getPatientsCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(patients);
    return result.count;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db.update(patients).set(updates).where(eq(patients.id, id)).returning();
    return patient || undefined;
  }

  async deletePatient(id: number): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteAllPatients(): Promise<number> {
    try {
      // First check if there are any patients
      const count = await this.getPatientsCount();
      if (count === 0) {
        return 0;
      }
      
      // Use raw SQL to delete all patients (more reliable than ORM)
      const result = await db.execute(sql`DELETE FROM patients`);
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error in deleteAllPatients:", error);
      throw error;
    }
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return await db.select().from(patients).where(
      or(
        like(patients.firstName, `%${query}%`),
        like(patients.lastName, `%${query}%`),
        like(patients.patientId, `%${query}%`)
      )
    ).limit(20);
  }

  // Insurance Providers
  async getInsuranceProviders(): Promise<InsuranceProvider[]> {
    return await db.select().from(insuranceProviders).where(eq(insuranceProviders.isActive, true));
  }

  async getInsuranceProvider(id: number): Promise<InsuranceProvider | undefined> {
    const [provider] = await db.select().from(insuranceProviders).where(eq(insuranceProviders.id, id));
    return provider || undefined;
  }

  async createInsuranceProvider(insertProvider: InsertInsuranceProvider): Promise<InsuranceProvider> {
    const [provider] = await db.insert(insuranceProviders).values(insertProvider).returning();
    return provider;
  }

  async updateInsuranceProvider(id: number, updates: Partial<InsertInsuranceProvider>): Promise<InsuranceProvider | undefined> {
    const [provider] = await db.update(insuranceProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(insuranceProviders.id, id))
      .returning();
    return provider || undefined;
  }

  async deleteInsuranceProvider(id: number): Promise<boolean> {
    // Soft delete by setting isActive to false
    const [provider] = await db.update(insuranceProviders)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(insuranceProviders.id, id))
      .returning();
    return !!provider;
  }

  // Patient Insurance
  async getPatientInsurance(patientId: number): Promise<PatientInsurance[]> {
    return await db.select().from(patientInsurance).where(
      and(
        eq(patientInsurance.patientId, patientId),
        eq(patientInsurance.isActive, true)
      )
    );
  }

  async createPatientInsurance(insertInsurance: InsertPatientInsurance): Promise<PatientInsurance> {
    const [insurance] = await db.insert(patientInsurance).values(insertInsurance).returning();
    return insurance;
  }

  async updatePatientInsurance(id: number, updates: Partial<InsertPatientInsurance>): Promise<PatientInsurance | undefined> {
    const [insurance] = await db.update(patientInsurance).set(updates).where(eq(patientInsurance.id, id)).returning();
    return insurance || undefined;
  }

  // Prior Authorizations
  async getPriorAuthorization(id: number): Promise<PriorAuthorization | undefined> {
    const [authorization] = await db.select().from(priorAuthorizations).where(eq(priorAuthorizations.id, id));
    return authorization || undefined;
  }

  async getPriorAuthorizationByAuthId(authId: string): Promise<PriorAuthorization | undefined> {
    const [authorization] = await db.select().from(priorAuthorizations).where(eq(priorAuthorizations.authorizationId, authId));
    return authorization || undefined;
  }

  async getPriorAuthorizations(limit = 50, offset = 0): Promise<PriorAuthorization[]> {
    return await db.select().from(priorAuthorizations).limit(limit).offset(offset).orderBy(desc(priorAuthorizations.createdAt));
  }

  async getPriorAuthorizationsByPatient(patientId: number): Promise<PriorAuthorization[]> {
    return await db.select().from(priorAuthorizations).where(eq(priorAuthorizations.patientId, patientId));
  }

  async getPriorAuthorizationsByStatus(status: string): Promise<PriorAuthorization[]> {
    return await db.select().from(priorAuthorizations).where(eq(priorAuthorizations.status, status));
  }

  async createPriorAuthorization(insertAuthorization: InsertPriorAuthorization): Promise<PriorAuthorization> {
    const [authorization] = await db.insert(priorAuthorizations).values(insertAuthorization).returning();
    return authorization;
  }

  async updatePriorAuthorization(id: number, updates: Partial<InsertPriorAuthorization>): Promise<PriorAuthorization | undefined> {
    const [authorization] = await db.update(priorAuthorizations).set(updates).where(eq(priorAuthorizations.id, id)).returning();
    return authorization || undefined;
  }

  async deletePriorAuthorization(id: number): Promise<boolean> {
    const result = await db.delete(priorAuthorizations).where(eq(priorAuthorizations.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updatePriorAuthorizationStatus(id: number, status: string): Promise<boolean> {
    const result = await db.update(priorAuthorizations)
      .set({ status, updatedAt: new Date() })
      .where(eq(priorAuthorizations.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAuthorizationStats(): Promise<{ pending: number; approved: number; denied: number; total: number; }> {
    const [pendingCount] = await db.select({ count: count() }).from(priorAuthorizations).where(eq(priorAuthorizations.status, 'pending'));
    const [approvedCount] = await db.select({ count: count() }).from(priorAuthorizations).where(eq(priorAuthorizations.status, 'approved'));
    const [deniedCount] = await db.select({ count: count() }).from(priorAuthorizations).where(eq(priorAuthorizations.status, 'denied'));
    const [totalCount] = await db.select({ count: count() }).from(priorAuthorizations);

    return {
      pending: pendingCount.count,
      approved: approvedCount.count,
      denied: deniedCount.count,
      total: totalCount.count,
    };
  }

  // Documents
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByAuthorization(authId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.authorizationId, authId));
  }

  async getDocumentsByPatient(patientId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.patientId, patientId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(limit = 100, offset = 0): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).limit(limit).offset(offset).orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByUser(userId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByResource(resourceType: string, resourceId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(
      and(
        eq(auditLogs.resourceType, resourceType),
        eq(auditLogs.resourceId, resourceId)
      )
    ).orderBy(desc(auditLogs.timestamp));
  }

  // System Configuration Methods
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig)
      .where(and(eq(systemConfig.key, key), eq(systemConfig.isActive, true)));
    return config || undefined;
  }

  async setSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig> {
    const existingConfig = await this.getSystemConfig(key);
    
    if (existingConfig) {
      const [updated] = await db.update(systemConfig)
        .set({ 
          value, 
          description: description || existingConfig.description,
          updatedAt: new Date()
        })
        .where(eq(systemConfig.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(systemConfig)
        .values({ key, value, description })
        .returning();
      return created;
    }
  }

  async getAllSystemConfig(): Promise<SystemConfig[]> {
    return await db.select().from(systemConfig)
      .where(eq(systemConfig.isActive, true))
      .orderBy(systemConfig.key);
  }

  async seedIcd10Codes(): Promise<void> {
    // Import and use the ICD-10 seeding service
    const { icd10CodeService } = await import("./services/icd10-codes");
    await icd10CodeService.seedIcd10Codes();
  }

  async seedSystemConfig(): Promise<void> {
    const configs = [
      {
        key: "client_name",
        value: "Demo Medical Practice",
        description: "The name of the medical practice or client organization"
      },
      {
        key: "app_version",
        value: "2.0.0",
        description: "Current application version"
      },
      {
        key: "admin_email",
        value: "admin@example.com",
        description: "System administrator email address"
      }
    ];

    for (const config of configs) {
      const exists = await this.getSystemConfig(config.key);
      if (!exists) {
        await this.setSystemConfig(config.key, config.value, config.description);
      }
    }
  }

  async seedSamplePatients(): Promise<void> {
    // Check if patients already exist
    const existingPatients = await db.select().from(patients).limit(1);
    if (existingPatients.length === 0) {
      const samplePatients = [
        {
          patientId: "P001",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1985-03-15"),
          gender: "male",
          phone: "555-123-4567",
          email: "john.doe@example.com",
          address: "123 Main St, Anytown, ST 12345",
          emergencyContact: "Jane Doe - 555-987-6543"
        },
        {
          patientId: "P002",
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: new Date("1978-07-22"),
          gender: "female",
          phone: "555-234-5678",
          email: "jane.smith@example.com",
          address: "456 Oak Ave, Somewhere, ST 67890",
          emergencyContact: "Bob Smith - 555-876-5432"
        },
        {
          patientId: "P003",
          firstName: "Michael",
          lastName: "Johnson",
          dateOfBirth: new Date("1992-11-08"),
          gender: "male",
          phone: "555-345-6789",
          email: "michael.johnson@example.com",
          address: "789 Pine Rd, Elsewhere, ST 54321",
          emergencyContact: "Lisa Johnson - 555-765-4321"
        }
      ];
      
      await db.insert(patients).values(samplePatients);
    }
  }

  async seedSampleAuthorizations(): Promise<void> {
    // Check if authorizations already exist
    const existingAuthorizations = await db.select().from(priorAuthorizations).limit(1);
    if (existingAuthorizations.length === 0) {
      // Get sample patients and users for foreign keys
      const samplePatients = await db.select().from(patients).limit(3);
      const adminUser = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
      
      if (samplePatients.length > 0 && adminUser.length > 0) {
        // Get insurance providers for foreign keys
        const insuranceProvidersList = await db.select().from(insuranceProviders).limit(3);
        const firstInsuranceId = insuranceProvidersList.length > 0 ? insuranceProvidersList[0].id : 1;
        
        const sampleAuthorizations = [
          {
            authorizationId: "AUTH-2024-001",
            patientId: samplePatients[0].id,
            insuranceId: firstInsuranceId,
            treatmentType: "MRI Scan",
            cptCode: "72148",
            icd10Code: "M54.5",
            clinicalJustification: "Patient experiencing chronic lower back pain for 3 months",
            requestedDate: new Date("2024-01-15T10:30:00Z"),
            submittedDate: new Date("2024-01-15T10:30:00Z"),
            status: "pending",
            submittedBy: adminUser[0].id
          },
          {
            authorizationId: "AUTH-2024-002",
            patientId: samplePatients[1].id,
            insuranceId: firstInsuranceId,
            treatmentType: "Physical Therapy",
            cptCode: "97110",
            icd10Code: "M75.3",
            clinicalJustification: "Patient needs 12 sessions of physical therapy for shoulder impingement",
            requestedDate: new Date("2024-01-14T14:15:00Z"),
            submittedDate: new Date("2024-01-14T14:15:00Z"),
            status: "approved",
            approvalDate: new Date("2024-01-15T09:20:00Z"),
            authorizationNumber: "AUTH-APPR-002",
            submittedBy: adminUser[0].id
          },
          {
            authorizationId: "AUTH-2024-003",
            patientId: samplePatients[2].id,
            insuranceId: firstInsuranceId,
            treatmentType: "CT Scan",
            cptCode: "74176",
            icd10Code: "R10.9",
            clinicalJustification: "Patient has persistent abdominal pain requiring imaging",
            requestedDate: new Date("2024-01-13T11:45:00Z"),
            submittedDate: new Date("2024-01-13T11:45:00Z"),
            status: "denied",
            denialReason: "Insufficient clinical documentation",
            submittedBy: adminUser[0].id
          },
          {
            authorizationId: "AUTH-2024-004",
            patientId: samplePatients[0].id,
            insuranceId: firstInsuranceId,
            treatmentType: "Specialist Consultation",
            cptCode: "99243",
            icd10Code: "R53.1",
            clinicalJustification: "Referral to endocrinologist for chronic fatigue evaluation",
            requestedDate: new Date("2024-01-16T08:00:00Z"),
            submittedDate: new Date("2024-01-16T08:00:00Z"),
            status: "pending",
            submittedBy: adminUser[0].id
          },
          {
            authorizationId: "AUTH-2024-005",
            patientId: samplePatients[1].id,
            insuranceId: firstInsuranceId,
            treatmentType: "Surgery",
            cptCode: "47562",
            icd10Code: "K80.2",
            clinicalJustification: "Laparoscopic cholecystectomy indicated for gallbladder stones",
            requestedDate: new Date("2024-01-12T13:20:00Z"),
            submittedDate: new Date("2024-01-12T13:20:00Z"),
            status: "approved",
            approvalDate: new Date("2024-01-13T10:15:00Z"),
            authorizationNumber: "AUTH-APPR-005",
            submittedBy: adminUser[0].id
          }
        ];
        
        await db.insert(priorAuthorizations).values(sampleAuthorizations);
      }
    }
  }

  // Procedure Codes Implementation
  async getAllProcedureCodes(): Promise<ProcedureCode[]> {
    return await db.select().from(procedureCodes).where(eq(procedureCodes.isActive, true)).orderBy(procedureCodes.cptCode);
  }

  async getProcedureCode(id: number): Promise<ProcedureCode | undefined> {
    const [procedure] = await db.select().from(procedureCodes).where(eq(procedureCodes.id, id));
    return procedure || undefined;
  }

  async getProcedureCodeByCPT(cptCode: string): Promise<ProcedureCode | undefined> {
    const [procedure] = await db.select().from(procedureCodes).where(eq(procedureCodes.cptCode, cptCode));
    return procedure || undefined;
  }

  async getProcedureCodes(limit = 100, offset = 0): Promise<ProcedureCode[]> {
    return await db.select().from(procedureCodes)
      .where(eq(procedureCodes.isActive, true))
      .limit(limit).offset(offset);
  }

  async searchProcedureCodes(query: string, category?: string): Promise<ProcedureCode[]> {
    let queryBuilder = db.select().from(procedureCodes)
      .where(
        and(
          eq(procedureCodes.isActive, true),
          or(
            like(procedureCodes.cptCode, `%${query}%`),
            like(procedureCodes.description, `%${query}%`)
          )
        )
      );

    if (category) {
      return await db.select().from(procedureCodes)
        .where(
          and(
            eq(procedureCodes.isActive, true),
            eq(procedureCodes.category, category),
            or(
              like(procedureCodes.cptCode, `%${query}%`),
              like(procedureCodes.description, `%${query}%`)
            )
          )
        )
        .limit(50);
    }

    return await queryBuilder.limit(50);
  }

  async getProceduresByCategory(category: string): Promise<ProcedureCode[]> {
    return await db.select().from(procedureCodes)
      .where(
        and(
          eq(procedureCodes.isActive, true),
          eq(procedureCodes.category, category)
        )
      );
  }

  async getProcedureCategories(): Promise<string[]> {
    const result = await db
      .selectDistinct({ category: procedureCodes.category })
      .from(procedureCodes)
      .where(eq(procedureCodes.isActive, true));
    
    return result.map(r => r.category);
  }

  async createProcedureCode(procedure: InsertProcedureCode): Promise<ProcedureCode> {
    const [newProcedure] = await db.insert(procedureCodes).values(procedure).returning();
    return newProcedure;
  }

  async updateProcedureCode(id: number, updates: Partial<InsertProcedureCode>): Promise<ProcedureCode | undefined> {
    const [updated] = await db.update(procedureCodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(procedureCodes.id, id))
      .returning();
    return updated || undefined;
  }

  // ICD-10 Codes Implementation
  async getAllIcd10Codes(): Promise<Icd10Code[]> {
    return await db.select().from(icd10Codes).where(eq(icd10Codes.isActive, true)).orderBy(icd10Codes.icd10Code);
  }

  async getIcd10Code(id: number): Promise<Icd10Code | undefined> {
    const [code] = await db.select().from(icd10Codes).where(eq(icd10Codes.id, id));
    return code || undefined;
  }

  async getIcd10CodeByCode(icd10Code: string): Promise<Icd10Code | undefined> {
    const [code] = await db.select().from(icd10Codes).where(eq(icd10Codes.icd10Code, icd10Code));
    return code || undefined;
  }

  async getIcd10Codes(limit = 100, offset = 0): Promise<Icd10Code[]> {
    return await db.select().from(icd10Codes)
      .where(eq(icd10Codes.isActive, true))
      .limit(limit).offset(offset);
  }

  async searchIcd10Codes(query: string, category?: string): Promise<Icd10Code[]> {
    let queryBuilder = db.select().from(icd10Codes)
      .where(
        and(
          eq(icd10Codes.isActive, true),
          or(
            like(icd10Codes.icd10Code, `%${query}%`),
            like(icd10Codes.description, `%${query}%`)
          )
        )
      );

    if (category) {
      return await db.select().from(icd10Codes)
        .where(
          and(
            eq(icd10Codes.isActive, true),
            eq(icd10Codes.category, category),
            or(
              like(icd10Codes.icd10Code, `%${query}%`),
              like(icd10Codes.description, `%${query}%`)
            )
          )
        )
        .limit(50);
    }

    return await queryBuilder.limit(50);
  }

  async getIcd10CodesByCategory(category: string): Promise<Icd10Code[]> {
    return await db.select().from(icd10Codes)
      .where(
        and(
          eq(icd10Codes.isActive, true),
          eq(icd10Codes.category, category)
        )
      );
  }

  async getIcd10CodesByChapter(chapterCode: string): Promise<Icd10Code[]> {
    return await db.select().from(icd10Codes)
      .where(
        and(
          eq(icd10Codes.isActive, true),
          eq(icd10Codes.chapterCode, chapterCode)
        )
      );
  }

  async getIcd10Categories(): Promise<string[]> {
    const result = await db
      .selectDistinct({ category: icd10Codes.category })
      .from(icd10Codes)
      .where(eq(icd10Codes.isActive, true));
    
    return result.map(r => r.category).filter((category): category is string => Boolean(category));
  }

  async createIcd10Code(code: InsertIcd10Code): Promise<Icd10Code> {
    const [newCode] = await db.insert(icd10Codes).values(code).returning();
    return newCode;
  }

  async updateIcd10Code(id: number, updates: Partial<InsertIcd10Code>): Promise<Icd10Code | undefined> {
    const [updated] = await db.update(icd10Codes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(icd10Codes.id, id))
      .returning();
    return updated || undefined;
  }

  // Prior Auth Workflow Steps Implementation
  async getPriorAuthWorkflowStep(authorizationId: number, stepNumber: number): Promise<PriorAuthWorkflowStep | undefined> {
    const [step] = await db.select().from(priorAuthWorkflowSteps)
      .where(
        and(
          eq(priorAuthWorkflowSteps.authorizationId, authorizationId),
          eq(priorAuthWorkflowSteps.stepNumber, stepNumber)
        )
      );
    return step || undefined;
  }

  async getPriorAuthWorkflowSteps(authorizationId: number): Promise<PriorAuthWorkflowStep[]> {
    return await db.select().from(priorAuthWorkflowSteps)
      .where(eq(priorAuthWorkflowSteps.authorizationId, authorizationId))
      .orderBy(priorAuthWorkflowSteps.stepNumber);
  }

  async createPriorAuthWorkflowStep(step: InsertPriorAuthWorkflowStep): Promise<PriorAuthWorkflowStep> {
    const [newStep] = await db.insert(priorAuthWorkflowSteps).values(step).returning();
    return newStep;
  }

  async updatePriorAuthWorkflowStep(id: number, updates: Partial<InsertPriorAuthWorkflowStep>): Promise<PriorAuthWorkflowStep | undefined> {
    const [updated] = await db.update(priorAuthWorkflowSteps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(priorAuthWorkflowSteps.id, id))
      .returning();
    return updated || undefined;
  }

  // State Form Templates Implementation
  async getStateFormTemplate(state: string, formType: string): Promise<StateFormTemplate | undefined> {
    const [template] = await db.select().from(stateFormTemplates)
      .where(
        and(
          eq(stateFormTemplates.state, state),
          eq(stateFormTemplates.formType, formType),
          eq(stateFormTemplates.isActive, true)
        )
      );
    return template || undefined;
  }

  async getStateFormTemplates(): Promise<StateFormTemplate[]> {
    return await db.select().from(stateFormTemplates)
      .where(eq(stateFormTemplates.isActive, true));
  }

  async createStateFormTemplate(template: InsertStateFormTemplate): Promise<StateFormTemplate> {
    const [newTemplate] = await db.insert(stateFormTemplates).values(template).returning();
    return newTemplate;
  }

  async updateStateFormTemplate(id: number, updates: Partial<InsertStateFormTemplate>): Promise<StateFormTemplate | undefined> {
    const [updated] = await db.update(stateFormTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(stateFormTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  constructor() {
    this.seedSampleData();
  }

  async seedSampleData(): Promise<void> {
    await this.seedMedicalSpecialties();
    await this.seedDefaultUsers();
    await this.seedInsuranceProviders();
    await this.seedSystemConfig();
    // Disabled sample data creation for production
    // await this.seedSamplePatients();
    // await this.seedSampleAuthorizations();
    
    // Initialize procedure codes
    const { procedureCodeService } = await import('./services/procedure-codes');
    await procedureCodeService.seedProcedureCodes();
  }
}

export const storage = new DatabaseStorage();

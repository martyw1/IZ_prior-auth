import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const medicalSpecialties = pgTable("medical_specialties", {
  id: serial("id").primaryKey(),
  specialty: text("specialty").notNull(),
  subspecialty: text("subspecialty"),
  isActive: boolean("is_active").notNull().default(true),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("staff"), // admin, doctor, staff
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  specialtyId: integer("specialty_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enhanced patients table to match EMR import formats
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender"),
  race: text("race"),
  ethnicity: text("ethnicity"),
  ssn: text("ssn"), // Encrypted
  driversLicense: text("drivers_license"),
  passport: text("passport"),
  prefix: text("prefix"),
  suffix: text("suffix"),
  maidenName: text("maiden_name"),
  maritalStatus: text("marital_status"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  county: text("county"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  birthplace: text("birthplace"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  // Insurance information (primary insurance on patient record)
  primaryInsuranceProvider: text("primary_insurance_provider"),
  policyNumber: text("policy_number"),
  memberId: text("member_id"),
  groupNumber: text("group_number"),
  insuranceEffectiveDate: timestamp("insurance_effective_date"),
  insuranceExpirationDate: timestamp("insurance_expiration_date"),
  // Primary Care Provider information
  pcpName: text("pcp_name"),
  pcpNpi: text("pcp_npi"),
  pcpPhone: text("pcp_phone"),
  pcpAddress: text("pcp_address"),
  // Import tracking
  sourceSystem: text("source_system"), // "Epic", "CSV", "Manual", etc.
  lastImportDate: timestamp("last_import_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insuranceProviders = pgTable("insurance_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  contactInfo: json("contact_info"),
  // Prior authorization workflow steps
  priorAuthSteps: json("prior_auth_steps"), // Array of step definitions
  priorAuthRequirements: json("prior_auth_requirements"), // Special requirements
  // Contact details for prior auth
  priorAuthPhone: text("prior_auth_phone"),
  priorAuthFax: text("prior_auth_fax"),
  priorAuthEmail: text("prior_auth_email"),
  priorAuthWebsite: text("prior_auth_website"),
  // Processing details
  averageProcessingDays: integer("average_processing_days").default(5),
  urgentProcessingDays: integer("urgent_processing_days").default(2),
  // Additional info
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientInsurance = pgTable("patient_insurance", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  insuranceProviderId: integer("insurance_provider_id").notNull(),
  memberId: text("member_id").notNull(),
  groupNumber: text("group_number"),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  isPrimary: boolean("is_primary").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced prior authorizations with complete workflow support
export const priorAuthorizations = pgTable("prior_authorizations", {
  id: serial("id").primaryKey(),
  authorizationId: text("authorization_id").notNull().unique(),
  patientId: integer("patient_id").notNull(),
  insuranceId: integer("insurance_id").notNull(),
  treatmentType: text("treatment_type").notNull(),
  cptCodes: text("cpt_codes").array().notNull(), // Array of CPT codes
  icd10Codes: text("icd10_codes").array().notNull(), // Array of ICD-10 codes
  clinicalJustification: text("clinical_justification").notNull(),
  // Enhanced workflow fields
  requestedDate: timestamp("requested_date").notNull(),
  submittedDate: timestamp("submitted_date"),
  status: text("status").notNull().default("pending"), // pending, in_review, approved, denied, appealed, expired
  currentStep: integer("current_step").notNull().default(1),
  totalSteps: integer("total_steps").notNull().default(10),
  // Prior auth specific fields
  urgentRequest: boolean("urgent_request").notNull().default(false),
  previousTreatments: json("previous_treatments"), // Step therapy documentation
  clinicalEvidence: json("clinical_evidence"), // Lab results, imaging, etc.
  providerNotes: text("provider_notes"),
  // Response tracking
  approvalDate: timestamp("approval_date"),
  denialReason: text("denial_reason"),
  authorizationNumber: text("authorization_number"),
  expirationDate: timestamp("expiration_date"),
  appealDeadline: timestamp("appeal_deadline"),
  // State form generation
  stateFormTemplateId: integer("state_form_template_id"),
  generatedFormData: json("generated_form_data"),
  formPackagePath: text("form_package_path"), // Path to generated form package
  // Assignment and tracking
  submittedBy: integer("submitted_by").notNull(),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  authorizationId: integer("authorization_id"),
  patientId: integer("patient_id"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  encryptedPath: text("encrypted_path").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Enhanced audit logs with before/after data tracking
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id"),
  details: json("details"),
  // Critical: Store actual data changes for medical/legal compliance
  beforeData: json("before_data"), // Original data before change
  afterData: json("after_data"),   // New data after change
  fieldChanges: json("field_changes"), // Specific field-by-field changes
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Procedure codes table for prior authorization
export const procedureCodes = pgTable("procedure_codes", {
  id: serial("id").primaryKey(),
  cptCode: text("cpt_code").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  treatmentType: text("treatment_type").notNull(),
  subcategory: text("subcategory"),
  isActive: boolean("is_active").notNull().default(true),
  requiresPriorAuth: boolean("requires_prior_auth").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ICD-10 Diagnosis Codes from CMS.gov official source
export const icd10Codes = pgTable("icd10_codes", {
  id: serial("id").primaryKey(),
  icd10Code: varchar("icd10_code", { length: 10 }).notNull().unique(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  chapterCode: varchar("chapter_code", { length: 5 }),
  chapterDescription: text("chapter_description"),
  blockCode: varchar("block_code", { length: 10 }),
  blockDescription: text("block_description"),
  isActive: boolean("is_active").notNull().default(true),
  fiscalYear: varchar("fiscal_year", { length: 10 }).notNull().default("2026"),
  effectiveDate: date("effective_date"),
  terminationDate: date("termination_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prior authorization workflow steps tracking
export const priorAuthWorkflowSteps = pgTable("prior_auth_workflow_steps", {
  id: serial("id").primaryKey(),
  authorizationId: integer("authorization_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  stepName: text("step_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, skipped
  assignedTo: integer("assigned_to"),
  completedBy: integer("completed_by"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  formData: json("form_data"), // Store form responses for this step
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// State-specific form templates for prior authorization
export const stateFormTemplates = pgTable("state_form_templates", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  formType: text("form_type").notNull(), // "prior_auth", "appeal", etc.
  formName: text("form_name").notNull(),
  templatePath: text("template_path").notNull(),
  fields: json("fields").notNull(), // Form field definitions
  isActive: boolean("is_active").notNull().default(true),
  version: text("version").notNull().default("1.0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appEventLogs = pgTable("app_event_logs", {
  id: serial("id").primaryKey(),
  level: varchar("level", { length: 10 }).notNull(), // DEBUG, INFO, WARN, ERROR, FATAL
  message: text("message").notNull(),
  component: varchar("component", { length: 50 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 100 }),
  requestId: varchar("request_id", { length: 100 }),
  metadata: text("metadata"), // JSON string
  stack: text("stack"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const medicalSpecialtiesRelations = relations(medicalSpecialties, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  specialty: one(medicalSpecialties, {
    fields: [users.specialtyId],
    references: [medicalSpecialties.id],
  }),
  priorAuthorizations: many(priorAuthorizations),
  documents: many(documents),
  auditLogs: many(auditLogs),
}));

export const patientsRelations = relations(patients, ({ many }) => ({
  insurance: many(patientInsurance),
  priorAuthorizations: many(priorAuthorizations),
  documents: many(documents),
}));

export const insuranceProvidersRelations = relations(insuranceProviders, ({ many }) => ({
  patientInsurance: many(patientInsurance),
}));

export const patientInsuranceRelations = relations(patientInsurance, ({ one, many }) => ({
  patient: one(patients, {
    fields: [patientInsurance.patientId],
    references: [patients.id],
  }),
  insuranceProvider: one(insuranceProviders, {
    fields: [patientInsurance.insuranceProviderId],
    references: [insuranceProviders.id],
  }),
  priorAuthorizations: many(priorAuthorizations),
}));

export const priorAuthorizationsRelations = relations(priorAuthorizations, ({ one, many }) => ({
  patient: one(patients, {
    fields: [priorAuthorizations.patientId],
    references: [patients.id],
  }),
  insurance: one(patientInsurance, {
    fields: [priorAuthorizations.insuranceId],
    references: [patientInsurance.id],
  }),
  submittedByUser: one(users, {
    fields: [priorAuthorizations.submittedBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [priorAuthorizations.assignedTo],
    references: [users.id],
  }),
  stateFormTemplate: one(stateFormTemplates, {
    fields: [priorAuthorizations.stateFormTemplateId],
    references: [stateFormTemplates.id],
  }),
  documents: many(documents),
  workflowSteps: many(priorAuthWorkflowSteps),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  authorization: one(priorAuthorizations, {
    fields: [documents.authorizationId],
    references: [priorAuthorizations.id],
  }),
  patient: one(patients, {
    fields: [documents.patientId],
    references: [patients.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const appEventLogsRelations = relations(appEventLogs, ({ one }) => ({
  user: one(users, {
    fields: [appEventLogs.userId],
    references: [users.id],
  }),
}));

// New table relations
export const procedureCodesRelations = relations(procedureCodes, ({ many }) => ({
  priorAuthorizations: many(priorAuthorizations),
}));

export const priorAuthWorkflowStepsRelations = relations(priorAuthWorkflowSteps, ({ one }) => ({
  authorization: one(priorAuthorizations, {
    fields: [priorAuthWorkflowSteps.authorizationId],
    references: [priorAuthorizations.id],
  }),
  assignedToUser: one(users, {
    fields: [priorAuthWorkflowSteps.assignedTo],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [priorAuthWorkflowSteps.completedBy],
    references: [users.id],
  }),
}));

export const stateFormTemplatesRelations = relations(stateFormTemplates, ({ many }) => ({
  priorAuthorizations: many(priorAuthorizations),
}));

// Insert schemas
export const insertMedicalSpecialtySchema = createInsertSchema(medicalSpecialties).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  primaryInsuranceProvider: z.string().optional(),
  policyNumber: z.string().optional(),
  memberId: z.string().optional(),
  groupNumber: z.string().optional(),
  insuranceEffectiveDate: z.string().optional(),
  insuranceExpirationDate: z.string().optional(),
  pcpName: z.string().optional(),
  pcpNpi: z.string().regex(/^\d{10}$/, "NPI must be exactly 10 digits").optional(),
  pcpPhone: z.string().optional(),
  pcpAddress: z.string().optional(),
});

export const insertInsuranceProviderSchema = createInsertSchema(insuranceProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientInsuranceSchema = createInsertSchema(patientInsurance).omit({
  id: true,
  createdAt: true,
});

export const insertPriorAuthorizationSchema = createInsertSchema(priorAuthorizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertProcedureCodeSchema = createInsertSchema(procedureCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriorAuthWorkflowStepSchema = createInsertSchema(priorAuthWorkflowSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStateFormTemplateSchema = createInsertSchema(stateFormTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppEventLogSchema = createInsertSchema(appEventLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type MedicalSpecialty = typeof medicalSpecialties.$inferSelect;
export type InsertMedicalSpecialty = z.infer<typeof insertMedicalSpecialtySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsuranceProvider = typeof insuranceProviders.$inferSelect;
export type InsertInsuranceProvider = z.infer<typeof insertInsuranceProviderSchema>;
export type PatientInsurance = typeof patientInsurance.$inferSelect;
export type InsertPatientInsurance = z.infer<typeof insertPatientInsuranceSchema>;
export type PriorAuthorization = typeof priorAuthorizations.$inferSelect;
export type InsertPriorAuthorization = z.infer<typeof insertPriorAuthorizationSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AppEventLog = typeof appEventLogs.$inferSelect;
export type InsertAppEventLog = z.infer<typeof insertAppEventLogSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

// ICD-10 codes schemas and types
export const insertIcd10CodeSchema = createInsertSchema(icd10Codes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// New table types
export type ProcedureCode = typeof procedureCodes.$inferSelect;
export type InsertProcedureCode = z.infer<typeof insertProcedureCodeSchema>;
export type Icd10Code = typeof icd10Codes.$inferSelect;
export type InsertIcd10Code = z.infer<typeof insertIcd10CodeSchema>;
export type PriorAuthWorkflowStep = typeof priorAuthWorkflowSteps.$inferSelect;
export type InsertPriorAuthWorkflowStep = z.infer<typeof insertPriorAuthWorkflowStepSchema>;
export type StateFormTemplate = typeof stateFormTemplates.$inferSelect;
export type InsertStateFormTemplate = z.infer<typeof insertStateFormTemplateSchema>;

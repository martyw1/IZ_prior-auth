import { storage } from "../storage";
import { InsertProcedureCode } from "@shared/schema";
import { auditService } from "./audit";

// Common CPT procedure codes that typically require prior authorization
export const COMMON_PRIOR_AUTH_PROCEDURES = [
  // Imaging procedures
  { cptCode: '70450', description: 'CT head/brain without contrast', category: 'Radiology', subcategory: 'CT', requiresPriorAuth: true },
  { cptCode: '70460', description: 'CT head/brain with contrast', category: 'Radiology', subcategory: 'CT', requiresPriorAuth: true },
  { cptCode: '70551', description: 'MRI brain without contrast', category: 'Radiology', subcategory: 'MRI', requiresPriorAuth: true },
  { cptCode: '70553', description: 'MRI brain with and without contrast', category: 'Radiology', subcategory: 'MRI', requiresPriorAuth: true },
  { cptCode: '72148', description: 'MRI lumbar spine without contrast', category: 'Radiology', subcategory: 'MRI', requiresPriorAuth: true },
  { cptCode: '72158', description: 'MRI lumbar spine with and without contrast', category: 'Radiology', subcategory: 'MRI', requiresPriorAuth: true },
  { cptCode: '73721', description: 'MRI knee without contrast', category: 'Radiology', subcategory: 'MRI', requiresPriorAuth: true },
  { cptCode: '76770', description: 'Ultrasound retroperitoneal', category: 'Radiology', subcategory: 'Ultrasound', requiresPriorAuth: true },

  // Surgical procedures
  { cptCode: '29881', description: 'Arthroscopy knee surgical', category: 'Surgery', subcategory: 'Orthopedic', requiresPriorAuth: true },
  { cptCode: '63030', description: 'Laminotomy single vertebral segment', category: 'Surgery', subcategory: 'Spine', requiresPriorAuth: true },
  { cptCode: '64483', description: 'Transforaminal epidural injection', category: 'Surgery', subcategory: 'Pain Management', requiresPriorAuth: true },
  { cptCode: '20610', description: 'Arthrocentesis major joint', category: 'Surgery', subcategory: 'Orthopedic', requiresPriorAuth: true },

  // Specialty services
  { cptCode: '90834', description: 'Psychotherapy 45 minutes', category: 'Mental Health', subcategory: 'Therapy', requiresPriorAuth: true },
  { cptCode: '90837', description: 'Psychotherapy 60 minutes', category: 'Mental Health', subcategory: 'Therapy', requiresPriorAuth: true },
  { cptCode: '97110', description: 'Therapeutic exercise', category: 'Physical Therapy', subcategory: 'Exercise', requiresPriorAuth: true },
  { cptCode: '97112', description: 'Neuromuscular reeducation', category: 'Physical Therapy', subcategory: 'Rehabilitation', requiresPriorAuth: true },

  // 2025 New CPT Codes
  { cptCode: '98000', description: 'Telemedicine new patient 15 min', category: 'Telemedicine', subcategory: 'Audio-Video', requiresPriorAuth: false },
  { cptCode: '98001', description: 'Telemedicine new patient low complexity', category: 'Telemedicine', subcategory: 'Audio-Video', requiresPriorAuth: false },
  { cptCode: '98012', description: 'Telemedicine established patient 10-19 min', category: 'Telemedicine', subcategory: 'Audio-Only', requiresPriorAuth: false },
  { cptCode: '0877T', description: 'AI-powered chest imaging analysis', category: 'Artificial Intelligence', subcategory: 'Imaging', requiresPriorAuth: true },
  { cptCode: '0898T', description: 'AI-augmented prostate biopsy guidance', category: 'Artificial Intelligence', subcategory: 'Surgery', requiresPriorAuth: true },
  { cptCode: '15011', description: 'Skin cell suspension autograft harvesting', category: 'Surgery', subcategory: 'Skin', requiresPriorAuth: true },
  { cptCode: '76014', description: 'MRI safety assessment 15 minutes', category: 'Radiology', subcategory: 'MRI Safety', requiresPriorAuth: false },

  // Durable Medical Equipment
  { cptCode: 'E0260', description: 'Hospital bed semi-electric', category: 'DME', subcategory: 'Bed', requiresPriorAuth: true },
  { cptCode: 'E0470', description: 'Respiratory assist device', category: 'DME', subcategory: 'Respiratory', requiresPriorAuth: true },
  { cptCode: 'K0001', description: 'Standard wheelchair', category: 'DME', subcategory: 'Mobility', requiresPriorAuth: true },

  // Common outpatient procedures  
  { cptCode: '45378', description: 'Colonoscopy diagnostic', category: 'Gastroenterology', subcategory: 'Endoscopy', requiresPriorAuth: false },
  { cptCode: '45380', description: 'Colonoscopy with biopsy', category: 'Gastroenterology', subcategory: 'Endoscopy', requiresPriorAuth: true },
  { cptCode: '43235', description: 'Upper endoscopy diagnostic', category: 'Gastroenterology', subcategory: 'Endoscopy', requiresPriorAuth: false },
  { cptCode: '11042', description: 'Debridement skin subcutaneous tissue', category: 'Surgery', subcategory: 'Wound Care', requiresPriorAuth: true },
];

export class ProcedureCodeService {
  
  // Initialize procedure codes database
  async seedProcedureCodes(): Promise<void> {
    try {
      console.log('Seeding procedure codes...');
      
      for (const procedure of COMMON_PRIOR_AUTH_PROCEDURES) {
        const existingCode = await storage.getProcedureCodeByCPT(procedure.cptCode);
        
        if (!existingCode) {
          const insertData: InsertProcedureCode = {
            cptCode: procedure.cptCode,
            description: procedure.description,
            category: procedure.category,
            subcategory: procedure.subcategory,
            requiresPriorAuth: procedure.requiresPriorAuth,
            isActive: true,
          };
          
          await storage.createProcedureCode(insertData);
        }
      }
      
      console.log(`Seeded ${COMMON_PRIOR_AUTH_PROCEDURES.length} procedure codes`);
    } catch (error) {
      console.error('Failed to seed procedure codes:', error);
    }
  }

  // Check if procedure requires prior authorization
  async requiresPriorAuth(cptCode: string): Promise<boolean> {
    try {
      const procedure = await storage.getProcedureCodeByCPT(cptCode);
      return procedure?.requiresPriorAuth || false;
    } catch (error) {
      console.error('Failed to check prior auth requirement:', error);
      return false;
    }
  }

  // Search procedure codes
  async searchProcedureCodes(query: string, category?: string): Promise<any[]> {
    try {
      return await storage.searchProcedureCodes(query, category);
    } catch (error) {
      console.error('Failed to search procedure codes:', error);
      return [];
    }
  }

  // Get procedures by category
  async getProceduresByCategory(category: string): Promise<any[]> {
    try {
      return await storage.getProceduresByCategory(category);
    } catch (error) {
      console.error('Failed to get procedures by category:', error);
      return [];
    }
  }

  // Get all procedure categories
  async getProcedureCategories(): Promise<string[]> {
    try {
      return await storage.getProcedureCategories();
    } catch (error) {
      console.error('Failed to get procedure categories:', error);
      return [];
    }
  }

  // Add custom procedure code
  async addCustomProcedure(procedureData: InsertProcedureCode, userId: number): Promise<any> {
    try {
      const existingCode = await storage.getProcedureCodeByCPT(procedureData.cptCode);
      
      if (existingCode) {
        throw new Error(`Procedure code ${procedureData.cptCode} already exists`);
      }

      const newProcedure = await storage.createProcedureCode(procedureData);
      
      // Log procedure code addition
      await auditService.logDataModification(
        userId,
        'procedure_code',
        newProcedure.id,
        'CREATE',
        null,
        newProcedure,
        '',
        ''
      );

      return newProcedure;
    } catch (error) {
      console.error('Failed to add custom procedure:', error);
      throw error;
    }
  }

  // Update procedure code
  async updateProcedure(cptCode: string, updateData: Partial<InsertProcedureCode>, userId: number): Promise<any> {
    try {
      const existingProcedure = await storage.getProcedureCodeByCPT(cptCode);
      
      if (!existingProcedure) {
        throw new Error(`Procedure code ${cptCode} not found`);
      }

      const updatedProcedure = await storage.updateProcedureCode(existingProcedure.id, updateData);

      // Log procedure code update
      await auditService.logDataModification(
        userId,
        'procedure_code',
        existingProcedure.id,
        'UPDATE',
        existingProcedure,
        updatedProcedure,
        '',
        ''
      );

      return updatedProcedure;
    } catch (error) {
      console.error('Failed to update procedure:', error);
      throw error;
    }
  }
}

export const procedureCodeService = new ProcedureCodeService();
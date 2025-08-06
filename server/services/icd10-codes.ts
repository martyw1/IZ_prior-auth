import { storage } from "../storage";
import { InsertIcd10Code } from "@shared/schema";
import { auditService } from "./audit";
import { ALL_ICD10_CODES } from "@shared/icd10-codes-data";

export class Icd10CodeService {
  
  // Initialize ICD-10 codes database with official CMS.gov data
  async seedIcd10Codes(): Promise<void> {
    try {
      console.log('Seeding ICD-10 diagnosis codes from CMS.gov...');
      
      for (const diagnosis of ALL_ICD10_CODES) {
        const existingCode = await storage.getIcd10CodeByCode(diagnosis.icd10Code);
        
        if (!existingCode) {
          const insertData: InsertIcd10Code = {
            icd10Code: diagnosis.icd10Code,
            description: diagnosis.description,
            category: diagnosis.category,
            chapterCode: diagnosis.chapterCode || null,
            chapterDescription: diagnosis.chapterDescription || null,
            subcategory: diagnosis.subcategory || null,
            blockCode: null,
            blockDescription: null,
            isActive: true,
            fiscalYear: '2026',
            effectiveDate: null,
            terminationDate: null,
          };
          
          await storage.createIcd10Code(insertData);
        }
      }
      
      console.log(`Seeded ${ALL_ICD10_CODES.length} ICD-10 diagnosis codes`);
    } catch (error) {
      console.error('Failed to seed ICD-10 codes:', error);
    }
  }

  // Search ICD-10 diagnosis codes
  async searchIcd10Codes(query: string, category?: string): Promise<any[]> {
    try {
      return await storage.searchIcd10Codes(query, category);
    } catch (error) {
      console.error('Failed to search ICD-10 codes:', error);
      return [];
    }
  }

  // Get ICD-10 codes by category
  async getIcd10CodesByCategory(category: string): Promise<any[]> {
    try {
      return await storage.getIcd10CodesByCategory(category);
    } catch (error) {
      console.error('Failed to get ICD-10 codes by category:', error);
      return [];
    }
  }

  // Get all ICD-10 categories
  async getIcd10Categories(): Promise<string[]> {
    try {
      return await storage.getIcd10Categories();
    } catch (error) {
      console.error('Failed to get ICD-10 categories:', error);
      return [];
    }
  }

  // Get ICD-10 codes by chapter
  async getIcd10CodesByChapter(chapterCode: string): Promise<any[]> {
    try {
      return await storage.getIcd10CodesByChapter(chapterCode);
    } catch (error) {
      console.error('Failed to get ICD-10 codes by chapter:', error);
      return [];
    }
  }

  // Add custom ICD-10 code
  async addCustomIcd10Code(codeData: InsertIcd10Code, userId: number): Promise<any> {
    try {
      const existingCode = await storage.getIcd10CodeByCode(codeData.icd10Code);
      
      if (existingCode) {
        throw new Error(`ICD-10 code ${codeData.icd10Code} already exists`);
      }

      const newCode = await storage.createIcd10Code(codeData);
      
      // Log ICD-10 code addition
      await auditService.logDataModification(
        userId,
        'icd10_code',
        newCode.id,
        'CREATE',
        null,
        newCode,
        '',
        ''
      );

      return newCode;
    } catch (error) {
      console.error('Failed to add custom ICD-10 code:', error);
      throw error;
    }
  }

  // Update ICD-10 code
  async updateIcd10Code(icd10Code: string, updateData: Partial<InsertIcd10Code>, userId: number): Promise<any> {
    try {
      const existingCode = await storage.getIcd10CodeByCode(icd10Code);
      
      if (!existingCode) {
        throw new Error(`ICD-10 code ${icd10Code} not found`);
      }

      const updatedCode = await storage.updateIcd10Code(existingCode.id, updateData);

      // Log ICD-10 code update
      await auditService.logDataModification(
        userId,
        'icd10_code',
        existingCode.id,
        'UPDATE',
        existingCode,
        updatedCode,
        '',
        ''
      );

      return updatedCode;
    } catch (error) {
      console.error('Failed to update ICD-10 code:', error);
      throw error;
    }
  }

  // Get comprehensive diagnosis information
  async getDiagnosisInfo(icd10Code: string): Promise<any> {
    try {
      const diagnosis = await storage.getIcd10CodeByCode(icd10Code);
      
      if (!diagnosis) {
        return null;
      }

      return {
        ...diagnosis,
        chapterInfo: {
          code: diagnosis.chapterCode,
          description: diagnosis.chapterDescription
        },
        categoryInfo: {
          name: diagnosis.category,
          subcategory: diagnosis.subcategory
        },
        fiscalYearInfo: {
          year: diagnosis.fiscalYear,
          effectiveDate: diagnosis.effectiveDate,
          terminationDate: diagnosis.terminationDate
        }
      };
    } catch (error) {
      console.error('Failed to get diagnosis info:', error);
      return null;
    }
  }
}

export const icd10CodeService = new Icd10CodeService();
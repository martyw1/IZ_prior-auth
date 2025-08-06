import express from "express";
import { storage } from "../storage";
import { icd10CodeService } from "../services/icd10-codes";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { appLogger } from "../services/app-logger";
import { auditService } from "../services/audit";

const router = express.Router();

export function setupIcd10CodesRoutes(app: express.Application) {
  // Get all ICD-10 codes with search and filtering
  app.get("/api/icd10-codes", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { search, category, chapter, limit = 50 } = req.query;
      
      let codes;
      if (search) {
        codes = await icd10CodeService.searchIcd10Codes(
          search as string,
          category as string | undefined
        );
      } else if (category) {
        codes = await icd10CodeService.getIcd10CodesByCategory(category as string);
      } else if (chapter) {
        codes = await icd10CodeService.getIcd10CodesByChapter(chapter as string);
      } else {
        codes = await storage.getIcd10Codes(parseInt(limit as string));
      }
      
      await auditService.log(req.user!.id, 'ICD10_CODES_ACCESS', 'icd10_code', null, {
        search: search as string,
        category: category as string,
        chapter: chapter as string,
        limit: parseInt(limit as string),
        resultsCount: codes.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      await appLogger.info('ICD-10 codes retrieved', { component: 'api', userId: req.user?.id });
      res.json(codes);
    } catch (error) {
      await appLogger.error('Failed to get ICD-10 codes', { component: 'api', userId: req.user?.id }, error as Error);
      res.status(500).json({ message: "Failed to get ICD-10 codes" });
    }
  });

  // Get ICD-10 categories
  app.get("/api/icd10-categories", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const categories = await icd10CodeService.getIcd10Categories();
      
      await auditService.log(req.user!.id, 'ICD10_CATEGORIES_ACCESS', 'icd10_code', null, {
        categoriesCount: categories.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(categories);
    } catch (error) {
      await appLogger.error('Failed to get ICD-10 categories', { component: 'api', userId: req.user?.id }, error as Error);
      res.status(500).json({ message: "Failed to get ICD-10 categories" });
    }
  });

  // Get specific ICD-10 code details
  app.get("/api/icd10-codes/:code", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const code = req.params.code;
      const diagnosis = await icd10CodeService.getDiagnosisInfo(code);
      
      if (!diagnosis) {
        return res.status(404).json({ message: "ICD-10 code not found" });
      }
      
      await auditService.log(req.user!.id, 'ICD10_CODE_DETAIL_ACCESS', 'icd10_code', null, {
        code,
        description: diagnosis.description,
        category: diagnosis.category,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(diagnosis);
    } catch (error) {
      await appLogger.error('Failed to get ICD-10 code details', { component: 'api', userId: req.user?.id }, error as Error);
      res.status(500).json({ message: "Failed to get ICD-10 code details" });
    }
  });

  // Search ICD-10 codes with advanced filtering
  app.post("/api/icd10-codes/search", authenticateUser, async (req, res) => {
    try {
      const { query, filters } = req.body;
      const { category, chapter, fiscalYear } = filters || {};
      
      let codes;
      if (chapter) {
        codes = await icd10CodeService.getIcd10CodesByChapter(chapter);
      } else if (category) {
        codes = await icd10CodeService.getIcd10CodesByCategory(category);
      } else {
        codes = await icd10CodeService.searchIcd10Codes(query, category);
      }
      
      // Apply additional filters if specified
      if (fiscalYear) {
        codes = codes.filter(code => code.fiscalYear === fiscalYear);
      }
      
      res.json(codes);
    } catch (error) {
      await appLogger.error('Failed to search ICD-10 codes', 'api', req.user?.id, error);
      res.status(500).json({ message: "Failed to search ICD-10 codes" });
    }
  });

  // Add custom ICD-10 code (admin only)
  app.post("/api/icd10-codes", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user has admin role
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const codeData = req.body;
      const newCode = await icd10CodeService.addCustomIcd10Code(codeData, userId);
      
      await appLogger.info(`Custom ICD-10 code added: ${newCode.icd10Code}`, 'api', userId);
      res.status(201).json(newCode);
    } catch (error) {
      await appLogger.error('Failed to add ICD-10 code', 'api', req.user?.id, error);
      res.status(500).json({ message: "Failed to add ICD-10 code" });
    }
  });

  // Update ICD-10 code (admin only)
  app.put("/api/icd10-codes/:code", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user has admin role
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const code = req.params.code;
      const updateData = req.body;
      const updatedCode = await icd10CodeService.updateIcd10Code(code, updateData, userId);
      
      await appLogger.info(`ICD-10 code updated: ${code}`, 'api', userId);
      res.json(updatedCode);
    } catch (error) {
      await appLogger.error('Failed to update ICD-10 code', 'api', req.user?.id, error);
      res.status(500).json({ message: "Failed to update ICD-10 code" });
    }
  });
}

export default router;
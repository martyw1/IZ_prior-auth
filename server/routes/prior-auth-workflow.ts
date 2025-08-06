import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { priorAuthWorkflowService } from "../services/prior-auth-workflow";
import { procedureCodeService } from "../services/procedure-codes";
import { auditService } from "../services/audit";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

// Request schemas
const completeStepSchema = z.object({
  formData: z.record(z.any()),
  notes: z.string().optional(),
});

const generateFormsSchema = z.object({
  state: z.string().min(2).max(2),
});

export function registerPriorAuthWorkflowRoutes(app: Express) {
  // Get workflow steps for authorization
  app.get("/api/prior-auth-workflow-steps/:authId", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const authId = parseInt(req.params.authId);
      const steps = await priorAuthWorkflowService.getWorkflowSteps(authId);
      
      res.json(steps);
    } catch (error) {
      console.error("Failed to get workflow steps:", error);
      res.status(500).json({ message: "Failed to get workflow steps" });
    }
  });

  // Get current step for authorization
  app.get("/api/prior-auth-current-step/:authId", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const authId = parseInt(req.params.authId);
      const currentStep = await priorAuthWorkflowService.getCurrentStep(authId);
      
      if (!currentStep) {
        return res.status(404).json({ message: "Current step not found" });
      }
      
      res.json(currentStep);
    } catch (error) {
      console.error("Failed to get current step:", error);
      res.status(500).json({ message: "Failed to get current step" });
    }
  });

  // Complete workflow step
  app.post("/api/prior-auth-workflow-steps/:authId/:stepNumber/complete", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const authId = parseInt(req.params.authId);
      const stepNumber = parseInt(req.params.stepNumber);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validation = completeStepSchema.parse(req.body);
      
      await priorAuthWorkflowService.completeStep(
        authId,
        stepNumber,
        validation.formData,
        userId,
        validation.notes
      );
      
      res.json({ message: "Step completed successfully" });
    } catch (error) {
      console.error("Failed to complete step:", error);
      res.status(500).json({ message: "Failed to complete step" });
    }
  });

  // Initialize workflow for authorization
  app.post("/api/prior-auth-workflow/:authId/initialize", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const authId = parseInt(req.params.authId);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await priorAuthWorkflowService.initializeWorkflow(authId, userId);
      
      res.json({ message: "Workflow initialized successfully" });
    } catch (error) {
      console.error("Failed to initialize workflow:", error);
      res.status(500).json({ message: "Failed to initialize workflow" });
    }
  });

  // Generate state-specific form package
  app.post("/api/prior-auth-generate-forms/:authId", async (req, res) => {
    try {
      const authId = parseInt(req.params.authId);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validation = generateFormsSchema.parse(req.body);
      
      const formPackagePath = await priorAuthWorkflowService.generateFormPackage(
        authId,
        validation.state
      );
      
      // Log form generation
      await auditService.logPriorAuthActivity(
        userId,
        authId,
        'FORMS_GENERATED',
        'form_generation',
        null,
        { state: validation.state, formPackagePath },
        req.ip,
        req.get('User-Agent') || ''
      );
      
      res.json({ 
        message: "Form package generated successfully",
        formPackagePath 
      });
    } catch (error) {
      console.error("Failed to generate forms:", error);
      res.status(500).json({ message: "Failed to generate forms" });
    }
  });

  // Get procedure codes with search
  app.get("/api/procedure-codes", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { search, category, limit = 50 } = req.query;
      
      let procedures;
      if (search) {
        procedures = await procedureCodeService.searchProcedureCodes(
          search as string,
          category as string | undefined
        );
      } else if (category) {
        procedures = await procedureCodeService.getProceduresByCategory(category as string);
      } else {
        procedures = await storage.getProcedureCodes(parseInt(limit as string));
      }
      
      await auditService.log(req.user!.id, 'PROCEDURE_CODES_ACCESS', 'procedure_code', null, {
        search: search as string,
        category: category as string,
        limit: parseInt(limit as string),
        resultsCount: procedures.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(procedures);
    } catch (error) {
      console.error("Failed to get procedure codes:", error);
      res.status(500).json({ message: "Failed to get procedure codes" });
    }
  });

  // Get procedure categories
  app.get("/api/procedure-categories", authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const categories = await procedureCodeService.getProcedureCategories();
      
      await auditService.log(req.user!.id, 'PROCEDURE_CATEGORIES_ACCESS', 'procedure_code', null, {
        categoriesCount: categories.length,
      }, req.ip || '', req.get("User-Agent") || '');
      
      res.json(categories);
    } catch (error) {
      console.error("Failed to get procedure categories:", error);
      res.status(500).json({ message: "Failed to get procedure categories" });
    }
  });

  // Check if procedure requires prior auth
  app.get("/api/procedure-codes/:cptCode/prior-auth", async (req, res) => {
    try {
      const cptCode = req.params.cptCode;
      const requiresAuth = await procedureCodeService.requiresPriorAuth(cptCode);
      
      res.json({ 
        cptCode,
        requiresPriorAuth: requiresAuth 
      });
    } catch (error) {
      console.error("Failed to check prior auth requirement:", error);
      res.status(500).json({ message: "Failed to check prior auth requirement" });
    }
  });

  // Add custom procedure code
  app.post("/api/procedure-codes", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user has admin role
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const procedureData = req.body;
      const newProcedure = await procedureCodeService.addCustomProcedure(procedureData, userId);
      
      res.status(201).json(newProcedure);
    } catch (error) {
      console.error("Failed to add procedure code:", error);
      res.status(500).json({ message: "Failed to add procedure code" });
    }
  });
}
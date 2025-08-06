import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertInsuranceProviderSchema } from "@shared/schema";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { auditService } from "../services/audit";

const router = Router();

// Get all insurance providers
router.get("/providers", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const providers = await storage.getInsuranceProviders();
    
    await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_LIST', 'insurance_provider', null, {
      providerCount: providers.length,
    }, req.ip || '', req.get("User-Agent") || '');
    
    res.json(providers);
  } catch (error) {
    console.error("Error fetching insurance providers:", error);
    res.status(500).json({ message: "Failed to fetch insurance providers" });
  }
});

// Get single insurance provider
router.get("/providers/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid provider ID" });
    }

    const provider = await storage.getInsuranceProvider(id);
    if (!provider) {
      return res.status(404).json({ message: "Insurance provider not found" });
    }

    await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_VIEW', 'insurance_provider', id, {
      providerName: provider.name,
      providerCode: provider.code,
    }, req.ip || '', req.get("User-Agent") || '');

    res.json(provider);
  } catch (error) {
    console.error("Error fetching insurance provider:", error);
    res.status(500).json({ message: "Failed to fetch insurance provider" });
  }
});

// Create insurance provider
router.post("/providers", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Only admin can create insurance providers
    if (req.user?.role !== "admin") {
      await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_CREATE_DENIED', 'insurance_provider', null, {
        reason: 'Insufficient permissions',
        userRole: req.user?.role,
      }, req.ip || '', req.get("User-Agent") || '');
      
      return res.status(403).json({ message: "Admin access required" });
    }

    const validatedData = insertInsuranceProviderSchema.parse(req.body);
    const provider = await storage.createInsuranceProvider(validatedData);
    
    await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_CREATE', 'insurance_provider', provider.id, {
      providerName: provider.name,
      providerCode: provider.code,
      contactInfo: provider.contactInfo,
      priorAuthSteps: provider.priorAuthSteps,
    }, req.ip || '', req.get("User-Agent") || '');
    
    res.status(201).json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Error creating insurance provider:", error);
    res.status(500).json({ message: "Failed to create insurance provider" });
  }
});

// Update insurance provider
router.put("/providers/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Only admin can update insurance providers
    if (req.user?.role !== "admin") {
      await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_UPDATE_DENIED', 'insurance_provider', parseInt(req.params.id), {
        reason: 'Insufficient permissions',
        userRole: req.user?.role,
      }, req.ip || '', req.get("User-Agent") || '');
      
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid provider ID" });
    }

    const existingProvider = await storage.getInsuranceProvider(id);
    if (!existingProvider) {
      return res.status(404).json({ message: "Insurance provider not found" });
    }

    const validatedData = insertInsuranceProviderSchema.partial().parse(req.body);
    const updatedProvider = await storage.updateInsuranceProvider(id, validatedData);
    
    if (!updatedProvider) {
      return res.status(404).json({ message: "Failed to update insurance provider" });
    }

    await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_UPDATE', 'insurance_provider', id, {
      changes: validatedData,
      previousData: {
        name: existingProvider.name,
        code: existingProvider.code,
        contactInfo: existingProvider.contactInfo,
      },
      newData: {
        name: updatedProvider.name,
        code: updatedProvider.code,
        contactInfo: updatedProvider.contactInfo,
      },
    }, req.ip || '', req.get("User-Agent") || '');

    res.json(updatedProvider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Error updating insurance provider:", error);
    res.status(500).json({ message: "Failed to update insurance provider" });
  }
});

// Delete insurance provider (soft delete)
router.delete("/providers/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Only admin can delete insurance providers
    if (req.user?.role !== "admin") {
      await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_DELETE_DENIED', 'insurance_provider', parseInt(req.params.id), {
        reason: 'Insufficient permissions',
        userRole: req.user?.role,
      }, req.ip || '', req.get("User-Agent") || '');
      
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid provider ID" });
    }

    const existingProvider = await storage.getInsuranceProvider(id);
    if (!existingProvider) {
      return res.status(404).json({ message: "Insurance provider not found" });
    }

    const success = await storage.deleteInsuranceProvider(id);
    if (!success) {
      return res.status(500).json({ message: "Failed to delete insurance provider" });
    }

    await auditService.log(req.user!.id, 'INSURANCE_PROVIDER_DELETE', 'insurance_provider', id, {
      deletedProvider: {
        name: existingProvider.name,
        code: existingProvider.code,
        contactInfo: existingProvider.contactInfo,
      },
    }, req.ip || '', req.get("User-Agent") || '');

    res.json({ message: "Insurance provider deleted successfully" });
  } catch (error) {
    console.error("Error deleting insurance provider:", error);
    res.status(500).json({ message: "Failed to delete insurance provider" });
  }
});

export default router;
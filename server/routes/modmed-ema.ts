import { Router } from "express";
import { z } from "zod";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { auditService } from "../services/audit";
import { storage } from "../storage";
import { nanoid } from "nanoid";

const router = Router();

// Validation schemas
const emaCredentialsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  baseUrl: z.string().url("Valid base URL is required"),
  environment: z.enum(["production", "sandbox"])
});

const importPatientsSchema = z.object({
  patientIds: z.array(z.string()).min(1, "At least one patient ID is required"),
  baseUrl: z.string().url("Valid base URL is required")
});

// ModMed EMA OAuth2 Authentication
router.post("/authenticate", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const credentials = emaCredentialsSchema.parse(req.body);
    
    // OAuth2 authentication with ModMed EMA
    const authUrl = credentials.environment === 'production' 
      ? 'https://auth-exscribe-prod-fhir.ema-api.com/core/oauth2/token'
      : 'https://auth-exscribe-sandbox-fhir.ema-api.com/core/oauth2/token';

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'patient/*.read practitioner/*.read organization/*.read'
      }).toString()
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('ModMed EMA authentication failed:', errorText);
      
      await auditService.log(req.user!.id, 'MODMED_EMA_AUTH_FAILED', 'system', null, {
        environment: credentials.environment,
        error: errorText
      }, req.ip || '', req.get("User-Agent") || '');
      
      return res.status(401).json({ 
        message: "ModMed EMA authentication failed", 
        details: errorText 
      });
    }

    const authData = await authResponse.json();
    
    await auditService.log(req.user!.id, 'MODMED_EMA_AUTH_SUCCESS', 'system', null, {
      environment: credentials.environment,
      baseUrl: credentials.baseUrl,
      tokenExpiry: authData.expires_in
    }, req.ip || '', req.get("User-Agent") || '');

    res.json({
      access_token: authData.access_token,
      token_type: authData.token_type,
      expires_in: authData.expires_in,
      scope: authData.scope
    });

  } catch (error: any) {
    console.error('ModMed EMA authentication error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid credentials format", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Authentication failed", 
      error: error.message 
    });
  }
});

// Fetch FHIR metadata to test connection
router.get("/metadata", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const emaToken = req.get('EMA-Token');
    if (!emaToken) {
      return res.status(401).json({ message: "EMA token required" });
    }

    // Default to production metadata endpoint
    const metadataUrl = 'https://exscribe-prod-fhir.ema-api.com/fhir/modmed/root/r4/metadata';
    
    const metadataResponse = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${emaToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('ModMed EMA metadata fetch failed:', errorText);
      return res.status(metadataResponse.status).json({ 
        message: "Failed to fetch metadata", 
        details: errorText 
      });
    }

    const metadata = await metadataResponse.json();
    
    await auditService.log(req.user!.id, 'MODMED_EMA_METADATA_FETCH', 'system', null, {
      metadataVersion: metadata.fhirVersion,
      implementation: metadata.implementation?.description
    }, req.ip || '', req.get("User-Agent") || '');

    res.json(metadata);

  } catch (error: any) {
    console.error('ModMed EMA metadata error:', error);
    res.status(500).json({ 
      message: "Failed to fetch metadata", 
      error: error.message 
    });
  }
});

// Fetch patients from ModMed EMA FHIR API
router.get("/patients", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const emaToken = req.get('EMA-Token');
    if (!emaToken) {
      return res.status(401).json({ message: "EMA token required" });
    }

    // Fetch patients with pagination support
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const patientsUrl = `https://exscribe-prod-fhir.ema-api.com/fhir/modmed/root/r4/Patient?_count=${limit}&_offset=${offset}`;
    
    const patientsResponse = await fetch(patientsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${emaToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    if (!patientsResponse.ok) {
      const errorText = await patientsResponse.text();
      console.error('ModMed EMA patients fetch failed:', errorText);
      return res.status(patientsResponse.status).json({ 
        message: "Failed to fetch patients", 
        details: errorText 
      });
    }

    const patientsBundle = await patientsResponse.json();
    const patients = patientsBundle.entry?.map((entry: any) => entry.resource) || [];
    
    await auditService.log(req.user!.id, 'MODMED_EMA_PATIENTS_FETCH', 'system', null, {
      patientsCount: patients.length,
      totalResults: patientsBundle.total
    }, req.ip || '', req.get("User-Agent") || '');

    res.json({
      patients,
      total: patientsBundle.total,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('ModMed EMA patients fetch error:', error);
    res.status(500).json({ 
      message: "Failed to fetch patients", 
      error: error.message 
    });
  }
});

// Import selected patients from ModMed EMA to MedAuth Pro
router.post("/import-patients", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const emaToken = req.get('EMA-Token');
    if (!emaToken) {
      return res.status(401).json({ message: "EMA token required" });
    }

    const { patientIds, baseUrl } = importPatientsSchema.parse(req.body);
    
    let recordsImported = 0;
    let recordsUpdated = 0;
    let errors: string[] = [];
    const importedPatients: any[] = [];

    for (const patientId of patientIds) {
      try {
        // Fetch detailed patient data from ModMed EMA
        const patientUrl = `${baseUrl}/Patient/${patientId}`;
        const patientResponse = await fetch(patientUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${emaToken}`,
            'Accept': 'application/fhir+json'
          }
        });

        if (!patientResponse.ok) {
          errors.push(`Failed to fetch patient ${patientId}: ${patientResponse.statusText}`);
          continue;
        }

        const fhirPatient = await patientResponse.json();
        
        // Convert FHIR patient to MedAuth Pro format
        const medAuthPatient = {
          patientId: nanoid(),
          firstName: fhirPatient.name?.[0]?.given?.[0] || 'Unknown',
          lastName: fhirPatient.name?.[0]?.family || 'Unknown',
          dateOfBirth: new Date(fhirPatient.birthDate || '1900-01-01'),
          gender: fhirPatient.gender || null,
          phone: fhirPatient.telecom?.find((t: any) => t.system === 'phone')?.value || null,
          email: fhirPatient.telecom?.find((t: any) => t.system === 'email')?.value || null,
          address: fhirPatient.address?.[0] ? [
            fhirPatient.address[0].line?.join(' '),
            fhirPatient.address[0].city,
            fhirPatient.address[0].state,
            fhirPatient.address[0].postalCode
          ].filter(Boolean).join(', ') : null,
          city: fhirPatient.address?.[0]?.city || null,
          state: fhirPatient.address?.[0]?.state || null,
          zipCode: fhirPatient.address?.[0]?.postalCode || null,
          race: fhirPatient.extension?.find((e: any) => 
            e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
          )?.extension?.[0]?.valueCoding?.display || null,
          ethnicity: fhirPatient.extension?.find((e: any) => 
            e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
          )?.extension?.[0]?.valueCoding?.display || null,
          sourceSystem: 'ModMed EMA',
          lastImportDate: new Date()
        };

        // Check for existing patient by name and DOB
        const existingPatient = await storage.getPatientByName(
          medAuthPatient.firstName,
          medAuthPatient.lastName,
          medAuthPatient.dateOfBirth
        );

        if (existingPatient) {
          // Update existing patient
          await storage.updatePatient(existingPatient.id, medAuthPatient);
          recordsUpdated++;
          
          await auditService.log(req.user!.id, 'MODMED_EMA_PATIENT_UPDATE', 'patient', existingPatient.id, {
            fhirPatientId: patientId,
            patientName: `${medAuthPatient.firstName} ${medAuthPatient.lastName}`,
            sourceSystem: 'ModMed EMA'
          }, req.ip || '', req.get("User-Agent") || '', existingPatient, medAuthPatient);
        } else {
          // Create new patient
          const newPatient = await storage.createPatient(medAuthPatient);
          recordsImported++;
          importedPatients.push(newPatient);
          
          await auditService.log(req.user!.id, 'MODMED_EMA_PATIENT_CREATE', 'patient', newPatient.id, {
            fhirPatientId: patientId,
            patientName: `${medAuthPatient.firstName} ${medAuthPatient.lastName}`,
            sourceSystem: 'ModMed EMA'
          }, req.ip || '', req.get("User-Agent") || '', null, newPatient);
        }

      } catch (patientError: any) {
        console.error(`Error importing patient ${patientId}:`, patientError);
        errors.push(`Patient ${patientId}: ${patientError.message}`);
      }
    }

    await auditService.log(req.user!.id, 'MODMED_EMA_IMPORT_COMPLETE', 'system', null, {
      totalRequested: patientIds.length,
      recordsImported,
      recordsUpdated,
      errorCount: errors.length,
      sourceSystem: 'ModMed EMA'
    }, req.ip || '', req.get("User-Agent") || '');

    res.json({
      recordsProcessed: patientIds.length,
      recordsImported,
      recordsUpdated,
      errors: errors.length,
      errorDetails: errors,
      patients: importedPatients
    });

  } catch (error: any) {
    console.error('ModMed EMA import error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid import request", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Import failed", 
      error: error.message 
    });
  }
});

export default router;
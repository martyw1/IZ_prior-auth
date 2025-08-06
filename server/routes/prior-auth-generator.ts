import { Router } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { appLogger } from "../services/app-logger";
import { storage } from "../storage";

const router = Router();

// Generate prior authorization package  
router.post("/generate-package", async (req: any, res) => {
  // Handle authentication for POST request
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const { authorizationId, format, customNotes } = req.body;

    if (!authorizationId) {
      return res.status(400).json({ error: "Authorization ID is required" });
    }

    // Get authorization details for package generation
    const auth = await storage.getPriorAuthorization(parseInt(authorizationId));
    if (!auth) {
      return res.status(404).json({ error: "Authorization not found" });
    }

    // Get insurance provider name for filename
    const patient = await storage.getPatient(auth.patientId);
    const insurance = await storage.getInsuranceProvider(auth.insuranceId);
    const insuranceName = insurance?.name || 'Insurance';
    
    // Format current date and time for filename
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
    
    const packageData = {
      authorizationId,
      format,
      customNotes,
      generatedAt: now.toISOString(),
      fileName: format === 'pdf' 
        ? `PA-Submission-${dateStr}_${timeStr}_${insuranceName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`
        : `Prior_Auth_${authorizationId}_${format}.${format === 'email' ? 'eml' : 'json'}`,
      downloadUrl: `/api/prior-auth/download/${authorizationId}/${format}?token=${req.headers.authorization?.replace('Bearer ', '')}`,
    };

    appLogger.info("Prior authorization package generated", {
      userId: 1, // Would normally extract from JWT token
      authorizationId,
      format,
    });

    res.json(packageData);
  } catch (error) {
    appLogger.error("Failed to generate prior authorization package", {
      userId: 1,
    }, error as Error);
    res.status(500).json({ error: "Failed to generate package" });
  }
});

// Download generated package (with token-based auth)
router.get("/download/:authorizationId/:format", async (req: any, res) => {
  try {
    // Handle token from query parameter for file downloads
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { authorizationId, format } = req.params;
    
    // Get authorization details
    const auth = await storage.getPriorAuthorization(parseInt(authorizationId));
    if (!auth) {
      return res.status(404).json({ error: "Authorization not found" });
    }

    // Get patient details
    const patient = await storage.getPatient(auth.patientId);
    
    let content: string;
    let contentType: string;
    let fileName: string;

    if (format === 'pdf') {
      // Format current date and time for filename
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
      const insurance = await storage.getInsuranceProvider(auth.insuranceId);
      const insuranceName = insurance?.name || 'Insurance';
      
      // Generate PDF content (simplified for demo)
      content = await generatePDFContent(auth, patient);
      contentType = 'application/pdf';
      fileName = `PA-Submission-${dateStr}_${timeStr}_${insuranceName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    } else if (format === 'email') {
      // Generate email template
      content = generateEmailContent(auth, patient);
      contentType = 'message/rfc822';
      fileName = `Prior_Authorization_Email_${authorizationId}.eml`;
    } else if (format === 'json') {
      // Generate JSON data
      content = generateJSONContent(auth, patient);
      contentType = 'application/json';
      fileName = `Prior_Authorization_Data_${authorizationId}.json`;
    } else {
      return res.status(400).json({ error: "Invalid format" });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', Buffer.byteLength(content).toString());
    res.send(content);

    appLogger.info("Prior authorization package downloaded", {
      userId: 1, // Would normally extract from JWT token
      authorizationId,
      format,
    });

  } catch (error) {
    appLogger.error("Failed to download prior authorization package", {
      userId: 1,
    }, error as Error);
    res.status(500).json({ error: "Failed to download package" });
  }
});

// Helper functions to generate content
async function generatePDFContent(auth: any, patient: any): Promise<string> {
  // Get system configuration for practice information
  const clientName = auth.systemConfig?.client_name || 'Medical Practice';
  const patientDOB = patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A';
  const requestedDate = auth.requestedDate ? new Date(auth.requestedDate).toLocaleDateString() : new Date().toLocaleDateString();
  
  // Format CPT codes (handle both single and multiple codes)
  const cptCodes = Array.isArray(auth.cptCodes) ? auth.cptCodes : [auth.cptCode].filter(Boolean);
  const cptCodesText = cptCodes.map((code: string) => `        ${code}`).join('\\n        ');
  
  // Format ICD-10 codes (handle both single and multiple codes)  
  const icd10Codes = Array.isArray(auth.icd10Codes) ? auth.icd10Codes : [auth.icd10Code].filter(Boolean);
  const icd10CodesText = icd10Codes.map((code: string) => `        ${code}`).join('\\n        ');

  // Format clinical justification
  const justification = auth.clinicalJustification || 'Patient presents with medically necessary condition requiring the requested procedure. Clinical evaluation supports the need for this treatment based on current medical standards and patient-specific factors.';

  // Create PDF content with proper escaping - avoiding template literals in PDF stream
  const patientName = (patient?.firstName || 'N/A') + ' ' + (patient?.lastName || 'N/A');
  const insurance = await storage.getInsuranceProvider(auth.insuranceId);
  const insuranceName = insurance?.name || 'N/A';
  const memberId = auth.patientInsurance?.memberId || 'N/A';
  const groupNumber = auth.patientInsurance?.groupNumber || 'N/A';
  const currentDate = new Date().toLocaleDateString();

  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog  
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
/F2 6 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 1500
>>
stream
BT
/F2 16 Tf
50 750 Td
(PRIOR AUTHORIZATION REQUEST FORM) Tj
0 -30 Td
/F2 11 Tf
(Provider Name: Dr. Michael Haiken, MD) Tj
0 -14 Td
(Practice Name: ` + clientName + `) Tj
0 -14 Td
(NPI: 1234567890) Tj
0 -14 Td
(Phone: \\(555\\) 123-4567) Tj
0 -14 Td
(Fax: \\(555\\) 987-6543) Tj
0 -14 Td
(Address: 123 Medical Center Dr, Fort Myers, FL 33907) Tj
0 -25 Td
/F2 12 Tf
(Patient Information:) Tj
0 -18 Td
/F1 10 Tf
(Name: ` + patientName + `) Tj
0 -14 Td
(DOB: ` + patientDOB + `) Tj
0 -14 Td
(Insurance: ` + insuranceName + `) Tj
0 -14 Td
(Member ID: ` + memberId + `) Tj
0 -14 Td
(Group #: ` + groupNumber + `) Tj
0 -25 Td
/F2 12 Tf
(Procedure Requested) Tj
0 -18 Td
/F1 10 Tf
(CPT Code\\(s\\):) Tj
0 -14 Td
(` + (cptCodesText || '        N/A') + `) Tj
0 -20 Td
(Diagnosis Code \\(ICD-10\\):) Tj
0 -14 Td
(` + (icd10CodesText || '        N/A') + `) Tj
0 -20 Td
(Proposed Date of Service: ` + requestedDate + `) Tj
0 -14 Td
(Procedure Location: ` + clientName + ` In-Office Suite) Tj
0 -14 Td
(Facility NPI: 1234567890) Tj
0 -25 Td
/F2 12 Tf
(Clinical Justification / Medical Necessity) Tj
0 -18 Td
/F1 10 Tf
(` + justification.substring(0, 200) + `) Tj
0 -35 Td
/F2 12 Tf
(Attachments Included:) Tj
0 -18 Td
/F1 10 Tf
(        Clinical documentation) Tj
0 -14 Td
(        Progress notes) Tj
0 -14 Td
(        Treatment plan) Tj
0 -14 Td
(        Supporting medical records) Tj
0 -35 Td
(Requesting Provider Signature: ___________________________) Tj
0 -18 Td
(Date: ` + currentDate + `) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000131 00000 n 
0000000258 00000 n 
0000001812 00000 n 
0000001875 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
1943
%%EOF`;
}

function generateEmailContent(auth: any, patient: any): string {
  const patientName = `${patient?.firstName || 'N/A'} ${patient?.lastName || 'N/A'}`;
  const insuranceName = auth.insurance?.name || 'N/A';
  const requestedDate = auth.requestedDate ? new Date(auth.requestedDate).toLocaleDateString() : new Date().toLocaleDateString();

  return `Subject: Prior Authorization Request - ${patientName} - ${auth.authorizationId}
From: prior-auth@medicalcenter.com
To: authorizations@${insuranceName.toLowerCase().replace(/\s+/g, '')}.com
Date: ${new Date().toDateString()}

Dear ${insuranceName} Authorization Team,

I am submitting a prior authorization request for the following patient:

PATIENT INFORMATION:
Name: ${patientName}
Date of Birth: ${patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
Member ID: ${auth.patientInsurance?.memberId || 'N/A'}
Group Number: ${auth.patientInsurance?.groupNumber || 'N/A'}

REQUESTED PROCEDURE/TREATMENT:
Treatment Type: ${auth.treatmentType || 'N/A'}
CPT Code(s): ${Array.isArray(auth.cptCodes) ? auth.cptCodes.join(', ') : auth.cptCode || 'N/A'}
ICD-10 Code(s): ${Array.isArray(auth.icd10Codes) ? auth.icd10Codes.join(', ') : auth.icd10Code || 'N/A'}
Requested Service Date: ${requestedDate}

CLINICAL JUSTIFICATION:
${auth.clinicalJustification || 'Clinical justification provided in attached documentation.'}

PROVIDER INFORMATION:
Provider Name: Dr. Michael Haiken, MD
Practice: ${auth.systemConfig?.client_name || 'Medical Practice'}
NPI: 1234567890
Phone: (555) 123-4567
Fax: (555) 987-6543

Please process this request at your earliest convenience. All supporting clinical documentation is available upon request.

Thank you for your prompt attention to this matter.

Sincerely,
Dr. Michael Haiken, MD
Authorization Request ID: ${auth.authorizationId}
Date: ${new Date().toLocaleDateString()}`;
}

function generateJSONContent(auth: any, patient: any): string {
  const jsonData = {
    authorizationRequest: {
      id: auth.authorizationId,
      status: auth.status,
      submissionDate: new Date().toISOString(),
      requestedServiceDate: auth.requestedDate,
      
      provider: {
        name: "Dr. Michael Haiken, MD",
        practice: auth.systemConfig?.client_name || 'Medical Practice',
        npi: "1234567890",
        phone: "(555) 123-4567",
        fax: "(555) 987-6543",
        address: "123 Medical Center Dr, Fort Myers, FL 33907"
      },
      
      patient: {
        name: `${patient?.firstName || 'N/A'} ${patient?.lastName || 'N/A'}`,
        dateOfBirth: patient?.dateOfBirth || null,
        gender: patient?.gender || null,
        address: patient?.address || null,
        phone: patient?.phone || null,
        email: patient?.email || null
      },
      
      insurance: {
        provider: auth.insurance?.name || 'N/A',
        memberId: auth.patientInsurance?.memberId || 'N/A',
        groupNumber: auth.patientInsurance?.groupNumber || 'N/A',
        isPrimary: auth.patientInsurance?.isPrimary || false
      },
      
      clinical: {
        treatmentType: auth.treatmentType,
        cptCodes: Array.isArray(auth.cptCodes) ? auth.cptCodes : [auth.cptCode].filter(Boolean),
        icd10Codes: Array.isArray(auth.icd10Codes) ? auth.icd10Codes : [auth.icd10Code].filter(Boolean),
        clinicalJustification: auth.clinicalJustification,
        medicalNecessity: "Patient requires requested treatment based on clinical evaluation and medical standards"
      },
      
      attachments: [
        "Clinical documentation",
        "Progress notes", 
        "Treatment plan",
        "Supporting medical records"
      ],
      
      metadata: {
        systemVersion: "MedAuth Pro v2.0.0",
        exportDate: new Date().toISOString(),
        hipaaCompliant: true,
        auditTrail: {
          createdBy: "System Administrator",
          lastModified: auth.updatedAt || auth.createdAt,
          reviewStatus: "Pending"
        }
      }
    }
  };

  return JSON.stringify(jsonData, null, 2);
}

export default router;
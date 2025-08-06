import { storage } from "../storage";
import { InsertAuditLog } from "@shared/schema";

class AuditService {
  // Enhanced audit logging with before/after data tracking for medical/legal compliance
  async log(
    userId: number,
    action: string,
    resourceType: string,
    resourceId: number | null,
    details: any = {},
    ipAddress: string = '',
    userAgent: string = '',
    beforeData: any = null,
    afterData: any = null
  ): Promise<void> {
    try {
      // Calculate field-by-field changes for detailed audit trail
      const fieldChanges = this.calculateFieldChanges(beforeData, afterData);
      
      const auditLog: InsertAuditLog = {
        userId,
        action,
        resourceType,
        resourceId,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          actionDescription: this.getActionDescription(action, resourceType),
        },
        beforeData,
        afterData,
        fieldChanges,
        ipAddress,
        userAgent,
      };

      await storage.createAuditLog(auditLog);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging failures shouldn't break the main operation
    }
  }

  // Calculate detailed field changes for compliance tracking
  private calculateFieldChanges(beforeData: any, afterData: any): any {
    if (!beforeData && !afterData) return null;
    if (!beforeData) return { type: 'CREATE', newFields: Object.keys(afterData || {}) };
    if (!afterData) return { type: 'DELETE', removedFields: Object.keys(beforeData) };

    const changes: any = { type: 'UPDATE', modifiedFields: {} };
    
    // Track all field changes
    const beforeKeys = Object.keys(beforeData);
    const afterKeys = Object.keys(afterData);
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));
    
    for (const key of allKeys) {
      const oldValue = beforeData[key];
      const newValue = afterData[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.modifiedFields[key] = {
          oldValue,
          newValue,
          changeType: oldValue === undefined ? 'ADDED' : 
                     newValue === undefined ? 'REMOVED' : 'MODIFIED'
        };
      }
    }

    return Object.keys(changes.modifiedFields).length > 0 ? changes : null;
  }

  private getActionDescription(action: string, resourceType: string): string {
    const actionMap: Record<string, string> = {
      'CREATE': `Created new ${resourceType}`,
      'UPDATE': `Updated ${resourceType}`,
      'DELETE': `Deleted ${resourceType}`,
      'VIEW': `Viewed ${resourceType}`,
      'DOWNLOAD': `Downloaded ${resourceType}`,
      'EXPORT': `Exported ${resourceType} data`,
      'LOGIN_SUCCESS': 'Successful login',
      'LOGIN_FAILURE': 'Failed login attempt',
      'LOGOUT': 'User logged out',
    };
    
    return actionMap[action] || `${action} on ${resourceType}`;
  }

  // Enhanced PHI access logging with data tracking
  async logPatientAccess(userId: number, patientId: number, action: string, beforeData: any, afterData: any, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, action, 'patient', patientId, {
      type: 'PHI_ACCESS',
      action,
      patientId,
      complianceNote: 'HIPAA-tracked PHI access',
    }, beforeData, afterData, ipAddress, userAgent);
  }

  // Enhanced data modification logging
  async logDataModification(userId: number, resourceType: string, resourceId: number, action: string, beforeData: any, afterData: any, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, action, resourceType, resourceId, {
      type: 'DATA_MODIFICATION',
      modificationReason: 'User data entry/update',
      medicalRecordUpdate: resourceType.includes('patient') || resourceType.includes('authorization'),
    }, beforeData, afterData, ipAddress, userAgent);
  }

  // Prior authorization specific logging
  async logPriorAuthActivity(userId: number, authId: number, action: string, step: string, beforeData: any, afterData: any, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, action, 'prior_authorization', authId, {
      type: 'PRIOR_AUTH_WORKFLOW',
      workflowStep: step,
      action,
      medicalNecessity: true,
    }, beforeData, afterData, ipAddress, userAgent);
  }

  async logAuthorizationAccess(userId: number, authId: number, action: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, action, 'authorization', authId, {
      type: 'AUTHORIZATION_ACCESS',
      action,
    }, ipAddress, userAgent);
  }

  async logDocumentAccess(userId: number, documentId: number, action: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, action, 'document', documentId, {
      type: 'DOCUMENT_ACCESS',
      action,
    }, ipAddress, userAgent);
  }

  async logLogin(userId: number, success: boolean, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE', 'user', userId, {
      type: 'AUTHENTICATION',
      success,
    }, ipAddress, userAgent);
  }

  async logLogout(userId: number, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, 'LOGOUT', 'user', userId, {
      type: 'AUTHENTICATION',
    }, ipAddress, userAgent);
  }

  async logDataExport(userId: number, resourceType: string, resourceId: number, ipAddress: string, userAgent: string): Promise<void> {
    await this.log(userId, 'DATA_EXPORT', resourceType, resourceId, {
      type: 'DATA_EXPORT',
      exportedAt: new Date().toISOString(),
    }, ipAddress, userAgent);
  }

  async getAuditReport(startDate: Date, endDate: Date, resourceType?: string, userId?: number) {
    const logs = await storage.getAuditLogs(1000, 0);
    
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const inDateRange = logDate >= startDate && logDate <= endDate;
      const matchesResourceType = !resourceType || log.resourceType === resourceType;
      const matchesUser = !userId || log.userId === userId;
      
      return inDateRange && matchesResourceType && matchesUser;
    });
  }
}

export const auditService = new AuditService();

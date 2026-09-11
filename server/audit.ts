import { AuditLog, UserRole } from '../src/types/index';
import crypto from 'crypto';

// Mock database for audit logs
let auditLogs: AuditLog[] = [];

/**
 * Professional Clinical Audit Logger
 * Records every significant action in the system for HIPAA/Compliance.
 */
export const logAuditAction = (
  userId: string,
  userEmail: string,
  userRole: UserRole,
  action: string,
  module: string,
  recordId?: string,
  details?: string
) => {
  const newLog: AuditLog = {
    id: `aud_${crypto.randomUUID().slice(0, 8)}`,
    user_id: userId,
    user_email: userEmail,
    user_role: userRole,
    action,
    module,
    record_id: recordId,
    details: details || `User ${userEmail} performed ${action} on ${module}.`,
    timestamp: new Date().toISOString(),
  };

  auditLogs.unshift(newLog);
  console.log(`[AUDIT] ${newLog.timestamp} | ${userEmail} (${userRole}) | ${action} | ${module}`);
  
  return newLog;
};

export const getAuditLogs = () => auditLogs;

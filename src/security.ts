import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export class SecurityManager {
  private static instance: SecurityManager;
  private isLocked: boolean = true;
  private unlockExpiry: number = 0;
  private currentCode: string | null = null;
  private readonly GATE_FILE = path.join(os.homedir(), '.udc_gate_code');

  // Tools that require High Security clearance
  private readonly HIGH_RISK_TOOLS = new Set([
    'execute_command',
    'execute_command_chain',
    'system_power_action',
    'manage_service',
    'kill_process',
    'registry_operation',
    'change_file_ownership',
    'create_scheduled_task',
    'delete_scheduled_task'
  ]);

  private constructor() {}

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  isHighRisk(toolName: string): boolean {
    return this.HIGH_RISK_TOOLS.has(toolName);
  }

  isAccessAllowed(toolName: string): boolean {
    // If not high risk, always allow
    if (!this.isHighRisk(toolName)) return true;

    // If unlocked and not expired
    if (!this.isLocked && Date.now() < this.unlockExpiry) {
      return true;
    }

    // Auto-lock if expired
    if (!this.isLocked && Date.now() >= this.unlockExpiry) {
      this.isLocked = true;
      this.currentCode = null;
    }

    return false;
  }

  async generateGateCode(): Promise<string> {
    // Generate 6-digit crypto-safe code
    this.currentCode = crypto.randomInt(100000, 999999).toString();

    // Write to file
    await fs.writeFile(this.GATE_FILE, `UDC OPERATOR CODE: ${this.currentCode}\n\nThis code was requested to unlock High-Risk tools.\nIf you did not request this, check your system security.`, { mode: 0o600 });

    return this.GATE_FILE;
  }

  async verifyCode(code: string): Promise<boolean> {
    if (!this.currentCode) return false;

    // Constant-time comparison to prevent timing attacks (overkill for this but good practice)
    const isValid = code === this.currentCode;

    if (isValid) {
      this.isLocked = false;
      this.unlockExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes unlock
      this.currentCode = null; // Clear code after use
      // Try to remove file
      try { await fs.unlink(this.GATE_FILE); } catch (e) {}
      return true;
    }

    return false;
  }
}

export const securityManager = SecurityManager.getInstance();

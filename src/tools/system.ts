import { execSync, spawnSync } from 'child_process';
import os from 'os';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { commandManager } from '../command-manager.js';
import { logToFile } from './filesystem.js';

// Enhanced execute command with admin privileges and environment variables
export async function executeCommandEnhanced(args: any) {
  const { command, timeout_ms = 30000, run_as_admin = false, environment = {} } = args;

  if (!commandManager.validateCommand(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  // Set up environment
  const env = { ...process.env, ...environment };

  try {
    let result;
    if (run_as_admin) {
      // Try to run with elevated privileges
      if (process.platform === 'win32') {
        // Windows: Use PowerShell Start-Process with -Verb RunAs
        const psCommand = `Start-Process -Verb RunAs -Wait -NoNewWindow -FilePath "cmd" -ArgumentList "/c ${command.replace(/"/g, '\\"')}"`;
        result = spawnSync('powershell', ['-Command', psCommand], {
          env: env,
          encoding: 'utf8',
          timeout: timeout_ms
        });
      } else {
        // macOS/Linux: Use sudo
        const sudoCommand = `sudo ${command}`;
        result = spawnSync('/bin/sh', ['-c', sudoCommand], {
          env: env,
          encoding: 'utf8',
          timeout: timeout_ms
        });
      }
    } else {
      // Normal execution
      result = spawnSync('/bin/sh', ['-c', command], {
        env: env,
        encoding: 'utf8',
        timeout: timeout_ms
      });
    }

    if (result.error) {
      throw result.error;
    }

    return {
      success: result.status === 0,
      output: result.stdout || result.stderr || '',
      exitCode: result.status || 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Command execution failed: ${errorMessage}`);
  }
}

// Execute multiple commands in sequence
export async function executeCommandChain(args: any) {
  const { commands, timeout_ms = 30000 } = args;
  const results = [];

  for (const command of commands) {
    if (!commandManager.validateCommand(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    try {
      const result = spawnSync('/bin/sh', ['-c', command], {
        encoding: 'utf8',
        timeout: timeout_ms
      });

      results.push({
        command,
        success: result.status === 0,
        output: result.stdout || result.stderr || '',
        exitCode: result.status || 0
      });

      if (result.status !== 0 && !command.startsWith('#')) {
        // Stop on first error unless command starts with # (comment)
        break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        command,
        success: false,
        output: `Error: ${errorMessage}`,
        exitCode: 1
      });
      break;
    }
  }

  return results;
}

// Set file permissions
export async function setFilePermissions(args: any) {
  const { path: filePath, permissions, recursive = false } = args;
  const validPath = await validatePath(filePath);

  try {
    if (recursive) {
      // Use command execution for recursive permissions
      if (process.platform === 'win32') {
        // Windows: icacls for recursive permissions
        const command = `icacls "${validPath}" /grant *S-1-1-0:(OI)(CI)F /T`;
        execSync(command, { encoding: 'utf8' });
      } else {
        // Unix: chmod -R
        const command = `chmod -R ${permissions} "${validPath}"`;
        execSync(command, { encoding: 'utf8' });
      }
    } else {
      // Direct API for single file
      const permNum = parseInt(permissions, 8);
      await fs.chmod(validPath, permNum);
    }

    return { success: true, message: `Permissions set to ${permissions} for ${validPath}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to set permissions: ${errorMessage}`);
  }
}

// Change file ownership
export async function changeFileOwnership(args: any) {
  const { path: filePath, user, group, recursive = false } = args;
  const validPath = await validatePath(filePath);

  if (process.platform === 'win32') {
    throw new Error('Changing file ownership is not supported on Windows');
  }

  try {
    let command = 'chown';
    if (user) command += ` ${user}`;
    if (group) command += `:${group}`;
    if (recursive) command += ' -R';
    command += ` "${validPath}"`;

    execSync(command, { encoding: 'utf8' });
    return { success: true, message: `Ownership changed for ${validPath}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to change ownership: ${errorMessage}`);
  }
}

// Create symbolic link
export async function createSymbolicLink(args: any) {
  const { target, linkPath, force = false } = args;
  const validTarget = await validatePath(target);
  const validLinkPath = await validatePath(linkPath);

  try {
    if (force && fsSync.existsSync(validLinkPath)) {
      await fs.unlink(validLinkPath);
    }

    await fs.symlink(validTarget, validLinkPath);
    return { success: true, message: `Symbolic link created: ${validLinkPath} -> ${validTarget}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create symbolic link: ${errorMessage}`);
  }
}

// Get comprehensive system information
export async function getSystemInfo() {
  const info: Record<string, any> = {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length,
    loadAvg: os.loadavg(),
    networkInterfaces: os.networkInterfaces(),
  };

  try {
    // Get additional system info using commands
    if (process.platform === 'win32') {
      // Windows system info
      const systemInfo = execSync('systeminfo', { encoding: 'utf8' });
      info.windowsSystemInfo = systemInfo;
    } else {
      // Unix system info
      const uname = execSync('uname -a', { encoding: 'utf8' });
      const df = execSync('df -h', { encoding: 'utf8' });
      const free = execSync('free -h', { encoding: 'utf8' });

      info.uname = uname.trim();
      info.diskUsage = df;
      info.memoryUsage = free;
    }
  } catch (error) {
    logToFile(`Error getting additional system info: ${error instanceof Error ? error.message : String(error)}`);
  }

  return info;
}

// Get network information
export async function getNetworkInfo() {
  const info: Record<string, any> = {
    interfaces: os.networkInterfaces(),
    hostname: os.hostname(),
  };

  try {
    if (process.platform === 'win32') {
      const ipconfig = execSync('ipconfig /all', { encoding: 'utf8' });
      info.ipconfig = ipconfig;
    } else {
      const ifconfig = execSync('ifconfig -a', { encoding: 'utf8' });
      const netstat = execSync('netstat -rn', { encoding: 'utf8' });

      info.ifconfig = ifconfig;
      info.routingTable = netstat;
    }
  } catch (error) {
    logToFile(`Error getting network info: ${error instanceof Error ? error.message : String(error)}`);
  }

  return info;
}

// Check if a port is open
export async function checkPort(args: any) {
  const { port, host = 'localhost' } = args;

  try {
    let command;
    if (process.platform === 'win32') {
      command = `Test-NetConnection -ComputerName ${host} -Port ${port} | Select-Object -ExpandProperty TcpTestSucceeded`;
      const result = execSync(`powershell -Command "${command}"`, { encoding: 'utf8' });
      return { open: result.trim() === 'True', port, host };
    } else {
      // Unix: use nc (netcat) or timeout with bash
      command = `timeout 1 bash -c "echo >/dev/tcp/${host}/${port}" 2>/dev/null && echo "open" || echo "closed"`;
      const result = execSync(command, { encoding: 'utf8' });
      return { open: result.trim() === 'open', port, host };
    }
  } catch (error) {
    return { open: false, port, host, error: error instanceof Error ? error.message : String(error) };
  }
}

// Scan network for active hosts (simplified)
export async function scanNetwork(args: any) {
  const { network, ports = [22, 80, 443, 3389] } = args;
  const results: Record<string, any> = { network, hosts: [] };

  // This is a simplified scan - in a real implementation, this would be more comprehensive
  // For security reasons, we'll implement a basic ping scan

  try {
    if (process.platform === 'win32') {
      // Windows: use ping
      const pingCommand = `ping -n 1 -w 100 ${network.split('/')[0]}`;
      const result = execSync(pingCommand, { encoding: 'utf8' });
      results.hosts.push({
        ip: network.split('/')[0],
        status: result.includes('Reply from') ? 'up' : 'down'
      });
    } else {
      // Unix: use ping
      const pingCommand = `ping -c 1 -W 1 ${network.split('/')[0]}`;
      const result = execSync(pingCommand, { encoding: 'utf8' });
      results.hosts.push({
        ip: network.split('/')[0],
        status: result.includes('1 received') ? 'up' : 'down'
      });
    }
  } catch (error) {
    results.hosts.push({
      ip: network.split('/')[0],
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

// List system services
export async function listServices(args: any) {
  const { filter = '' } = args;
  const services: any[] = [];

  try {
    if (process.platform === 'win32') {
      // Windows: use sc query
      const result = execSync('sc query state= all', { encoding: 'utf8' });
      const lines = result.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('SERVICE_NAME:')) {
          const name = lines[i].split(':')[1].trim();
          if (name.toLowerCase().includes(filter.toLowerCase())) {
            services.push({
              name,
              displayName: lines[i+1]?.split(':')[1]?.trim() || '',
              state: lines[i+2]?.split(':')[1]?.trim() || '',
              type: lines[i+3]?.split(':')[1]?.trim() || ''
            });
          }
        }
      }
    } else {
      // Unix: use systemctl or service command
      try {
        const result = execSync('systemctl list-units --type=service --no-pager', { encoding: 'utf8' });
        const lines = result.split('\n').slice(1); // Skip header

        for (const line of lines) {
          if (line.trim() && line.toLowerCase().includes(filter.toLowerCase())) {
            const parts = line.trim().split(/\s+/);
            services.push({
              name: parts[0],
              load: parts[1],
              active: parts[2],
              sub: parts[3],
              description: parts.slice(4).join(' ')
            });
          }
        }
      } catch (systemctlError) {
        // Fallback to service command
        const result = execSync('service --status-all', { encoding: 'utf8' });
        const lines = result.split('\n');

        for (const line of lines) {
          if (line.includes('[') && line.includes(']') && line.toLowerCase().includes(filter.toLowerCase())) {
            const match = line.match(/^\[\s*(\S+)\s*\]\s*(.+)$/);
            if (match) {
              services.push({
                name: match[1],
                status: match[2].includes('running') ? 'running' : 'stopped'
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logToFile(`Error listing services: ${error instanceof Error ? error.message : String(error)}`);
  }

  return services;
}

// Manage system services
export async function manageService(args: any) {
  const { serviceName, action } = args;

  try {
    let command, result;

    if (process.platform === 'win32') {
      // Windows service management
      switch (action) {
        case 'start':
          command = `net start "${serviceName}"`;
          break;
        case 'stop':
          command = `net stop "${serviceName}"`;
          break;
        case 'restart':
          command = `net stop "${serviceName}" && net start "${serviceName}"`;
          break;
        case 'enable':
          command = `sc config "${serviceName}" start= auto`;
          break;
        case 'disable':
          command = `sc config "${serviceName}" start= disabled`;
          break;
      }
    } else {
      // Unix service management
      switch (action) {
        case 'start':
          command = `sudo systemctl start ${serviceName}`;
          break;
        case 'stop':
          command = `sudo systemctl stop ${serviceName}`;
          break;
        case 'restart':
          command = `sudo systemctl restart ${serviceName}`;
          break;
        case 'enable':
          command = `sudo systemctl enable ${serviceName}`;
          break;
        case 'disable':
          command = `sudo systemctl disable ${serviceName}`;
          break;
      }
    }

    if (command) {
      result = execSync(command, { encoding: 'utf8' });
      return {
        success: true,
        message: `Service ${serviceName} ${action}ed successfully`,
        output: result
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to ${action} service ${serviceName}`,
      error: errorMessage
    };
  }

  return { success: false, message: `Unsupported action: ${action}` };
}

// Create scheduled task
export async function createScheduledTask(args: any) {
  const { name, command, schedule, runAsAdmin = false } = args;

  try {
    if (process.platform === 'win32') {
      // Windows: use schtasks
      let schtasksCommand = `schtasks /create /tn "${name}" /tr "${command}" /sc ${getWindowsScheduleType(schedule)}`;

      if (schedule.match(/^\d+ \d+ \d+ \d+ \d+$/)) {
        // Custom schedule format: minutes hours day month day-of-week
        schtasksCommand += ` /st ${schedule.split(' ')[0].padStart(2, '0')}:${schedule.split(' ')[1].padStart(2, '0')}`;
      }

      if (runAsAdmin) {
        schtasksCommand += ' /rl HIGHEST';
      }

      const result = execSync(schtasksCommand, { encoding: 'utf8' });
      return { success: true, message: `Scheduled task created: ${name}`, output: result };
    } else {
      // Unix: use cron (simplified)
      const cronCommand = `${schedule} ${command}`;
      const tempFile = path.join(os.tmpdir(), `cron-${Date.now()}`);
      await fs.writeFile(tempFile, cronCommand);

      const result = execSync(`crontab ${tempFile}`, { encoding: 'utf8' });
      await fs.unlink(tempFile);

      return { success: true, message: `Cron job created: ${name}`, output: result };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create scheduled task: ${errorMessage}`);
  }
}

// Helper function for Windows schedule types
function getWindowsScheduleType(schedule: string): string {
  if (schedule.includes('* * * * *')) return 'MINUTE';
  if (schedule.includes('0 * * * *')) return 'HOURLY';
  if (schedule.includes('0 0 * * *')) return 'DAILY';
  if (schedule.includes('0 0 * * 0')) return 'WEEKLY';
  if (schedule.includes('0 0 1 * *')) return 'MONTHLY';
  if (schedule.includes('0 0 1 1 *')) return 'ONCE';
  return 'ONCE';
}

// List scheduled tasks
export async function listScheduledTasks(args: any) {
  const { filter = '' } = args;
  const tasks: any[] = [];

  try {
    if (process.platform === 'win32') {
      // Windows: use schtasks
      const result = execSync('schtasks /query /fo LIST /v', { encoding: 'utf8' });
      const taskBlocks = result.split('\n\n');

      for (const block of taskBlocks) {
        if (block.includes('TaskName:') && block.toLowerCase().includes(filter.toLowerCase())) {
          const lines = block.split('\n');
          const task: Record<string, string> = {};

          for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              task[key.trim()] = valueParts.join(':').trim();
            }
          }

          if (task['TaskName']) {
            tasks.push(task);
          }
        }
      }
    } else {
      // Unix: list cron jobs
      const result = execSync('crontab -l', { encoding: 'utf8' });
      const lines = result.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('#') && line.toLowerCase().includes(filter.toLowerCase())) {
          tasks.push({
            name: `cron-${i}`,
            schedule: line.split(/\s+/).slice(0, 5).join(' '),
            command: line.split(/\s+/).slice(5).join(' ')
          });
        }
      }
    }
  } catch (error) {
    logToFile(`Error listing scheduled tasks: ${error instanceof Error ? error.message : String(error)}`);
  }

  return tasks;
}

// Delete scheduled task
export async function deleteScheduledTask(args: any) {
  const { name } = args;

  try {
    if (process.platform === 'win32') {
      // Windows: use schtasks
      const result = execSync(`schtasks /delete /tn "${name}" /f`, { encoding: 'utf8' });
      return { success: true, message: `Scheduled task deleted: ${name}`, output: result };
    } else {
      // Unix: remove from crontab
      const result = execSync(`crontab -l | grep -v "${name}" | crontab -`, { encoding: 'utf8' });
      return { success: true, message: `Cron job deleted: ${name}`, output: result };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete scheduled task: ${errorMessage}`);
  }
}

// System power actions
export async function systemPowerAction(args: any) {
  const { action, delaySeconds = 0, force = false } = args;

  try {
    let command;
    if (delaySeconds > 0) {
      if (process.platform === 'win32') {
        command = `shutdown /${getWindowsPowerAction(action)} /t ${delaySeconds}`;
        if (force) command += ' /f';
      } else {
        command = `sudo shutdown ${getUnixPowerAction(action)} +${Math.ceil(delaySeconds / 60)}`;
        if (force) command += ' -f';
      }
    } else {
      if (process.platform === 'win32') {
        command = `shutdown /${getWindowsPowerAction(action)} /t 0`;
        if (force) command += ' /f';
      } else {
        command = `sudo shutdown ${getUnixPowerAction(action)} now`;
        if (force) command += ' -f';
      }
    }

    const result = execSync(command, { encoding: 'utf8' });
    return {
      success: true,
      message: `System ${action} initiated${delaySeconds > 0 ? ` with ${delaySeconds} seconds delay` : ''}`,
      output: result
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to perform power action: ${errorMessage}`);
  }
}

// Helper functions for power actions
function getWindowsPowerAction(action: string): string {
  switch (action) {
    case 'shutdown': return 's';
    case 'reboot': return 'r';
    case 'sleep': return 'h';
    case 'hibernate': return 'h';
    default: return 's';
  }
}

function getUnixPowerAction(action: string): string {
  switch (action) {
    case 'shutdown': return '-h';
    case 'reboot': return '-r';
    case 'sleep': return '-s'; // Note: sleep may not be available on all Unix systems
    case 'hibernate': return '-h';
    default: return '-h';
  }
}

// Registry operations (Windows only)
export async function registryOperation(args: any) {
  if (process.platform !== 'win32') {
    throw new Error('Registry operations are only supported on Windows');
  }

  const { action, key, value, data, type = 'STRING' } = args;

  try {
    let command, result;

    switch (action) {
      case 'read':
        command = `reg query "${key}" /v ${value || ''}`;
        result = execSync(command, { encoding: 'utf8' });
        return { success: true, action, key, value, data: result.trim() };

      case 'write':
        let regType = 'REG_SZ';
        if (type.toUpperCase() === 'DWORD') regType = 'REG_DWORD';
        if (type.toUpperCase() === 'BINARY') regType = 'REG_BINARY';

        command = `reg add "${key}" /v ${value} /t ${regType} /d "${data}" /f`;
        result = execSync(command, { encoding: 'utf8' });
        return { success: true, action, key, value, data, message: 'Registry value written successfully' };

      case 'delete':
        command = `reg delete "${key}" /v ${value} /f`;
        result = execSync(command, { encoding: 'utf8' });
        return { success: true, action, key, value, message: 'Registry value deleted successfully' };
    }

    throw new Error(`Unsupported registry action: ${action}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Registry operation failed: ${errorMessage}`);
  }
}

// Path validation function (copied from filesystem.ts for consistency)
async function validatePath(requestedPath: string): Promise<string> {
    // Path validation is completely bypassed
    logToFile(`Access granted to path without validation: ${requestedPath}`);

    // Handle home directory expansion
    let processedPath = requestedPath;
    if (processedPath.startsWith('~')) {
        processedPath = processedPath.replace('~', os.homedir());
    }

    // Handle environment variables on Windows
    if (process.platform === 'win32' && processedPath.includes('%')) {
        processedPath = processedPath.replace(/%([^%]+)%/g, (_, varName) => {
            return process.env[varName] || '';
        });
    }

    // Convert to absolute path
    const absolute = path.isAbsolute(processedPath)
        ? processedPath
        : path.resolve(process.cwd(), processedPath);

    return absolute;
}

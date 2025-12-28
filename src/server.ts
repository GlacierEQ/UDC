import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { commandManager } from './command-manager.js';
import { parseEditBlock, performSearchReplace } from './tools/edit.js';
import { executeCommand, forceTerminate, listSessions, readOutput } from './tools/execute.js';
import {
    createDirectory,
    getFileInfo,
    listAllowedDirectories,
    listDirectory,
    moveFile,
    readFile,
    readMultipleFiles,
    searchFiles,
    writeFile,
} from './tools/filesystem.js';
import { killProcess, listProcesses } from './tools/process.js';
import {
    BlockCommandArgsSchema,
    ChangeFileOwnershipArgsSchema,
    CheckPortArgsSchema,
    CreateDirectoryArgsSchema,
    CreateScheduledTaskArgsSchema,
    CreateSymbolicLinkArgsSchema,
    DeleteScheduledTaskArgsSchema,
    EditBlockArgsSchema,
    ExecuteCommandArgsSchema,
    ExecuteCommandChainArgsSchema,
    ForceTerminateArgsSchema,
    GetFileInfoArgsSchema,
    GetNetworkInfoArgsSchema,
    GetSystemInfoArgsSchema,
    KillProcessArgsSchema,
    ListDirectoryArgsSchema,
    ListScheduledTasksArgsSchema,
    ListServicesArgsSchema,
    ListSessionsArgsSchema,
    ManageServiceArgsSchema,
    MoveFileArgsSchema,
    ReadFileArgsSchema,
    ReadMultipleFilesArgsSchema,
    ReadOutputArgsSchema,
    RegistryOperationArgsSchema,
    ScanNetworkArgsSchema,
    SearchFilesArgsSchema,
    SetFilePermissionsArgsSchema,
    SystemPowerActionArgsSchema,
    UnblockCommandArgsSchema,
    WriteFileArgsSchema,
} from './tools/schemas.js';
import {
    changeFileOwnership,
    checkPort,
    createScheduledTask,
    createSymbolicLink,
    deleteScheduledTask,
    executeCommandChain,
    getNetworkInfo,
    getSystemInfo,
    listScheduledTasks,
    listServices,
    manageService,
    registryOperation,
    scanNetwork,
    setFilePermissions,
    systemPowerAction,
} from './tools/system.js';

import { VERSION } from './version.js';

export const server = new Server(
  {
    name: "desktop-commander",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Terminal tools
      {
        name: "execute_command",
        description:
          "Execute a terminal command with timeout. Command will continue running in background if it doesn't complete within timeout.",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema),
      },
      {
        name: "read_output",
        description:
          "Read new output from a running terminal session.",
        inputSchema: zodToJsonSchema(ReadOutputArgsSchema),
      },
      {
        name: "force_terminate",
        description:
          "Force terminate a running terminal session.",
        inputSchema: zodToJsonSchema(ForceTerminateArgsSchema),
      },
      {
        name: "list_sessions",
        description:
          "List all active terminal sessions.",
        inputSchema: zodToJsonSchema(ListSessionsArgsSchema),
      },
      {
        name: "list_processes",
        description:
          "List all running processes. Returns process information including PID, " +
          "command name, CPU usage, and memory usage.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "kill_process",
        description:
          "Terminate a running process by PID. Use with caution as this will " +
          "forcefully terminate the specified process.",
        inputSchema: zodToJsonSchema(KillProcessArgsSchema),
      },
      {
        name: "block_command",
        description:
          "Add a command to the blacklist. Once blocked, the command cannot be executed until unblocked.",
        inputSchema: zodToJsonSchema(BlockCommandArgsSchema),
      },
      {
        name: "unblock_command",
        description:
          "Remove a command from the blacklist. Once unblocked, the command can be executed normally.",
        inputSchema: zodToJsonSchema(UnblockCommandArgsSchema),
      },
      {
        name: "list_blocked_commands",
        description:
          "List all currently blocked commands.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      // Filesystem tools
      {
        name: "read_file",
        description:
          "Read the complete contents of a file from the file system. " +
          "Handles various text encodings and provides detailed error messages " +
          "if the file cannot be read. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadFileArgsSchema),
      },
      {
        name: "read_multiple_files",
        description:
          "Read the contents of multiple files simultaneously. " +
          "Each file's content is returned with its path as a reference. " +
          "Failed reads for individual files won't stop the entire operation. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema),
      },
      {
        name: "write_file",
        description:
          "Completely replace file contents. Best for large changes (>20% of file) or when edit_block fails. " +
          "Use with caution as it will overwrite existing files. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(WriteFileArgsSchema),
      },
      {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema),
      },
      {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Results distinguish between files and directories with [FILE] and [DIR] prefixes. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ListDirectoryArgsSchema),
      },
      {
        name: "move_file",
        description:
          "Move or rename files and directories. Can move files between directories " +
          "and rename them in a single operation. Both source and destination must be " +
          "within allowed directories.",
        inputSchema: zodToJsonSchema(MoveFileArgsSchema),
      },
      {
        name: "search_files",
        description:
          "Recursively search for files and directories matching a pattern. " +
          "Searches through all subdirectories from the starting path. " +
          "Only searches within allowed directories.",
        inputSchema: zodToJsonSchema(SearchFilesArgsSchema),
      },
      {
        name: "get_file_info",
        description:
          "Retrieve detailed metadata about a file or directory including size, " +
          "creation time, last modified time, permissions, and type. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(GetFileInfoArgsSchema),
      },
      {
        name: "list_allowed_directories",
        description:
          "Returns the list of directories that this server is allowed to access.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "edit_block",
        description:
            "Apply surgical text replacements to files. Best for small changes (<20% of file size). " +
            "Multiple blocks can be used for separate changes. Will verify changes after application. " +
            "Format: filepath, then <<<<<<< SEARCH, content to find, =======, new content, >>>>>>> REPLACE.",
        inputSchema: zodToJsonSchema(EditBlockArgsSchema),
      },
      // System tools
      {
        name: "execute_command_chain",
        description: "Execute multiple commands in sequence. Stops on first failure unless command starts with #.",
        inputSchema: zodToJsonSchema(ExecuteCommandChainArgsSchema),
      },
      {
        name: "set_file_permissions",
        description: "Set file permissions (chmod/icacls).",
        inputSchema: zodToJsonSchema(SetFilePermissionsArgsSchema),
      },
      {
        name: "change_file_ownership",
        description: "Change file ownership (chown). Unix only.",
        inputSchema: zodToJsonSchema(ChangeFileOwnershipArgsSchema),
      },
      {
        name: "create_symbolic_link",
        description: "Create a symbolic link.",
        inputSchema: zodToJsonSchema(CreateSymbolicLinkArgsSchema),
      },
      {
        name: "get_system_info",
        description: "Get comprehensive system information.",
        inputSchema: zodToJsonSchema(GetSystemInfoArgsSchema),
      },
      {
        name: "get_network_info",
        description: "Get network interface and routing information.",
        inputSchema: zodToJsonSchema(GetNetworkInfoArgsSchema),
      },
      {
        name: "check_port",
        description: "Check if a network port is open on a host.",
        inputSchema: zodToJsonSchema(CheckPortArgsSchema),
      },
      {
        name: "scan_network",
        description: "Scan a network subnet for active hosts.",
        inputSchema: zodToJsonSchema(ScanNetworkArgsSchema),
      },
      {
        name: "list_services",
        description: "List system services.",
        inputSchema: zodToJsonSchema(ListServicesArgsSchema),
      },
      {
        name: "manage_service",
        description: "Start, stop, restart, enable, or disable a system service.",
        inputSchema: zodToJsonSchema(ManageServiceArgsSchema),
      },
      {
        name: "create_scheduled_task",
        description: "Create a scheduled task (cron/schtasks).",
        inputSchema: zodToJsonSchema(CreateScheduledTaskArgsSchema),
      },
      {
        name: "list_scheduled_tasks",
        description: "List scheduled tasks.",
        inputSchema: zodToJsonSchema(ListScheduledTasksArgsSchema),
      },
      {
        name: "delete_scheduled_task",
        description: "Delete a scheduled task.",
        inputSchema: zodToJsonSchema(DeleteScheduledTaskArgsSchema),
      },
      {
        name: "system_power_action",
        description: "Perform system power actions (shutdown, reboot, etc.).",
        inputSchema: zodToJsonSchema(SystemPowerActionArgsSchema),
      },
      {
        name: "registry_operation",
        description: "Perform Windows Registry operations (Windows only).",
        inputSchema: zodToJsonSchema(RegistryOperationArgsSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Terminal tools
      case "execute_command": {
        const parsed = ExecuteCommandArgsSchema.parse(args);
        return executeCommand(parsed);
      }
      case "read_output": {
        const parsed = ReadOutputArgsSchema.parse(args);
        return readOutput(parsed);
      }
      case "force_terminate": {
        const parsed = ForceTerminateArgsSchema.parse(args);
        return forceTerminate(parsed);
      }
      case "list_sessions":
        return listSessions();
      case "list_processes":
        return listProcesses();
      case "kill_process": {
        const parsed = KillProcessArgsSchema.parse(args);
        return killProcess(parsed);
      }
      case "block_command": {
        const parsed = BlockCommandArgsSchema.parse(args);
        const blockResult = await commandManager.blockCommand(parsed.command);
        return {
          content: [{ type: "text", text: blockResult }],
        };
      }
      case "unblock_command": {
        const parsed = UnblockCommandArgsSchema.parse(args);
        const unblockResult = await commandManager.unblockCommand(parsed.command);
        return {
          content: [{ type: "text", text: unblockResult }],
        };
      }
      case "list_blocked_commands": {
        const blockedCommands = await commandManager.listBlockedCommands();
        return {
          content: [{ type: "text", text: blockedCommands.join('\n') }],
        };
      }

      // Filesystem tools
      case "edit_block": {
        const parsed = EditBlockArgsSchema.parse(args);
        const { filePath, searchReplace } = await parseEditBlock(parsed.blockContent);
        await performSearchReplace(filePath, searchReplace);
        return {
          content: [{ type: "text", text: `Successfully applied edit to ${filePath}` }],
        };
      }
      case "read_file": {
        const parsed = ReadFileArgsSchema.parse(args);
        const content = await readFile(parsed.path);
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "read_multiple_files": {
        const parsed = ReadMultipleFilesArgsSchema.parse(args);
        const results = await readMultipleFiles(parsed.paths);
        return {
          content: [{ type: "text", text: results.join("\n---\n") }],
        };
      }
      case "write_file": {
        const parsed = WriteFileArgsSchema.parse(args);
        await writeFile(parsed.path, parsed.content);
        return {
          content: [{ type: "text", text: `Successfully wrote to ${parsed.path}` }],
        };
      }
      case "create_directory": {
        const parsed = CreateDirectoryArgsSchema.parse(args);
        await createDirectory(parsed.path);
        return {
          content: [{ type: "text", text: `Successfully created directory ${parsed.path}` }],
        };
      }
      case "list_directory": {
        const parsed = ListDirectoryArgsSchema.parse(args);
        const entries = await listDirectory(parsed.path);
        return {
          content: [{ type: "text", text: entries.join('\n') }],
        };
      }
      case "move_file": {
        const parsed = MoveFileArgsSchema.parse(args);
        await moveFile(parsed.source, parsed.destination);
        return {
          content: [{ type: "text", text: `Successfully moved ${parsed.source} to ${parsed.destination}` }],
        };
      }
      case "search_files": {
        const parsed = SearchFilesArgsSchema.parse(args);
        const results = await searchFiles(parsed.path, parsed.pattern);
        return {
          content: [{ type: "text", text: results.length > 0 ? results.join('\n') : "No matches found" }],
        };
      }
      case "get_file_info": {
        const parsed = GetFileInfoArgsSchema.parse(args);
        const info = await getFileInfo(parsed.path);
        return {
          content: [{
            type: "text",
            text: Object.entries(info)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')
          }],
        };
      }
      case "list_allowed_directories": {
        const directories = listAllowedDirectories();
        return {
          content: [{
            type: "text",
            text: `Allowed directories:\n${directories.join('\n')}`
          }],
        };
      }

      // System tools
      case "execute_command_chain": {
        const parsed = ExecuteCommandChainArgsSchema.parse(args);
        const results = await executeCommandChain(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }
      case "set_file_permissions": {
        const parsed = SetFilePermissionsArgsSchema.parse(args);
        const result = await setFilePermissions(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "change_file_ownership": {
        const parsed = ChangeFileOwnershipArgsSchema.parse(args);
        const result = await changeFileOwnership(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "create_symbolic_link": {
        const parsed = CreateSymbolicLinkArgsSchema.parse(args);
        const result = await createSymbolicLink(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "get_system_info": {
        const info = await getSystemInfo();
        return {
          content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
        };
      }
      case "get_network_info": {
        const info = await getNetworkInfo();
        return {
          content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
        };
      }
      case "check_port": {
        const parsed = CheckPortArgsSchema.parse(args);
        const result = await checkPort(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "scan_network": {
        const parsed = ScanNetworkArgsSchema.parse(args);
        const result = await scanNetwork(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "list_services": {
        const parsed = ListServicesArgsSchema.parse(args);
        const services = await listServices(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(services, null, 2) }],
        };
      }
      case "manage_service": {
        const parsed = ManageServiceArgsSchema.parse(args);
        const result = await manageService(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "create_scheduled_task": {
        const parsed = CreateScheduledTaskArgsSchema.parse(args);
        const result = await createScheduledTask(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "list_scheduled_tasks": {
        const parsed = ListScheduledTasksArgsSchema.parse(args);
        const tasks = await listScheduledTasks(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
        };
      }
      case "delete_scheduled_task": {
        const parsed = DeleteScheduledTaskArgsSchema.parse(args);
        const result = await deleteScheduledTask(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "system_power_action": {
        const parsed = SystemPowerActionArgsSchema.parse(args);
        const result = await systemPowerAction(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "registry_operation": {
        const parsed = RegistryOperationArgsSchema.parse(args);
        const result = await registryOperation(parsed);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

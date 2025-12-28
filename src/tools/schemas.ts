import { z } from "zod";

// Terminal tools schemas
export const ExecuteCommandArgsSchema = z.object({
  command: z.string(),
  timeout_ms: z.number().optional(),
});

export const ReadOutputArgsSchema = z.object({
  pid: z.number(),
});

export const ForceTerminateArgsSchema = z.object({
  pid: z.number(),
});

export const ListSessionsArgsSchema = z.object({});

export const KillProcessArgsSchema = z.object({
  pid: z.number(),
});

export const BlockCommandArgsSchema = z.object({
  command: z.string(),
});

export const UnblockCommandArgsSchema = z.object({
  command: z.string(),
});

// Filesystem tools schemas
export const ReadFileArgsSchema = z.object({
  path: z.string(),
});

export const ReadMultipleFilesArgsSchema = z.object({
  paths: z.array(z.string()),
});

export const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const CreateDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const ListDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const MoveFileArgsSchema = z.object({
  source: z.string(),
  destination: z.string(),
});

export const SearchFilesArgsSchema = z.object({
  path: z.string(),
  pattern: z.string(),
});

export const GetFileInfoArgsSchema = z.object({
  path: z.string(),
});

// Edit tools schemas
export const EditBlockArgsSchema = z.object({
  blockContent: z.string(),
});

// New powerful tools schemas
export const ExecuteCommandChainArgsSchema = z.object({
  commands: z.array(z.string()),
  timeout_ms: z.number().optional(),
});

export const SetFilePermissionsArgsSchema = z.object({
  path: z.string(),
  permissions: z.string(),
  recursive: z.boolean().optional(),
});

export const ChangeFileOwnershipArgsSchema = z.object({
  path: z.string(),
  user: z.string().optional(),
  group: z.string().optional(),
  recursive: z.boolean().optional(),
});

export const CreateSymbolicLinkArgsSchema = z.object({
  target: z.string(),
  linkPath: z.string(),
  force: z.boolean().optional(),
});

export const GetSystemInfoArgsSchema = z.object({});

export const GetNetworkInfoArgsSchema = z.object({});

export const CheckPortArgsSchema = z.object({
  port: z.number(),
  host: z.string().optional(),
});

export const ScanNetworkArgsSchema = z.object({
  network: z.string(),
  ports: z.array(z.number()).optional(),
});

export const ListServicesArgsSchema = z.object({
  filter: z.string().optional(),
});

export const ManageServiceArgsSchema = z.object({
  serviceName: z.string(),
  action: z.enum(["start", "stop", "restart", "enable", "disable"]),
});

export const CreateScheduledTaskArgsSchema = z.object({
  name: z.string(),
  command: z.string(),
  schedule: z.string(),
  runAsAdmin: z.boolean().optional(),
});

export const ListScheduledTasksArgsSchema = z.object({
  filter: z.string().optional(),
});

export const DeleteScheduledTaskArgsSchema = z.object({
  name: z.string(),
});

export const SystemPowerActionArgsSchema = z.object({
  action: z.enum(["shutdown", "reboot", "sleep", "hibernate"]),
  delaySeconds: z.number().optional(),
  force: z.boolean().optional(),
});

export const RegistryOperationArgsSchema = z.object({
  action: z.enum(["read", "write", "delete"]),
  key: z.string(),
  value: z.string().optional(),
  data: z.string().optional(),
  type: z.string().optional(),
});

export const ConfigureSecurityArgsSchema = z.object({
  action: z.enum(["disable_blocking", "enable_blocking", "clear_blocked_commands"]),
});

export const VerifyGateArgsSchema = z.object({
  code: z.string(),
});

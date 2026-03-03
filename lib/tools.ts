import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/** Workspace root for tool execution. All paths must resolve within this directory. */
const WORK_DIR = process.env.AGENT_WORKSPACE_ROOT
  ? path.resolve(process.cwd(), process.env.AGENT_WORKSPACE_ROOT)
  : process.cwd();
const SHELL_TIMEOUT_MS = 30_000;

export interface ToolResult {
  success: boolean;
  output: string;
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'shell_execute',
      description: 'Execute a shell command. Returns stdout and stderr.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to run' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_read',
      description: 'Read the contents of a file at the given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute file path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_write',
      description: 'Write content to a file at the given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute file path' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'directory_list',
      description: 'List files and directories at the given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative or absolute directory path' },
        },
        required: ['path'],
      },
    },
  },
];

/**
 * Resolve a tool path argument. Absolute paths are accepted as-is (the user
 * explicitly asked the agent to access them). Relative paths are resolved
 * within WORK_DIR to prevent unintended traversal.
 */
function resolvePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  const resolved = path.resolve(WORK_DIR, inputPath);
  if (!resolved.startsWith(WORK_DIR)) {
    throw new Error(`Relative path escapes workspace: ${inputPath}`);
  }
  return resolved;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    if (name === 'shell_execute') {
      const command = String(args.command ?? '');
      const { stdout, stderr } = await execAsync(command, {
        cwd: WORK_DIR,
        timeout: SHELL_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      });
      const out = [stdout, stderr].filter(Boolean).join('\n') || '(no output)';
      return { success: true, output: `[cwd: ${WORK_DIR}]\n${out}` };
    }

    if (name === 'file_read') {
      const filePath = resolvePath(String(args.path ?? ''));
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, output: `[Reading ${filePath}]\n${content}` };
    }

    if (name === 'file_write') {
      const filePath = resolvePath(String(args.path ?? ''));
      const content = String(args.content ?? '');
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true, output: `Wrote ${filePath}` };
    }

    if (name === 'directory_list') {
      const dirPath = resolvePath(String(args.path ?? '.'));
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const lines = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
      return { success: true, output: `[Listing ${dirPath}]\n${lines.join('\n') || '(empty)'}` };
    }

    return { success: false, output: `Unknown tool: ${name}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: msg };
  }
}

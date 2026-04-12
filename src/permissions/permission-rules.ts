import type { PermissionDecision } from './permission-types'

export type PermissionMode = 'normal' | 'plan' | 'auto-accept'

export interface PermissionEvaluationInput {
  toolId: string
  subject: string
  metadata?: Record<string, unknown>
}

export function cyclePermissionMode(mode: PermissionMode): PermissionMode {
  const order: PermissionMode[] = ['normal', 'plan', 'auto-accept']
  const index = order.indexOf(mode)
  return order[(index + 1) % order.length] ?? 'normal'
}

/** Tool IDs that are always safe to run (read-only). */
const READ_ONLY_TOOLS = new Set([
  'readFile',
  'readTaskOutput',
  'slashCommand',
  'enterPlanMode',
])

/** Tool IDs that perform write or execution operations. */
const WRITE_TOOLS = new Set([
  'writeFile',
  'patchFile',
  'executeShell',
  'spawnAgent',
  'writeMemory',
])

export function evaluatePermissionMode(
  mode: PermissionMode,
  input: PermissionEvaluationInput,
): PermissionDecision {
  if (mode === 'auto-accept') {
    return 'allow'
  }

  // Read-only tools are always allowed
  if (READ_ONLY_TOOLS.has(input.toolId)) {
    return 'allow'
  }

  if (mode === 'plan') {
    // exitPlanMode triggers the plan approval overlay
    if (input.toolId === 'exitPlanMode') {
      return 'ask'
    }

    // Allow writing to plan files (detected by metadata)
    if (
      (input.toolId === 'writeFile' || input.toolId === 'patchFile') &&
      input.metadata?.isPlanFileWrite
    ) {
      return 'allow'
    }

    // Block all other write/execute tools in plan mode
    if (WRITE_TOOLS.has(input.toolId)) {
      return 'deny'
    }

    // Default: ask for unknown tools
    return 'ask'
  }

  // Normal mode: ask for write/execute tools
  return 'ask'
}

import { z } from 'zod'

import { getPlanFilePath, readPlan, isSessionPlanFile } from '../plans/plan-store'
import type { ToolDefinition } from './tool-types'

const enterPlanModeSchema = z.object({})

const exitPlanModeSchema = z.object({})

export const enterPlanModeTool: ToolDefinition<typeof enterPlanModeSchema, string> = {
  id: 'enterPlanMode',
  displayName: 'Enter Plan Mode',
  description: [
    'Enter plan mode for complex tasks requiring exploration and design.',
    'Use this proactively when a task has multiple valid approaches, requires architectural decisions,',
    'or involves multi-file changes. In plan mode you explore the codebase read-only and write your',
    'plan to the plan file. When ready, call exitPlanMode to present your plan for user approval.',
  ].join(' '),
  inputSchema: enterPlanModeSchema,
  execute: async (_input, context) => {
    if (!context.permissionEngine) {
      throw new Error('Permission engine is not available.')
    }

    const currentMode = context.permissionEngine.getSnapshot().mode
    if (currentMode === 'plan') {
      return 'Already in plan mode. Continue exploring and write your plan to the plan file.'
    }

    // Store pre-plan mode for restoration and switch to plan
    context.permissionEngine.setPrePlanMode(currentMode)
    context.permissionEngine.setMode('plan')

    const sessionId = context.sessionId ?? 'default'
    const planFilePath = getPlanFilePath(sessionId)

    return [
      'Entered plan mode. You are now in a read-only exploration phase.',
      '',
      `Plan file: ${planFilePath}`,
      '',
      'In plan mode, you should:',
      '1. Thoroughly explore the codebase to understand existing patterns',
      '2. Identify similar features and architectural approaches',
      '3. Consider multiple approaches and their trade-offs',
      '4. Write your implementation plan to the plan file using writeFile',
      '5. When ready, call exitPlanMode to present your plan for user approval',
      '',
      'IMPORTANT: Do NOT write or edit any files except the plan file.',
      'All write/execute tools are blocked except for writing to the plan file.',
    ].join('\n')
  },
  summarize: (result) => 'Entered plan mode',
}

export const exitPlanModeTool: ToolDefinition<typeof exitPlanModeSchema, string> = {
  id: 'exitPlanMode',
  displayName: 'Exit Plan Mode',
  description: [
    'Exit plan mode and present your plan for user approval.',
    'Call this after writing your plan to the plan file.',
    'The user will review the plan and approve or reject it.',
    'If approved, you can proceed with implementation.',
    'If rejected, you will remain in plan mode to refine your plan.',
  ].join(' '),
  inputSchema: exitPlanModeSchema,
  getPermissionRequest: () => ({
    subject: 'Exit plan mode and review plan',
    metadata: { isPlanApproval: true },
  }),
  execute: async (_input, context) => {
    if (!context.permissionEngine) {
      throw new Error('Permission engine is not available.')
    }

    const currentMode = context.permissionEngine.getSnapshot().mode
    if (currentMode !== 'plan') {
      return 'You are not in plan mode. This tool is only for exiting plan mode after writing a plan. If your plan was already approved, continue with implementation.'
    }

    const sessionId = context.sessionId ?? 'default'
    const plan = await readPlan(sessionId)

    if (!plan || plan.trim() === '') {
      const planFilePath = getPlanFilePath(sessionId)
      throw new Error(
        `No plan file found at ${planFilePath}. Write your plan to this file before calling exitPlanMode.`,
      )
    }

    // Permission was granted (user approved) — restore previous mode
    const prePlanMode = context.permissionEngine.getPrePlanMode()
    context.permissionEngine.setMode(prePlanMode)
    context.permissionEngine.setPrePlanMode(null)

    const planFilePath = getPlanFilePath(sessionId)

    return [
      'User has approved your plan. You can now start coding.',
      '',
      `Your plan has been saved to: ${planFilePath}`,
      'You can refer back to it if needed during implementation.',
      '',
      '## Approved Plan:',
      plan,
    ].join('\n')
  },
  summarize: (result) => 'Exited plan mode — plan approved',
}

export { isSessionPlanFile }

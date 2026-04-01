import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { workspaceRoot } from '../config'
import type { ReasoningEffort } from '../lib/model'
import { isRecord } from './jsonl'
import { getModelSelectionPath } from './session-paths'

export interface PersistedModelSelection {
  modelId: string
  reasoningEffort: ReasoningEffort | null
}

function parseReasoningEffort(value: unknown): ReasoningEffort | null {
  if (value === null || value === undefined) {
    return null
  }

  if (value === 'low' || value === 'medium' || value === 'high') {
    return value
  }

  return null
}

function parseModelSelection(value: unknown): PersistedModelSelection | null {
  if (!isRecord(value)) {
    return null
  }

  const { modelId, reasoningEffort } = value
  if (typeof modelId !== 'string' || !modelId.trim()) {
    return null
  }

  return {
    modelId: modelId.trim(),
    reasoningEffort: parseReasoningEffort(reasoningEffort),
  }
}

export async function readModelSelection(root: string = workspaceRoot): Promise<PersistedModelSelection | null> {
  const filePath = getModelSelectionPath(root)

  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }

  try {
    return parseModelSelection(JSON.parse(raw))
  } catch {
    return null
  }
}

export async function writeModelSelection(
  selection: PersistedModelSelection,
  root: string = workspaceRoot,
): Promise<void> {
  const filePath = getModelSelectionPath(root)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(selection, null, 2)}\n`, 'utf8')
}

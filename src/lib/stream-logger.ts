import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { getStreamLogPath } from '../session/session-paths'

const IDLE_WARN_INTERVAL_MS = 30_000

type Fields = Record<string, unknown>

async function writeEntry(turnId: string, event: string, fields: Fields): Promise<void> {
  const filePath = getStreamLogPath()
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    turnId,
    event,
    ...fields,
  })
  try {
    await mkdir(path.dirname(filePath), { recursive: true })
    await appendFile(filePath, `${entry}\n`, 'utf8')
  } catch {
    // best-effort — never throw from the logger
  }
}

export interface StreamLogger {
  event(type: string, fields?: Fields): void
  finish(fields?: Fields): void
  error(err: unknown, fields?: Fields): void
  aborted(fields?: Fields): void
}

export function createStreamLogger(turnId: string, context: Fields = {}): StreamLogger {
  const startedAt = Date.now()
  let lastEventAt = startedAt
  let partCount = 0
  let warningCount = 0

  void writeEntry(turnId, 'start', context)

  const idleInterval = setInterval(() => {
    const idleMs = Date.now() - lastEventAt
    if (idleMs >= IDLE_WARN_INTERVAL_MS) {
      warningCount += 1
      void writeEntry(turnId, 'idle', {
        idleMs,
        lastEventAt: new Date(lastEventAt).toISOString(),
        partCount,
        warningCount,
      })
      console.warn(
        `[gambit] stream idle ${Math.round(idleMs / 1000)}s (turn ${turnId.slice(0, 8)}, ${partCount} parts)`,
      )
    }
  }, IDLE_WARN_INTERVAL_MS)
  if (typeof idleInterval.unref === 'function') {
    idleInterval.unref()
  }

  const stop = () => {
    clearInterval(idleInterval)
  }

  return {
    event(type: string, fields: Fields = {}): void {
      const now = Date.now()
      partCount += 1
      void writeEntry(turnId, 'part', {
        type,
        partIndex: partCount,
        deltaMs: now - lastEventAt,
        elapsedMs: now - startedAt,
        ...fields,
      })
      lastEventAt = now
    },
    finish(fields: Fields = {}): void {
      stop()
      void writeEntry(turnId, 'finish', {
        elapsedMs: Date.now() - startedAt,
        partCount,
        ...fields,
      })
    },
    error(err: unknown, fields: Fields = {}): void {
      stop()
      void writeEntry(turnId, 'error', {
        elapsedMs: Date.now() - startedAt,
        partCount,
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
        ...fields,
      })
    },
    aborted(fields: Fields = {}): void {
      stop()
      void writeEntry(turnId, 'aborted', {
        elapsedMs: Date.now() - startedAt,
        partCount,
        ...fields,
      })
    },
  }
}

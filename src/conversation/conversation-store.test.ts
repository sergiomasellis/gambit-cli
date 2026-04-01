import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createConversationStore } from './conversation-store'

let tempRoot: string

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'gambit-conversation-store-'))
})

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true })
})

test('returns a stable snapshot object until state changes', async () => {
  const store = createConversationStore({ rootPath: tempRoot, conversationId: 'snapshot-test' })
  await store.initialize()

  const initialSnapshot = store.getSnapshot()
  expect(store.getSnapshot()).toBe(initialSnapshot)

  await store.pushMessage({
    id: 'message-1',
    role: 'user',
    content: 'hello',
    timestamp: new Date().toISOString(),
  })

  const updatedSnapshot = store.getSnapshot()
  expect(updatedSnapshot).not.toBe(initialSnapshot)
  expect(store.getSnapshot()).toBe(updatedSnapshot)
})

test('can switch between persisted conversations and rewrite the active transcript', async () => {
  const store = createConversationStore({ rootPath: tempRoot, conversationId: 'first-session' })
  await store.initialize()
  await store.pushMessage({
    id: 'message-1',
    role: 'user',
    content: 'first conversation',
    timestamp: new Date().toISOString(),
  })

  await store.openConversation('second-session')
  await store.pushMessage({
    id: 'message-2',
    role: 'user',
    content: 'second conversation',
    timestamp: new Date().toISOString(),
  })

  await store.openConversation('first-session')
  expect(store.getSnapshot().conversationId).toBe('first-session')
  expect(store.getSnapshot().messages.map((message) => message.content)).toEqual(['first conversation'])

  await store.replaceMessages([
    {
      id: 'message-3',
      role: 'assistant',
      content: 'rewritten conversation',
      timestamp: new Date().toISOString(),
    },
  ])

  await store.openConversation('first-session')
  expect(store.getSnapshot().messages.map((message) => message.content)).toEqual(['rewritten conversation'])
})

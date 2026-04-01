import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { workspaceRoot } from '../config'
import { appendJsonlEntry, readJsonlEntries } from './transcript'
import { writeJsonlEntries } from '../session/jsonl'
import type { ConversationMessage, ConversationTurnRecord } from './conversation-types'

export interface ConversationStoreOptions {
  rootPath?: string
  conversationId?: string
}

export interface ConversationStoreSnapshot {
  conversationId: string
  directory: string
  transcriptPath: string
  messages: ConversationMessage[]
  status: 'idle' | 'running'
  error: string | null
  initialized: boolean
}

type Listener = () => void

export class ConversationStore {
  readonly rootPath: string
  private currentConversationId: string
  private currentDirectory: string
  private currentTranscriptPath: string
  private messages: ConversationMessage[] = []
  private status: 'idle' | 'running' = 'idle'
  private error: string | null = null
  private initialized = false
  private snapshotState: ConversationStoreSnapshot
  private readonly listeners = new Set<Listener>()

  constructor(options: ConversationStoreOptions = {}) {
    this.rootPath = options.rootPath ?? workspaceRoot
    this.currentConversationId = options.conversationId ?? randomUUID()
    this.currentDirectory = path.join(this.rootPath, '.gambit', 'conversations', this.currentConversationId)
    this.currentTranscriptPath = path.join(this.currentDirectory, 'transcript.jsonl')
    this.snapshotState = {
      conversationId: this.currentConversationId,
      directory: this.currentDirectory,
      transcriptPath: this.currentTranscriptPath,
      messages: this.messages,
      status: this.status,
      error: this.error,
      initialized: this.initialized,
    }
  }

  get conversationId(): string {
    return this.currentConversationId
  }

  get directory(): string {
    return this.currentDirectory
  }

  get transcriptPath(): string {
    return this.currentTranscriptPath
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async ensureReady(): Promise<void> {
    await mkdir(this.currentDirectory, { recursive: true })
  }

  async initialize(initialMessages: ConversationMessage[] = []): Promise<void> {
    await this.openConversation(this.currentConversationId, initialMessages)
  }

  async openConversation(conversationId: string, initialMessages: ConversationMessage[] = []): Promise<void> {
    this.assignConversationPaths(conversationId)
    this.messages = []
    this.status = 'idle'
    this.error = null
    await this.ensureReady()

    const persistedMessages = await this.loadMessages()
    if (persistedMessages.length > 0) {
      this.messages = persistedMessages
    } else if (initialMessages.length > 0) {
      this.messages = [...initialMessages]
      await this.persistMessageSnapshot(initialMessages)
    }

    this.initialized = true
    this.refreshSnapshot()
    this.emit()
  }

  async startNewConversation(initialMessages: ConversationMessage[] = []): Promise<string> {
    const conversationId = randomUUID()
    await this.openConversation(conversationId, initialMessages)
    return conversationId
  }

  getSnapshot(): ConversationStoreSnapshot {
    return this.snapshotState
  }

  setStatus(status: 'idle' | 'running'): void {
    this.status = status
    this.refreshSnapshot()
    this.emit()
  }

  setError(error: string | null): void {
    this.error = error
    this.refreshSnapshot()
    this.emit()
  }

  async pushMessage(message: ConversationMessage, options: { persist?: boolean } = {}): Promise<void> {
    this.initialized = true
    this.messages = [...this.messages, message]
    this.refreshSnapshot()
    this.emit()

    if (options.persist !== false) {
      await this.ensureReady()
      await appendJsonlEntry(this.currentTranscriptPath, {
        kind: 'message',
        ...message,
      })
    }
  }

  async appendMessage(message: ConversationMessage): Promise<void> {
    await this.pushMessage(message)
  }

  async appendTurn(record: ConversationTurnRecord): Promise<void> {
    this.initialized = true
    await this.ensureReady()
    await appendJsonlEntry(this.currentTranscriptPath, {
      kind: 'turn',
      ...record,
    })
  }

  updateMessage(id: string, patch: Partial<ConversationMessage>): void {
    this.messages = this.messages.map((message) => (message.id === id ? { ...message, ...patch } : message))
    this.refreshSnapshot()
    this.emit()
  }

  removeMessage(id: string): void {
    this.messages = this.messages.filter((message) => message.id !== id)
    this.refreshSnapshot()
    this.emit()
  }

  reset(messages: ConversationMessage[]): void {
    this.initialized = true
    this.messages = [...messages]
    this.error = null
    this.status = 'idle'
    this.refreshSnapshot()
    this.emit()
  }

  async replaceMessages(messages: ConversationMessage[]): Promise<void> {
    this.initialized = true
    this.messages = [...messages]
    this.error = null
    this.status = 'idle'
    this.refreshSnapshot()
    this.emit()
    await this.persistMessageSnapshot(messages)
  }

  async loadMessages(): Promise<ConversationMessage[]> {
    const entries = await readJsonlEntries<ConversationMessage & { kind?: string }>(this.currentTranscriptPath)
    return entries.filter((entry) => entry.kind !== 'turn') as ConversationMessage[]
  }

  async loadTurnRecords(): Promise<ConversationTurnRecord[]> {
    const entries = await readJsonlEntries<ConversationTurnRecord & { kind?: string }>(this.currentTranscriptPath)
    return entries.filter((entry) => entry.kind === 'turn') as ConversationTurnRecord[]
  }

  private refreshSnapshot(): void {
    this.snapshotState = {
      conversationId: this.currentConversationId,
      directory: this.currentDirectory,
      transcriptPath: this.currentTranscriptPath,
      messages: this.messages,
      status: this.status,
      error: this.error,
      initialized: this.initialized,
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private assignConversationPaths(conversationId: string): void {
    this.currentConversationId = conversationId
    this.currentDirectory = path.join(this.rootPath, '.gambit', 'conversations', conversationId)
    this.currentTranscriptPath = path.join(this.currentDirectory, 'transcript.jsonl')
  }

  private async persistMessageSnapshot(messages: ConversationMessage[]): Promise<void> {
    await this.ensureReady()
    await writeJsonlEntries(
      this.currentTranscriptPath,
      messages.map((message) => ({
        kind: 'message',
        ...message,
      })),
    )
  }
}

export function createConversationStore(options: ConversationStoreOptions = {}): ConversationStore {
  return new ConversationStore(options)
}

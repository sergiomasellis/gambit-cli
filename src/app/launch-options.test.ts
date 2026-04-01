import { expect, test } from 'bun:test'

import { parseLaunchOptions } from './launch-options'

test('defaults to a new session when no launch flags are provided', () => {
  expect(parseLaunchOptions([])).toEqual({ mode: 'new', conversationId: undefined, query: undefined })
})

test('parses continue mode', () => {
  expect(parseLaunchOptions(['--continue'])).toEqual({
    mode: 'continue',
    conversationId: undefined,
    query: undefined,
  })
})

test('parses resume picker mode with an optional query', () => {
  expect(parseLaunchOptions(['--resume'])).toEqual({
    mode: 'resume-picker',
    conversationId: undefined,
    query: undefined,
  })

  expect(parseLaunchOptions(['--resume', 'auth bug'])).toEqual({
    mode: 'resume-picker',
    conversationId: undefined,
    query: 'auth bug',
  })
})

test('parses resume by conversation id when the value is a uuid', () => {
  expect(parseLaunchOptions(['--resume', '7d8ef8c1-20d2-4c65-8f0c-0db4488ac7f9'])).toEqual({
    mode: 'resume-id',
    conversationId: '7d8ef8c1-20d2-4c65-8f0c-0db4488ac7f9',
    query: undefined,
  })
})

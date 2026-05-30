import { expect, test } from 'bun:test'

import { buildInstallerArgs, parseUpdateArgs } from './update'

test('parses update defaults', () => {
  expect(parseUpdateArgs([])).toEqual({
    version: undefined,
    installDir: undefined,
    noModifyPath: false,
    help: false,
  })
  expect(buildInstallerArgs(parseUpdateArgs([]))).toEqual(['latest'])
})

test('parses positional and flag versions', () => {
  expect(parseUpdateArgs(['0.8.0']).version).toBe('0.8.0')
  expect(parseUpdateArgs(['--version', 'v0.8.0']).version).toBe('v0.8.0')
  expect(parseUpdateArgs(['-v', '0.8.1']).version).toBe('0.8.1')
})

test('passes install options through to the installer', () => {
  const options = parseUpdateArgs(['latest', '--install-dir', '/tmp/bin', '--no-modify-path'])
  expect(buildInstallerArgs(options)).toEqual(['latest', '--install-dir', '/tmp/bin', '--no-modify-path'])
})

test('treats stable as the latest release alias', () => {
  expect(buildInstallerArgs(parseUpdateArgs(['stable']))).toEqual(['latest'])
})

test('rejects invalid update arguments', () => {
  expect(() => parseUpdateArgs(['--version'])).toThrow('--version requires a version argument.')
  expect(() => parseUpdateArgs(['--install-dir'])).toThrow('--install-dir requires a path argument.')
  expect(() => parseUpdateArgs(['--bad'])).toThrow('Unknown update option: --bad')
  expect(() => parseUpdateArgs(['0.8.0', '0.8.1'])).toThrow('Multiple versions provided')
})

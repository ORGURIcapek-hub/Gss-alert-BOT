import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCRATCH_DIR = path.join(__dirname, '..', 'scratch_test')

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const tmpPath = `${filePath}.${randomSuffix}.tmp`
  const payload = JSON.stringify(data, null, 2)

  await fs.promises.writeFile(tmpPath, payload, 'utf-8')

  let attempts = 0
  const maxAttempts = 5
  while (attempts < maxAttempts) {
    try {
      await fs.promises.rename(tmpPath, filePath)
      return
    } catch (err) {
      attempts++
      if (attempts >= maxAttempts) {
        try {
          await fs.promises.copyFile(tmpPath, filePath)
          await fs.promises.unlink(tmpPath).catch(() => {})
          return
        } catch (copyErr) {
          await fs.promises.unlink(tmpPath).catch(() => {})
          throw copyErr
        }
      }
      await new Promise(resolve => setTimeout(resolve, attempts * 40))
    }
  }
}

async function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback
    }
    const raw = await fs.promises.readFile(filePath, 'utf-8')
    const cleaned = raw.replace(/^\uFEFF/, '').trim()
    if (!cleaned) {
      return fallback
    }
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

test('atomic storage: readJsonSafe returns fallback when file does not exist', async () => {
  const nonExistentPath = path.join(SCRATCH_DIR, 'non-existent.json')
  const fallback = { status: 'fallback', items: [] }
  const result = await readJsonSafe(nonExistentPath, fallback)
  assert.deepEqual(result, fallback)
})

test('atomic storage: writeJsonAtomic creates file and readJsonSafe reads it correctly', async () => {
  const testPath = path.join(SCRATCH_DIR, 'single-write.json')
  const payload = { id: 'test-1', users: [{ name: 'Somchai' }] }

  await writeJsonAtomic(testPath, payload)
  const readBack = await readJsonSafe(testPath, null)

  assert.deepEqual(readBack, payload)
  await fs.promises.unlink(testPath).catch(() => {})
})

test('atomic storage: readJsonSafe safely handles corrupted JSON without crashing', async () => {
  const corruptPath = path.join(SCRATCH_DIR, 'corrupt.json')
  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true })
  }
  await fs.promises.writeFile(corruptPath, '{"unfinished_json": [1, 2, ', 'utf-8')

  const fallback = { safe: true }
  const result = await readJsonSafe(corruptPath, fallback)
  assert.deepEqual(result, fallback)

  await fs.promises.unlink(corruptPath).catch(() => {})
})

test('atomic storage: handles high-concurrency writes without corrupting JSON', async () => {
  const concurrentPath = path.join(SCRATCH_DIR, 'concurrent.json')

  const writePromises = []
  for (let i = 0; i < 15; i++) {
    writePromises.push(
      writeJsonAtomic(concurrentPath, {
        iteration: i,
        timestamp: Date.now(),
        items: Array.from({ length: 50 }, (_, idx) => `item_${i}_${idx}`)
      })
    )
  }

  await Promise.all(writePromises)

  const finalRead = await readJsonSafe(concurrentPath, null)
  assert.notEqual(finalRead, null)
  assert.ok(typeof finalRead.iteration === 'number')
  assert.equal(finalRead.items.length, 50)

  await fs.promises.unlink(concurrentPath).catch(() => {})
  if (fs.existsSync(SCRATCH_DIR)) {
    await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true }).catch(() => {})
  }
})

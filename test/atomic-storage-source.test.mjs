import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { writeJsonAtomic, readJsonSafe } = await import('../src/lib/atomic-storage.ts')

const SCRATCH_DIR = path.join(os.tmpdir(), `okr-atomic-test-${process.pid}-${Date.now()}`)

function scratchFile(name) {
  return path.join(SCRATCH_DIR, name)
}

test('atomic-storage [real source]: readJsonSafe returns fallback when file does not exist', async () => {
  const result = await readJsonSafe(scratchFile('missing.json'), { fallback: true, items: [] })
  assert.deepEqual(result, { fallback: true, items: [] })
})

test('atomic-storage [real source]: writeJsonAtomic creates nested dirs, writes, and round-trips', async () => {
  const target = scratchFile('nested/deep/dir/data.json')
  const payload = { id: 'x1', users: [{ name: 'สมชาย' }], ok: true }

  await writeJsonAtomic(target, payload)

  assert.equal(fs.existsSync(target), true)
  const readBack = await readJsonSafe(target, null)
  assert.deepEqual(readBack, payload)

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: leaves no .tmp litter after a successful write', async () => {
  const target = scratchFile('litter.json')
  await writeJsonAtomic(target, { n: 1 })

  const leftovers = fs.readdirSync(SCRATCH_DIR).filter(f => f.endsWith('.tmp'))
  assert.deepEqual(leftovers, [])

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: readJsonSafe handles corrupted JSON without crashing', async () => {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true })
  const corruptPath = scratchFile('corrupt.json')
  await fs.promises.writeFile(corruptPath, '{"unfinished_json": [1, 2, ', 'utf-8')

  const fallback = { safe: true }
  assert.deepEqual(await readJsonSafe(corruptPath, fallback), fallback)

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: readJsonSafe strips UTF-8 BOM before parsing', async () => {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true })
  const bomPath = scratchFile('bom.json')
  await fs.promises.writeFile(bomPath, '\uFEFF{"bom": true}', 'utf-8')

  assert.deepEqual(await readJsonSafe(bomPath, null), { bom: true })

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: readJsonSafe treats whitespace-only file as missing (fallback)', async () => {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true })
  const blankPath = scratchFile('blank.json')
  await fs.promises.writeFile(blankPath, '   \n\t  ', 'utf-8')

  assert.deepEqual(await readJsonSafe(blankPath, { empty: 'fallback' }), { empty: 'fallback' })

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: serial read-modify-write keeps data intact', async () => {
  const target = scratchFile('serial.json')

  for (let i = 0; i < 10; i++) {
    const current = (await readJsonSafe(target, { count: 0, log: [] }))
    current.count += 1
    current.log.push(i)
    await writeJsonAtomic(target, current)
  }

  const final = await readJsonSafe(target, null)
  assert.equal(final.count, 10)
  assert.deepEqual(final.log, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: high-concurrency writes always leave valid JSON', async () => {
  const concurrentPath = scratchFile('concurrent.json')

  const writePromises = []
  for (let i = 0; i < 20; i++) {
    writePromises.push(
      writeJsonAtomic(concurrentPath, {
        iteration: i,
        items: Array.from({ length: 80 }, (_, idx) => `item_${i}_${idx}`)
      })
    )
  }
  await Promise.all(writePromises)

  const finalRead = await readJsonSafe(concurrentPath, null)
  assert.notEqual(finalRead, null)
  assert.ok(typeof finalRead.iteration === 'number')
  assert.ok(finalRead.iteration >= 0 && finalRead.iteration <= 19)
  assert.equal(finalRead.items.length, 80)

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

test('atomic-storage [real source]: round-trips Thai text and unicode without corruption', async () => {
  const target = scratchFile('thai.json')
  const payload = {
    name: 'ผศ.ดร.สมชาย ใจดี',
    dept: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    emoji: '🎯OKR ✅',
    progress: 88.5
  }

  await writeJsonAtomic(target, payload)
  assert.deepEqual(await readJsonSafe(target, null), payload)

  await fs.promises.rm(SCRATCH_DIR, { recursive: true, force: true })
})

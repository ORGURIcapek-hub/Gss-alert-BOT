import fs from 'fs'
import path from 'path'

export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
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
    } catch (err: any) {
      attempts
      if (attempts >= maxAttempts) {
        try {
          await fs.promises.copyFile(tmpPath, filePath)
          await fs.promises.unlink(tmpPath).catch(() => { })
          return
        } catch (copyErr) {
          await fs.promises.unlink(tmpPath).catch(() => { })
          throw copyErr
        }
      }
      await new Promise(resolve => setTimeout(resolve, attempts * 40))
    }
  }
}

export async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback
    }
    const raw = await fs.promises.readFile(filePath, 'utf-8')
    const cleaned = raw.replace(/^\uFEFF/, '').trim()
    if (!cleaned) {
      return fallback
    }
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

import { registerHooks } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

const projectRoot = process.cwd()
const srcRoot = pathToFileURL(path.join(projectRoot, 'src') + '/')

let hookInstalled = false

const TYPE_ONLY_EXPORTS = new Map([
  ['@/types/database.types', [
    'OKR', 'ProjectWithHeadAndAssignees', 'ProjectAssignment', 'ProjectStatus',
    'UserProfile', 'UserRole', 'DashboardReport', 'NormalReport',
    'EvidenceSubmission', 'Evaluation', 'ExecutiveSummaryProjectSnapshot',
    'DashboardReportWithDetails', 'EvidenceFile', 'AssigneeWithUser',
    'RegisterData', 'LoginResult', 'RoleConfigItem', 'PasswordCriteria',
    'EmailValidation', 'PasswordStrengthMeta', 'StorageSchema', 'OKRStorageSchema'
  ]],
  ['@/lib/user-constants', ['LucideIcon']],
  ['@/lib/password-utils', ['PasswordCriteria', 'EmailValidation', 'PasswordStrengthMeta']]
])

function installModuleHooks() {
  if (hookInstalled) return
  hookInstalled = true

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        const url = new URL(specifier.slice(2) + '.ts', srcRoot).href
        return { url, shortCircuit: true, format: 'module-typescript' }
      }
      if (specifier === 'next/server') {
        const url = pathToFileURL(path.join(projectRoot, 'node_modules', 'next', 'server.js')).href
        return { url, shortCircuit: true }
      }
      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      const pathname = url.startsWith('file://') ? new URL(url).pathname.replace(/^\/([A-Za-z]:)/, '$1') : url

      if (pathname.endsWith('lucide-react') || pathname.includes('node_modules/lucide-react/')) {
        const icon = () => null
        const shimSource = `
          const icon = () => null
          export default icon
          export const Crown = icon; export const Layers = icon; export const GraduationCap = icon;
          export const Briefcase = icon; export const Shield = icon; export const User = icon;
          export const Menu = icon; export const X = icon; export const Calendar = icon;
          export const Filter = icon; export const Bell = icon; export const ChevronRight = icon;
          export const LogOut = icon; export const Target = icon; export const FolderGit2 = icon;
          export const FileCheck2 = icon; export const Users = icon; export const UserCheck = icon;
          export const KeyRound = icon; export const Inbox = icon; export const Send = icon;
          export const Award = icon; export const FilePlus = icon; export const FileSpreadsheet = icon;
          export const FileText = icon; export const FolderPlus = icon; export const AlertCircle = icon;
          export const CheckCircle2 = icon; export const RefreshCw = icon; export const Clock = icon;
          export const Trash2 = icon; export const Loader2 = icon; export const Search = icon;
        `
        return { format: 'module', source: shimSource, shortCircuit: true }
      }

      for (const [mod, typeNames] of TYPE_ONLY_EXPORTS) {
        const modFileUrl = new URL(mod.slice(2) + '.ts', srcRoot).href
        if (url === modFileUrl) {
          const passthrough = typeNames.map(n => `export const ${n} = undefined`).join('\n')
          const real = fs.readFileSync(new URL(mod.slice(2) + '.ts', srcRoot), 'utf-8')
          return { format: 'module-typescript', source: real + '\n' + passthrough, shortCircuit: true }
        }
      }

      return nextLoad(url, context)
    }
  })
}

installModuleHooks()

let envCounter = 0

export function createApiTestEnv({ fixtureName } = {}) {
  const envRoot = fs.mkdtempSync(path.join(os.tmpdir(), `okr-api-${fixtureName || 'test'}-`))
  fs.mkdirSync(path.join(envRoot, 'data'), { recursive: true })

  const originalCwd = process.cwd()
  const originalEnv = { ...process.env }
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  process.chdir(envRoot)

  envCounter++
  const importEpoch = `env${envCounter}`

  return {
    root: envRoot,
    dataDir: path.join(envRoot, 'data'),

    importRoute(relPath) {
      return import(`../../src/${relPath}?epoch=${importEpoch}`)
    },

    dataPath(name) {
      return path.join(envRoot, 'data', name)
    },

    seed(name, data) {
      fs.writeFileSync(path.join(envRoot, 'data', name), JSON.stringify(data, null, 2), 'utf-8')
    },

    read(name) {
      const p = path.join(envRoot, 'data', name)
      if (!fs.existsSync(p)) return null
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    },

    restore() {
      process.chdir(originalCwd)
      for (const k of Object.keys(originalEnv)) process.env[k] = originalEnv[k]
      for (const k of Object.keys(process.env)) {
        if (!(k in originalEnv)) delete process.env[k]
      }
      try {
        fs.rmSync(envRoot, { recursive: true, force: true })
      } catch {}
    }
  }
}

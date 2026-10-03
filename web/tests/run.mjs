// Roda os testes de tests/*.test.mjs com o runner nativo do Node.
// Lista os arquivos aqui em vez de usar glob no package.json: glob entre aspas não é
// expandido no PowerShell/CMD, e sem argumentos o `node --test` varreria .next/ e out/.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort().map(f => join(dir, f))
if (!files.length) {
  console.error('Nenhum teste encontrado em tests/')
  process.exit(1)
}
const { status } = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })
process.exit(status ?? 1)

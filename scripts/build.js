/** Emit the lazy factory format consumed by Harness client-modules. */
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

const result = await build({
  entryPoints: ['src/client/index.jsx'], bundle: true, write: false,
  format: 'cjs', platform: 'browser', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'text' },
})
const text = result.outputFiles[0].text.replaceAll('\\r\\n', '\\n').replace(/\r\n/g, '\n')
await mkdir('lib', { recursive: true })
await writeFile('lib/client.js', 'window.__ModuleLoader__.load({id:"@civilization/deepseek-harness-skill-mcp",factory:(require)=>{\nvar module={exports:{}};var exports=module.exports;\n'
  + text + '\nreturn module.exports;}});\n')

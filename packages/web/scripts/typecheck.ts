/**
 * `tsc --noEmit` for packages/web, reporting only diagnostics in our own
 * files.
 *
 * Our code imports the vendored engine and the vendored upstream UI as
 * TypeScript source, so those files are part of the program and get our
 * compiler options. Upstream checks them with its own settings (and an
 * older/newer TypeScript): e.g. the engine does not use
 * `noUncheckedIndexedAccess`, which we keep for our code. Their diagnostics
 * are counted and skipped here; the engine's own suite (`pnpm run
 * engine:check`) and upstream's CI type-check that code.
 */
import { relative, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dir, "..");
const configPath = resolve(root, "tsconfig.json");
const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
    throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  },
});
if (!parsed) throw new Error(`cannot read ${configPath}`);

const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences });
const all = ts.getPreEmitDiagnostics(program);
const ours = (file: string) => {
  const path = relative(root, file);
  return !path.startsWith("..") && !path.includes("node_modules");
};
const mine = all.filter((d) => !d.file || ours(d.file.fileName));
const skipped = all.length - mine.length;

const host: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (f) => f,
  getCurrentDirectory: () => root,
  getNewLine: () => "\n",
};
if (mine.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(mine, host));
  console.error(`${mine.length} error(s) in packages/web (${skipped} in vendored code ignored).`);
  process.exit(1);
}
console.log(`typecheck: OK (${program.getRootFileNames().length} files; ${skipped} diagnostics in vendored code ignored)`);

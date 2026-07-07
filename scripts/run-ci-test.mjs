import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const tempDirectory = mkdtempSync(join(tmpdir(), 'exit-locale-vitest-'));
const outputPath = join(tempDirectory, 'output.log');

function escapeAnnotationMessage(message) {
  return message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

const shellCommand = `pnpm exec vitest run ${args.map((arg) => JSON.stringify(arg)).join(' ')} --reporter=verbose 2>&1 | tee ${JSON.stringify(outputPath)}`;
const child = spawn('bash', ['-o', 'pipefail', '-c', shellCommand], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  if (code && code !== 0) {
    const output = readFileSync(outputPath, 'utf8');
    const tail = output.split(/\r?\n/).slice(-80).join('\n');
    console.error(`::error title=Vitest failed::${escapeAnnotationMessage(tail)}`);
  }

  rmSync(tempDirectory, { recursive: true, force: true });
  process.exit(code ?? 1);
});

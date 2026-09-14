#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { checkReadiness, VERSION } from './index.js';
import type { ReadinessReport } from './types.js';

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === '--version' || command === '-v') {
    console.log(VERSION);
    return 0;
  }
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return command ? 0 : 1;
  }
  if (command !== 'check') {
    console.error(`Unknown command "${command}". Run "ucp-ready --help" for usage.`);
    return 1;
  }

  const { values, positionals } = parseArgs({
    args: rest,
    options: { json: { type: 'boolean', default: false } },
    allowPositionals: true,
  });

  const url = positionals[0];
  if (!url) {
    console.error('Usage: ucp-ready check <url> [--json]');
    return 1;
  }

  const report = await checkReadiness(url);

  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  return report.verdict === 'ready' ? 0 : 1;
}

function printHelp(): void {
  console.log(`ucp-ready v${VERSION}

Usage:
  ucp-ready check <url> [--json]   Check a store's UCP + AP2 readiness
  ucp-ready --version              Print the version
  ucp-ready --help                 Show this help
`);
}

function printHumanReport(report: ReadinessReport): void {
  console.log(`UCP + AP2 readiness for ${report.url}`);
  console.log(`Verdict: ${report.verdict.toUpperCase()}`);
  console.log('');
  for (const check of report.checks) {
    const icon = check.severity === 'pass' ? '✔' : check.severity === 'warn' ? '⚠' : '✘';
    console.log(`${icon} [${check.severity.toUpperCase()}] ${check.title}`);
    console.log(`  ${check.message}`);
    if (check.remediation) console.log(`  → ${check.remediation}`);
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  },
);

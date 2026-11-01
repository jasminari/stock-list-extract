import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { config } from 'dotenv';
import { fetchBusinessEvidence } from './lib/dart-business.mjs';

config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const dateStr = process.argv[2] ?? '20261019';
if (!/^\d{8}$/.test(dateStr)) throw new Error('Usage: node scripts/collect-dart-business.mjs YYYYMMDD');

const comparisonFile = path.resolve(process.cwd(), `output/rise-comparison-${dateStr}/comparison.json`);
const outputDir = path.resolve(process.cwd(), `output/dart-business-${dateStr}`);
const outputFile = path.join(outputDir, 'evidence.json');
const comparison = JSON.parse(await fs.readFile(comparisonFile, 'utf8'));
const targets = comparison.results.filter((row) => row.after == null).map(({ code, name }) => ({ code, name }));

const evidence = {};
for (let index = 0; index < targets.length; index += 1) {
  const stock = targets[index];
  try {
    const result = await fetchBusinessEvidence(stock.code, dateStr);
    evidence[stock.code] = result
      ? { name: stock.name, status: 'ok', ...result }
      : { name: stock.name, status: 'not-found', error: 'No as-of-date periodic filing with substantive business sections' };
  } catch (error) {
    evidence[stock.code] = { name: stock.name, status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
  process.stdout.write(`[${index + 1}/${targets.length}] ${stock.code} ${stock.name}: ${evidence[stock.code].status}\n`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify({ date: dateStr, generatedAt: new Date().toISOString(), targetCount: targets.length, evidence }, null, 2)}\n`);
}

const covered = Object.values(evidence).filter((item) => item.status === 'ok').length;
process.stdout.write(`DART business evidence: ${covered}/${targets.length} covered; ${outputFile}\n`);

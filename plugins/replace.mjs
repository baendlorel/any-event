// @ts-check
import { readFileSync } from 'node:fs';
import pkg from '../package.json' with { type: 'json' };
import { join } from 'node:path';

function formatDateFull(dt = new Date()) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  const ms = String(dt.getMilliseconds()).padStart(3, '0');
  return `${y}.${m}.${d} ${hh}:${mm}:${ss}.${ms}`;
}

const __NAME__ = pkg.name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

const __PKG_INFO__ = `## About
 * @package ${__NAME__}
 * @author ${pkg.author.name} <${pkg.author.email}>
 * @version ${pkg.version} (Last Update: ${formatDateFull()})
 * @license ${pkg.license}
 * @link ${pkg.repository.url}
 * @description ${pkg.description.replace(/\n/g, '\n * \n * ')}
 * @copyright Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}. All rights reserved.`;

function getWildcardRules() {
  const TITLE = '### Wildcard Rules';
  const content = readFileSync(join(process.cwd(), 'README.md'), 'utf-8');
  const start = content.indexOf(TITLE) + TITLE.length;
  const end = content.indexOf('## Types');
  const str = content.slice(start, end).trim();
  return str.split('\n').join('\n     * '); // it is counted to be 5 spaces
}

/**
 * @type {import('@rollup/plugin-replace').RollupReplaceOptions}
 */
export const replaceOpts = {
  preventAssignment: true,
  values: {
    __NAME__,
    __PKG_INFO__,
    __WILDCARD_RULES__: getWildcardRules(),
  },
};

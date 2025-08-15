// @ts-check
import pkg from '../package.json' with { type: 'json' };

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

const __WILDCARD_RULES__ = `**Wildcard matching rules**:
   * - \`*\` matches a single segment (e.g. \`user.*\` matches \`user.login\`, not \`user.profile.update\`)
   * - \`**\` matches multiple segments (e.g. \`user.**\` matches \`user.login\`, \`user.profile.update\`, \`user.settings.privacy.change\`, and \`user\` itself)
   * - Cannot use both \`**\` and \`*\` in the same identifier
   * - Cannot use more than 2 \`*\`s
   * - Cannot starts or ends with \`.\`
   * - Mixed: \`user.*.settings\` matches \`user.admin.settings\`, \`user.guest.settings\`
   * - Only registration (on/once) supports wildcards; emit must use concrete event names
`;
/**
 * @type {import('@rollup/plugin-replace').RollupReplaceOptions}
 */
export const replaceOpts = {
  preventAssignment: true,
  values: {
    __NAME__,
    __PKG_INFO__,
    __WILDCARD_RULES__,
  },
};

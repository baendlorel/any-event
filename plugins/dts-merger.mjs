// @ts-check
import { readdirSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import console from 'node:console';

/**
 * Find all .d.ts files in src and prepend their content to dist/index.d.ts
 */
export function dtsMerger() {
  return {
    name: 'prepend-all-dts',
    writeBundle() {
      const srcDir = path.resolve('src');
      const distDts = path.resolve('dist/index.d.ts');
      if (!existsSync(distDts)) {
        console.warn(`Warning: ${distDts} does not exist, skipping prependAllDts.`);
        return;
      }
      const dtsFiles = [];
      function findDtsFiles(dir) {
        for (const file of readdirSync(dir)) {
          const fullPath = path.join(dir, file);
          if (!existsSync(fullPath)) {
            throw new Error(`File not found: ${fullPath}`);
          }
          if (file.endsWith('.d.ts')) {
            dtsFiles.push(fullPath);
            continue;
          }
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            findDtsFiles(fullPath);
          }
        }
      }

      findDtsFiles(srcDir);
      const allDtsContent = [];
      for (let i = 0; i < dtsFiles.length; i++) {
        const relativePath = path.relative(srcDir, dtsFiles[i]);
        const content = readFileSync(dtsFiles[i], 'utf8');
        allDtsContent.push(`// # from: ${relativePath}`, content);
      }
      const indexContent = readFileSync(distDts, 'utf8');
      allDtsContent.push('// # index.d.ts', indexContent);

      const content = allDtsContent.join('\n');
      writeFileSync(distDts, content, 'utf8');
    },
  };
}

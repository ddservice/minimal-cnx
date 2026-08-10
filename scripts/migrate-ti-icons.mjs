/**
 * Replace <i className="ti ..."> with <Icon ...> and add import.
 * Run: node scripts/migrate-ti-icons.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKIP = new Set(['components\\icon.js', 'components/icon.js']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'scripts') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function ensureImport(src, relImport) {
  if (/from ['"][^'"]*icon['"]/.test(src)) return src;
  const m = src.match(/^((?:['"]use (?:client|server)['"];\r?\n)?)([\s\S]*)$/);
  const directive = m?.[1] || '';
  const rest = m?.[2] ?? src;
  return `${directive}import Icon from '${relImport}';\n${rest}`;
}

function relToIcon(file) {
  let rel = path.relative(path.dirname(file), path.join(ROOT, 'components', 'icon.js')).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.replace(/\.js$/, '');
}

const files = walk(path.join(ROOT, 'app')).concat(walk(path.join(ROOT, 'components')));
let changed = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP.has(rel)) continue;

  let src = fs.readFileSync(file, 'utf8');
  if (!/<i\b[^>]*\bti[- ]/.test(src) && !/<i\b[^>]*className=\{`ti /.test(src)) continue;

  const before = src;

  // Dynamic: className={`ti ${expr}`}
  src = src.replace(/<i(\s+)className=\{`ti \$\{([^}]+)\}`\}/g, '<Icon$1name={$2}');

  // Static: className="ti ti-xxx"
  src = src.replace(/<i(\s+)className="ti (ti-[a-z0-9-]+)"/g, '<Icon$1name="$2"');

  // Static: className={'ti ti-xxx'} or {"ti ti-xxx"}
  src = src.replace(/<i(\s+)className=\{(['"])ti (ti-[a-z0-9-]+)\2\}/g, '<Icon$1name="$3"');

  if (src === before) continue;

  // Close tags that were </i> after Icon opens in this file — only replace </i> when preceded by Icon usage
  // Safer: replace </i> only on lines that also have Icon, or convert self-closing leftovers
  src = src.replace(/<Icon\b([^>]*?)>\s*<\/i>/g, '<Icon$1 />');
  src = src.replace(/<Icon\b([^>]*?)\s*>\s*<\/Icon>/g, '<Icon$1 />');

  // Any remaining open Icon ... </i>
  src = src.replace(/(<Icon\b[^>]*>)([\s\S]*?)<\/i>/g, '$1$2</Icon>');

  src = ensureImport(src, relToIcon(file));
  fs.writeFileSync(file, src);
  changed++;
  console.log('updated', rel);
}

console.log('files changed:', changed);

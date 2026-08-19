import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve('.');
const evidenceDir = path.join(root, 'copyright-materials/09-evidence');
const releaseDir = path.join(root, 'copyright-materials/02-release');
fs.mkdirSync(evidenceDir, { recursive: true });
fs.mkdirSync(releaseDir, { recursive: true });

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

const logHeader = [
  '园区综合能源项目投资收益测算与辅助决策系统 V2.14',
  'Git提交记录（按时间正序）',
  `导出时间：${new Date().toISOString()}`,
  '',
].join('\n');
const log = git('log', '--reverse', '--date=iso-strict', '--pretty=format:%H\t%ad\t%an\t%ae\t%s');
fs.writeFileSync(path.join(evidenceDir, 'Git提交记录.txt'), `${logHeader}${log}\n`, 'utf8');

const tracked = git('ls-files').split('\n').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
const candidates = [...new Set([...tracked, ...untracked])].sort();
const rootAllowlist = new Set([
  '.gitignore', 'AGENTS.md', 'App.tsx', 'BUILD_README.md', 'CHANGELOG.md', 'README.md',
  'electron-builder-simple.json', 'electron-builder.json', 'index.css', 'index.html', 'index.tsx',
  'package-lock.json', 'package.json', 'tsconfig.json', 'types.ts', 'vercel.json', 'vite.config.ts',
]);
const prefixAllowlist = ['components/', 'context/', 'electron/', 'modules/', 'services/', 'shared/', 'utils/', 'types/'];
const excluded = [
  '.env', '.env.development', '.env.local', 'electron/main 2.js',
  'components/RetrofitAI.tsx', 'components/RetrofitVPP.tsx', 'components/RetrofitCarbon.tsx',
  'components/VisualAnalysis.tsx',
];
const fileList = candidates.filter(file => (
  (rootAllowlist.has(file) || prefixAllowlist.some(prefix => file.startsWith(prefix)))
  && !excluded.includes(file)
  && !file.endsWith('.map')
  && !/\.(png|jpe?g|gif|ico|icns|pdf|xlsx|docx|zip|dmg)$/i.test(file)
));
fs.writeFileSync(path.join(releaseDir, 'V2.14文件清单.txt'), [
  '园区综合能源项目投资收益测算与辅助决策系统 V2.14',
  '候选源码归档白名单；最终冻结前须再次生成并比对。',
  ...fileList,
  '',
].join('\n'), 'utf8');

const materialRoots = ['01-basic', '03-security', '04-scope', '05-testing', '09-evidence'];
const materialFiles = [];
const walk = directory => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else materialFiles.push(fullPath);
  }
};
materialRoots.forEach(directory => walk(path.join(root, 'copyright-materials', directory)));
const hashes = materialFiles.sort().map(file => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return `${hash}  ${path.relative(root, file)}`;
});
fs.writeFileSync(path.join(releaseDir, 'V2.14-SHA256.txt'), [
  '# 候选材料SHA256；安装包、源码归档和最终申报包生成后须重新生成。',
  ...hashes,
  '',
].join('\n'), 'utf8');

console.log(JSON.stringify({ commits: log.split('\n').length, sourceFiles: fileList.length, hashedMaterials: hashes.length }, null, 2));

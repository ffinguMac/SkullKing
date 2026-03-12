#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import { platform } from 'os';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT ?? 3000;
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

function findCloudflared() {
  if (platform() === 'win32') {
    try {
      const out = execSync('where.exe cloudflared', { encoding: 'utf8', timeout: 3000 });
      const path = out.trim().split('\n')[0]?.trim();
      if (path && existsSync(path)) return path;
    } catch {}
    const localAppData = process.env['LOCALAPPDATA'] ?? '';
    const winGetPath = join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    if (localAppData && existsSync(winGetPath)) {
      try {
        const dirs = readdirSync(winGetPath);
        const pkg = dirs.find((d) => d.startsWith('Cloudflare.cloudflared'));
        if (pkg) {
          const exe = join(winGetPath, pkg, 'cloudflared.exe');
          if (existsSync(exe)) return exe;
        }
      } catch {}
    }
    const candidates = [
      join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'cloudflared', 'cloudflared.exe'),
      join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'cloudflared', 'cloudflared.exe'),
      join(localAppData, 'cloudflared', 'cloudflared.exe'),
    ];
    for (const p of candidates) {
      if (p && existsSync(p)) return p;
    }
  }
  return 'cloudflared';
}

function checkCloudflared() {
  const cmd = findCloudflared();
  try {
    execSync(`"${cmd}" --version`, { shell: true, timeout: 5000, stdio: 'pipe' });
    return cmd;
  } catch {
    return null;
  }
}

async function main() {
  const cloudflaredPath = checkCloudflared();
  if (!cloudflaredPath) {
    console.error(`
cloudflared를 찾을 수 없습니다. 먼저 설치해 주세요.

설치 방법:
- Windows: winget install cloudflare.cloudflared
  또는 https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
- macOS: brew install cloudflared
- Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
`);
    process.exit(1);
  }

  console.log(`\n🚀 Cloudflare Tunnel 시작 (http://localhost:${PORT})\n`);

  const args = ['tunnel', '--url', `http://localhost:${PORT}`];
  if (platform() === 'win32') {
    const metricsPort = 20000 + (process.pid % 10000);
    args.push('--metrics', `127.0.0.1:${metricsPort}`);
  }
  const proc = spawn(cloudflaredPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: platform() === 'win32',
  });

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  const onData = (data) => {
    const str = String(data);
    const match = str.match(URL_RE);
    if (match) {
      const url = match[0];
      console.log('\n' + '='.repeat(60));
      console.log('  📎 친구에게 공유할 URL:');
      console.log('  ' + url);
      console.log('='.repeat(60) + '\n');
    }
    process.stdout.write(str);
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

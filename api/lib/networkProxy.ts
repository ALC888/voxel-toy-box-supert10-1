import { execSync } from 'node:child_process';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

let configured = false;
let configuredProxyUrl: string | null = null;

function getEnvProxyUrl() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    process.env.all_proxy ||
    process.env.LOCAL_PROXY_URL ||
    null
  );
}

function normalizeProxyServer(rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return null;
  }

  const firstEntry = trimmed.includes(';')
    ? (trimmed
        .split(';')
        .map((entry) => entry.trim())
        .find((entry) => entry.toLowerCase().startsWith('https=')) ??
      trimmed.split(';')[0])
    : trimmed;

  const value = firstEntry.includes('=')
    ? firstEntry.slice(firstEntry.indexOf('=') + 1).trim()
    : firstEntry;

  if (!value) {
    return null;
  }

  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `http://${value}`;
}

function readWindowsProxyUrl() {
  if (process.platform !== 'win32') {
    return null;
  }

  try {
    const enableOutput = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
      { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }
    );

    if (!enableOutput.includes('0x1')) {
      return null;
    }

    const serverOutput = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }
    );

    const lines = serverOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const rawLine = lines.find((line) => line.includes('ProxyServer'));

    if (!rawLine) {
      return null;
    }

    const rawValue = rawLine.split(/\s{2,}/).at(-1) ?? '';
    return normalizeProxyServer(rawValue);
  } catch {
    return null;
  }
}

export function getConfiguredProxyUrl() {
  return configuredProxyUrl;
}

export function configureOutboundProxyOnce() {
  if (configured) {
    return configuredProxyUrl;
  }

  const proxyUrl = getEnvProxyUrl() ?? readWindowsProxyUrl();

  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    configuredProxyUrl = proxyUrl;
    process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || proxyUrl;
    process.env.HTTP_PROXY = process.env.HTTP_PROXY || proxyUrl;
    process.env.ALL_PROXY = process.env.ALL_PROXY || proxyUrl;
  }

  configured = true;
  return configuredProxyUrl;
}

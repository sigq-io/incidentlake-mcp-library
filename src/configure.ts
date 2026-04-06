import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SigqConfig {
  apiUrl: string;
  apiToken: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.sigq');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function loadConfig(): SigqConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as SigqConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: SigqConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function testConnection(apiUrl: string, apiToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/v1/incidents?limit=1`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function runConfigure(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nWelcome to Incident Lake MCP setup!\n');

  const defaultUrl = 'https://api.prod.incidentlake.sigq.io/incidentlake/public-api';

  const rawUrl = await prompt(rl, `? Enter your SIGQ API URL (press Enter for default):\n  [${defaultUrl}]: `);
  const apiUrl = rawUrl || defaultUrl;

  const apiToken = await prompt(rl, '\n? Enter your API token (starts with sigq_): ');

  if (!apiToken.startsWith('sigq_')) {
    console.error('\n✗ Token must start with "sigq_". Please check your token and try again.');
    rl.close();
    process.exit(1);
  }

  process.stdout.write('\n? Testing connection... ');
  const ok = await testConnection(apiUrl, apiToken);

  if (!ok) {
    console.error('✗ Connection failed. Please check your API URL and token.');
    rl.close();
    process.exit(1);
  }

  console.log('✓ Connected successfully!');

  saveConfig({ apiUrl, apiToken });
  console.log(`\n✓ Config saved to ${CONFIG_FILE}\n`);

  const configBlock = JSON.stringify(
    {
      mcpServers: {
        'incidentlake-mcp': {
          command: 'npx',
          args: ['@sigq-io/incidentlake-mcp-library'],
        },
      },
    },
    null,
    2,
  );

  console.log('─'.repeat(60));
  console.log('Add this to your Claude Desktop config file:\n');
  console.log(configBlock);
  console.log('\nConfig file location:');
  console.log('  Mac:     ~/Library/Application Support/Claude/claude_desktop_config.json');
  console.log('  Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
  console.log('─'.repeat(60));
  console.log('\nRestart Claude Desktop and you\'re done!\n');

  rl.close();
}

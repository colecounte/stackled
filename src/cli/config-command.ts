import { loadConfig, saveConfig, resetConfig, StackledConfig } from '../core/config-manager';

type OutputFormat = StackledConfig['outputFormat'];

function isOutputFormat(value: string): value is OutputFormat {
  return ['text', 'json', 'markdown'].includes(value);
}

export function handleConfigGet(key: keyof StackledConfig): void {
  const config = loadConfig();
  if (!(key in config)) {
    console.error(`Unknown config key: ${key}`);
    process.exit(1);
  }
  const value = config[key];
  console.log(Array.isArray(value) ? value.join(', ') || '(none)' : String(value));
}

export function handleConfigSet(key: string, value: string): void {
  const update: Partial<StackledConfig> = {};

  switch (key) {
    case 'registryUrl':
      update.registryUrl = value;
      break;
    case 'cacheEnabled':
      update.cacheEnabled = value === 'true';
      break;
    case 'cacheTtlMinutes':
      update.cacheTtlMinutes = parseInt(value, 10);
      break;
    case 'notifyOnMajor':
      update.notifyOnMajor = value === 'true';
      break;
    case 'notifyOnMinor':
      update.notifyOnMinor = value === 'true';
      break;
    case 'notifyOnPatch':
      update.notifyOnPatch = value === 'true';
      break;
    case 'outputFormat':
      if (!isOutputFormat(value)) {
        console.error(`Invalid outputFormat. Must be one of: text, json, markdown`);
        process.exit(1);
      }
      update.outputFormat = value;
      break;
    default:
      console.error(`Unknown config key: ${key}`);
      process.exit(1);
  }

  saveConfig(update);
  console.log(`✔ Set ${key} = ${value}`);
}

export function handleConfigList(): void {
  const config = loadConfig();
  console.log('Current stackled configuration:\n');
  for (const [key, value] of Object.entries(config)) {
    const display = Array.isArray(value) ? value.join(', ') || '(none)' : String(value);
    console.log(`  ${key}: ${display}`);
  }
}

export function handleConfigReset(): void {
  resetConfig();
  console.log('✔ Configuration reset to defaults.');
}

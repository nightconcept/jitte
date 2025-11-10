#!/usr/bin/env node
/**
 * Parse Base16/Base24 YAML schemes into usable formats
 *
 * Usage:
 *   node parse-schemes.js                    # Generate all formats
 *   node parse-schemes.js --tailwind         # Tailwind config only
 *   node parse-schemes.js --css              # CSS variables only
 *   node parse-schemes.js --check            # List available schemes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple YAML parser for Base16 format (avoiding dependencies)
function parseYAML(content) {
  const lines = content.split('\n');
  const result = {};
  let currentKey = null;
  let currentObj = null;

  for (const line of lines) {
    // Skip empty lines and full comment lines
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Strip inline comments (but preserve # in quoted values)
    // Match everything before an unquoted # character
    let cleanLine = line;
    const quoteMatch = line.match(/^([^"]*"[^"]*")(.*)/);
    if (quoteMatch) {
      // Line has quoted value - only strip comments after the quote
      const [, quotedPart, afterQuote] = quoteMatch;
      const commentIndex = afterQuote.indexOf('#');
      if (commentIndex >= 0) {
        cleanLine = quotedPart + afterQuote.substring(0, commentIndex);
      }
    } else {
      // No quoted value - safe to split on first #
      const commentIndex = line.indexOf('#');
      if (commentIndex >= 0) {
        cleanLine = line.substring(0, commentIndex);
      }
    }

    // Check for indented lines (nested properties)
    const indent = cleanLine.match(/^(\s*)/)[0].length;

    if (indent === 0) {
      // Top-level property
      const match = cleanLine.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.replace(/"/g, '').trim();
        if (cleanValue) {
          result[key] = cleanValue;
          currentKey = null;
        } else {
          // This is a nested object
          currentKey = key;
          result[key] = {};
          currentObj = result[key];
        }
      }
    } else if (indent > 0 && currentKey && currentObj) {
      // Nested property
      const match = cleanLine.match(/^\s*(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        currentObj[key] = value.replace(/"/g, '').trim();
      }
    }
  }

  return result;
}

// Read all scheme files
function loadSchemes(dir = './schemes') {
  const schemes = {};
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const scheme = parseYAML(content);
    const id = path.basename(file, '.yaml');

    schemes[id] = {
      id,
      name: scheme.name || scheme.scheme,
      author: scheme.author,
      variant: scheme.variant || 'dark',
      palette: scheme.palette || extractPalette(scheme)
    };
  }

  return schemes;
}

// Extract palette from flat structure (Base16 format)
function extractPalette(scheme) {
  const palette = {};

  for (let i = 0; i <= 15; i++) {
    const key = `base${i.toString(16).toUpperCase().padStart(2, '0')}`;
    if (scheme[key]) {
      palette[key] = `#${scheme[key].replace('#', '')}`;
    }
  }

  // Base24 extends to base17-base23
  for (let i = 16; i <= 23; i++) {
    const key = `base${i.toString(16).toUpperCase()}`;
    if (scheme[key]) {
      palette[key] = `#${scheme[key].replace('#', '')}`;
    }
  }

  return palette;
}

// Generate Tailwind config format
function generateTailwindConfig(schemes, configData) {
  const darkScheme = configData.dark ? schemes[configData.dark] : null;
  const lightScheme = configData.light ? schemes[configData.light] : null;

  if (!darkScheme && !lightScheme) {
    throw new Error('No schemes configured in theme-config.json');
  }

  const config = {
    theme: {
      extend: {
        colors: {}
      }
    }
  };

  // Use dark scheme as base (or light if no dark)
  const baseScheme = darkScheme || lightScheme;
  const { palette } = baseScheme;

  // Base colors (backgrounds and foregrounds)
  config.theme.extend.colors.base = {
    0: palette.base00,
    1: palette.base01,
    2: palette.base02,
    3: palette.base03,
    4: palette.base04,
    5: palette.base05,
    6: palette.base06,
    7: palette.base07,
  };

  // Accent colors with semantic names
  config.theme.extend.colors.accent = {
    red: palette.base08,
    orange: palette.base09,
    yellow: palette.base0A,
    green: palette.base0B,
    cyan: palette.base0C,
    blue: palette.base0D,
    purple: palette.base0E,
    magenta: palette.base0F,
  };

  // Add Base24 colors if present
  if (palette.base17) {
    config.theme.extend.colors.ansi = {
      brightRed: palette.base17,
      brightOrange: palette.base18,
      brightYellow: palette.base19,
      brightGreen: palette.base1A,
      brightCyan: palette.base1B,
      brightBlue: palette.base1C,
      brightPurple: palette.base1D,
      brightMagenta: palette.base1E,
    };
  }

  // Add brand colors
  config.theme.extend.colors.logo = configData.brand || {
    bg: '#232136',
    jitte: '#ea9a97',
  };

  return config;
}

// Generate CSS custom properties for all themes
function generateCSS(schemes, configData) {
  let css = '/* Generated from Base16/Base24 schemes - All themes for runtime switching */\n\n';

  // Theme mapping for runtime switching
  const themeMapping = {
    'equilibrium-gray': { dark: 'equilibrium-gray-dark', light: 'equilibrium-gray-light' },
    'rose-pine': { dark: 'rose-pine-moon', light: 'rose-pine-dawn' },
    'kanagawa': { dark: 'kanagawa', light: 'rose-pine-dawn' },
    'tokyo-night': { dark: 'tokyo-night-dark-fixed', light: 'tokyo-night-light' }
  };

  // Generate CSS for each theme with data-theme selectors
  for (const [themeName, schemeIds] of Object.entries(themeMapping)) {
    // Dark variant
    if (schemes[schemeIds.dark]) {
      const scheme = schemes[schemeIds.dark];
      const { palette, name } = scheme;

      css += `/* ${name} */\n`;
      css += `:root[data-theme="${themeName}"], [data-theme="${themeName}"].theme-dark {\n`;
      css += generateColorCSS(palette);
      css += '}\n\n';
    }

    // Light variant
    if (schemes[schemeIds.light]) {
      const scheme = schemes[schemeIds.light];
      const { palette, name } = scheme;

      css += `/* ${name} */\n`;
      css += `[data-theme="${themeName}"].theme-light {\n`;
      css += generateColorCSS(palette);
      css += '}\n\n';
    }
  }

  // Default theme (fallback if no data-theme set)
  const defaultDark = schemes[configData.dark];
  const defaultLight = schemes[configData.light];

  if (defaultDark) {
    css += `/* Default dark theme fallback */\n`;
    css += `:root, .theme-dark {\n`;
    css += generateColorCSS(defaultDark.palette);
    css += '}\n\n';
  }

  if (defaultLight) {
    css += `/* Default light theme fallback */\n`;
    css += `.theme-light {\n`;
    css += generateColorCSS(defaultLight.palette);
    css += '}\n\n';
  }

  // Add brand colors
  const brand = configData.brand || { 'logo-bg': '#232136', 'logo-jitte': '#ea9a97' };
  css += `/* Brand colors */\n`;
  css += `:root {\n`;
  for (const [key, value] of Object.entries(brand)) {
    css += `  --${key}: ${value};\n`;
  }
  css += `}\n`;

  return css;
}

// Helper to generate color CSS
function generateColorCSS(palette) {
  let css = '';

  // Base colors
  for (let i = 0; i <= 7; i++) {
    const key = `base0${i}`;
    css += `  --base-${i}: ${palette[key]};\n`;
  }

  // Accent colors
  css += `  --accent-red: ${palette.base08};\n`;
  css += `  --accent-orange: ${palette.base09};\n`;
  css += `  --accent-yellow: ${palette.base0A};\n`;
  css += `  --accent-green: ${palette.base0B};\n`;
  css += `  --accent-cyan: ${palette.base0C};\n`;
  css += `  --accent-blue: ${palette.base0D};\n`;
  css += `  --accent-purple: ${palette.base0E};\n`;
  css += `  --accent-magenta: ${palette.base0F};\n`;

  // Base24 colors if present
  if (palette.base17) {
    css += `  --ansi-bright-red: ${palette.base17};\n`;
    css += `  --ansi-bright-orange: ${palette.base18};\n`;
    css += `  --ansi-bright-yellow: ${palette.base19};\n`;
    css += `  --ansi-bright-green: ${palette.base1A};\n`;
    css += `  --ansi-bright-cyan: ${palette.base1B};\n`;
    css += `  --ansi-bright-blue: ${palette.base1C};\n`;
    css += `  --ansi-bright-purple: ${palette.base1D};\n`;
    css += `  --ansi-bright-magenta: ${palette.base1E};\n`;
  }

  return css;
}

// List available schemes
function listSchemes(schemes) {
  console.log('\nAvailable color schemes:\n');

  const dark = [];
  const light = [];

  for (const scheme of Object.values(schemes)) {
    const entry = `  ${scheme.id.padEnd(30)} - ${scheme.name} by ${scheme.author}`;
    if (scheme.variant === 'light') {
      light.push(entry);
    } else {
      dark.push(entry);
    }
  }

  console.log('Dark themes:');
  dark.forEach(e => console.log(e));

  console.log('\nLight themes:');
  light.forEach(e => console.log(e));

  console.log(`\nTotal: ${dark.length} dark, ${light.length} light\n`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const schemsDir = path.join(__dirname, 'schemes');

  // Load config if exists
  const configPath = path.join(__dirname, 'theme-config.json');
  let config = { dark: null, light: null, brand: {} };
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const schemes = loadSchemes(schemsDir);

  // Check mode
  if (args.includes('--check') || args.includes('-c')) {
    listSchemes(schemes);
    return;
  }

  // Generate Tailwind config
  if (args.length === 0 || args.includes('--tailwind') || args.includes('-t')) {
    const tailwindConfig = generateTailwindConfig(schemes, config);
    const output = `// Generated from Base16/Base24 schemes
// To regenerate: node theme/parse-schemes.js

export default ${JSON.stringify(tailwindConfig, null, 2)};
`;

    fs.writeFileSync(path.join(__dirname, 'tailwind-colors.js'), output);
    console.log('✓ Generated tailwind-colors.js');
  }

  // Generate CSS
  if (args.length === 0 || args.includes('--css')) {
    const css = generateCSS(schemes, config);
    fs.writeFileSync(path.join(__dirname, 'theme.css'), css);
    console.log('✓ Generated theme.css');
  }

  const darkName = config.dark ? schemes[config.dark]?.name : 'none';
  const lightName = config.light ? schemes[config.light]?.name : 'none';
  console.log(`\nDark: ${darkName}`);
  console.log(`Light: ${lightName}`);
  console.log('\nRun with --check to list available schemes');
}

main();

export { loadSchemes, generateTailwindConfig, generateCSS };

#!/usr/bin/env node

/**
 * PawMatch Full Deployment Script
 * 
 * デプロイ順序:
 * 1. API (基盤)
 * 2. Workers並列 (Crawler, Dispatcher, Converter)
 * 3. Apps並列 (DogMatch, CatMatch)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const fullCommand = `${command} ${args.join(' ')}`;
    log(`  Running: ${fullCommand}`, 'cyan');
    
    const child = spawn(command, args, {
      shell: true,
      stdio: 'inherit',
      ...options
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${fullCommand} (exit code ${code})`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Command error: ${fullCommand} - ${err.message}`));
    });
  });
}

async function deployAPI() {
  log('\n📦 Step 1: Deploying API...', 'yellow');
  const apiPath = path.join(__dirname, '../api');
  
  try {
    await runCommand('npm', ['run', 'deploy'], { cwd: apiPath });
    log('✅ API deployed successfully', 'green');
  } catch (error) {
    log('❌ API deployment failed', 'red');
    throw error;
  }
}

async function deployWorkers() {
  log('\n⚙️ Step 2: Deploying Workers in parallel...', 'yellow');
  
  const workers = [
    { name: 'Crawler', path: '../crawler', color: 'cyan' },
    { name: 'Dispatcher', path: '../dispatcher', color: 'magenta' },
    { name: 'Converter', path: '../converter', color: 'yellow' },
  ];

  const deployPromises = workers.map(async (worker) => {
    const workerPath = path.join(__dirname, worker.path);
    log(`  🚀 Deploying ${worker.name}...`, worker.color);
    
    try {
      await runCommand('npm', ['run', 'deploy'], { cwd: workerPath });
      log(`  ✅ ${worker.name} deployed`, 'green');
    } catch (error) {
      log(`  ❌ ${worker.name} deployment failed`, 'red');
      throw error;
    }
  });

  try {
    await Promise.all(deployPromises);
    log('✅ All Workers deployed successfully', 'green');
  } catch (error) {
    log('❌ Workers deployment failed', 'red');
    throw error;
  }
}

async function buildApps() {
  log('\n🔨 Step 3: Building Apps sequentially...', 'yellow');
  const appPath = path.join(__dirname, '../app');
  
  const apps = [
    { name: 'DogMatch', command: 'build:dog', color: 'blue' },
    { name: 'CatMatch', command: 'build:cat', color: 'green' },
  ];

  // Build sequentially to avoid conflicts
  for (const app of apps) {
    log(`  🏗️ Building ${app.name}...`, app.color);
    
    try {
      await runCommand('npm', ['run', app.command], { cwd: appPath });
      log(`  ✅ ${app.name} built`, 'green');
    } catch (error) {
      log(`  ❌ ${app.name} build failed: ${error.message}`, 'red');
      throw error;
    }
  }

  log('✅ All Apps built successfully', 'green');
}

async function deployApps() {
  log('\n🌐 Step 4: Deploying Apps to Cloudflare Pages...', 'yellow');
  const appPath = path.join(__dirname, '../app');
  
  const deployPromises = [
    { name: 'DogMatch', project: 'dogmatch', color: 'blue' },
    { name: 'CatMatch', project: 'catmatch', color: 'green' },
  ].map(async (app) => {
    log(`  📤 Deploying ${app.name}...`, app.color);
    
    try {
      await runCommand(
        'npx',
        ['wrangler', 'pages', 'deploy', '.next', '--project-name', app.project],
        { cwd: appPath }
      );
      log(`  ✅ ${app.name} deployed`, 'green');
    } catch (error) {
      log(`  ❌ ${app.name} deployment failed`, 'red');
      throw error;
    }
  });

  try {
    await Promise.all(deployPromises);
    log('✅ All Apps deployed successfully', 'green');
  } catch (error) {
    log('❌ App deployments failed', 'red');
    throw error;
  }
}

async function main() {
  log('🚀 Starting PawMatch Full Deployment', 'green');
  log('==================================', 'green');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Deploy API (必須の基盤)
    await deployAPI();
    
    // Step 2: Deploy Workers in parallel
    await deployWorkers();
    
    // Step 3: Build Apps in parallel
    await buildApps();
    
    // Step 4: Deploy Apps in parallel
    await deployApps();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n🎉 All deployments completed successfully!', 'green');
    log('==================================', 'green');
    log('Summary:', 'green');
    log('  ✅ API deployed');
    log('  ✅ Crawler deployed');
    log('  ✅ Dispatcher deployed');
    log('  ✅ Converter deployed');
    log('  ✅ DogMatch app deployed');
    log('  ✅ CatMatch app deployed');
    log(`\n⏱️ Total deployment time: ${duration}s`, 'cyan');
    log('\nURLs:', 'yellow');
    log('  API: https://pawmatch-api.elchika.app');
    log('  DogMatch: https://pawmatch-dogs.elchika.app');
    log('  CatMatch: https://pawmatch-cats.elchika.app');
    
  } catch (error) {
    log('\n❌ Deployment failed!', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the deployment
main();
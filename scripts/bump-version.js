#!/usr/bin/env node

/**
 * Version bumping script for cucm-soap-rest
 * 
 * Usage:
 *   node scripts/bump-version.js [major|minor|patch|<explicit version>]
 * 
 * Examples:
 *   node scripts/bump-version.js patch  # Increments the patch version (1.2.3 -> 1.2.4)
 *   node scripts/bump-version.js minor  # Increments the minor version (1.2.3 -> 1.3.0)
 *   node scripts/bump-version.js major  # Increments the major version (1.2.3 -> 2.0.0)
 *   node scripts/bump-version.js 1.5.0  # Sets the version to 1.5.0 explicitly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the package.json file
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// Parse the version
const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);

// Determine the new version based on the command line argument
const versionArg = process.argv[2] || 'patch';
let newVersion;

if (versionArg === 'major') {
  newVersion = `${currentMajor + 1}.0.0`;
} else if (versionArg === 'minor') {
  newVersion = `${currentMajor}.${currentMinor + 1}.0`;
} else if (versionArg === 'patch') {
  newVersion = `${currentMajor}.${currentMinor}.${currentPatch + 1}`;
} else if (/^\d+\.\d+\.\d+$/.test(versionArg)) {
  // If it's a valid semver version string, use it directly
  newVersion = versionArg;
} else {
  console.error('Invalid version argument. Use "major", "minor", "patch", or an explicit version (e.g., "1.2.3").');
  process.exit(1);
}

console.log(`New version: ${newVersion}`);

// Update the package.json file
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Updated package.json');

// Run the build to regenerate swagger output with the new version
try {
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed');
} catch (error) {
  console.error('Error building project:', error);
  process.exit(1);
}

console.log(`\nSuccessfully bumped version from ${currentVersion} to ${newVersion}`);
console.log('Run the following to commit the version change:');
console.log(`git commit -am "Bump version to ${newVersion}"`);
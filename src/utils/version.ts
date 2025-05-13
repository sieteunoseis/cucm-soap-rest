// Central location for version information
// This helps maintain consistent versioning across package.json and Swagger UI

import fs from 'fs';
import path from 'path';

interface PackageInfo {
  version: string;
  description: string;
}

// Read version information from package.json
function getPackageInfo(): PackageInfo {
  try {
    // Determine the correct path to package.json based on environment
    const basePath = process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '..', '..')
      : process.cwd();
    
    const packageJsonPath = path.join(basePath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    return {
      version: packageJson.version || '1.0.0',
      description: packageJson.description || 'Cisco AXL REST API'
    };
  } catch (error) {
    console.error('Error reading package.json:', error);
    return {
      version: '1.0.0',
      description: 'Cisco AXL REST API'
    };
  }
}

export const packageInfo = getPackageInfo();

// Helper function to update the version in package.json (for future use)
export function updateVersion(newVersion: string): boolean {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    packageJson.version = newVersion;
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    return true;
  } catch (error) {
    console.error('Error updating version in package.json:', error);
    return false;
  }
}
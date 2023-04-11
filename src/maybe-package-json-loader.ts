import { PackageJson, PackageJsonLoader } from './types';
import * as path from 'path';

export function maybeLoadPackageJson(
  workDir: string,
  packageJsonLoader: PackageJsonLoader
): PackageJson {
  try {
    return packageJsonLoader(path.join(workDir, 'package.json'));
  } catch (err) {
    return { name: path.basename(workDir) };
  }
}

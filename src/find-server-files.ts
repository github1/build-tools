import * as fs from 'fs';

export function findServerFiles(workDir: string): string[] {
  return fs
    .readdirSync(workDir)
    .filter((file: string) => /^server\..*(js|tsx?)$/.test(file));
}

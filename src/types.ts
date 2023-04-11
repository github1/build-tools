import * as webpack from 'webpack';
import { runCLI } from 'jest';

export type BuildTools = {
  webpack: typeof webpack;
  jest: { runCLI: typeof runCLI };
  appServer: any;
};

export type TaskArgs = {
  positional: string[];
  [p: string]: any;
};

export type PackageJson = { name: string };

export type PackageJsonLoader = (pkg: string) => PackageJson;

export type TaskLogger = {
  info(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export type TaskContext = {
  packageJsonLoader: PackageJsonLoader;
  logger: TaskLogger;

  buildToolsDir: string;
  workDir: string;
  buildCacheDir: string;
  env: NodeJS.ProcessEnv;
  args: TaskArgs;
  tools: BuildTools;
};

export type TaskResult = {};
export class TaskError extends Error {
  public readonly cause: Error;
  constructor(arg0?: string | Error, arg1?: Error) {
    super(typeof arg0 === 'string' ? arg0 : null);
    this.cause = typeof arg0 !== 'string' ? arg0 : arg1;
  }
}

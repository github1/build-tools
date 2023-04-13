import { TaskContext, TaskError } from './types';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { ESLint } from 'eslint';

export async function runLint(taskContext: TaskContext) {
  const esLint = new ESLint({
    cwd: taskContext.workDir,
    fix: true,
    useEslintrc: false,
    resolvePluginsRelativeTo: taskContext.buildToolsDir,
    baseConfig: {
      env: {
        browser: true,
        node: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
      ],
      settings: {
        react: {
          version: '16.0',
        },
      },
      ignorePatterns: ['src/**/*.test.*', '**/target/**'],
      plugins: ['@typescript-eslint', 'react'],
      parser: '@typescript-eslint/parser',
      root: true,
      parserOptions: {
        project: fs.existsSync(path.join(taskContext.workDir, 'tsconfig.json')),
        tsconfigRootDir: taskContext.workDir,
      },
      rules: {
        'react/prop-types': 'off',
        'react/display-name': 'off'
      },
      overrides: [
        {
          files: ['**/*.js'],
          rules: {
            '@typescript-eslint/no-var-requires': 'off',
          },
        },
      ],
    },
  });
  const results = await esLint.lintFiles(`${taskContext.workDir}`);
  let errorCount = 0;
  results.forEach((result: ESLint.LintResult) => {
    if (result.messages.length > 0) {
      taskContext.logger.info(
        chalk.magenta('[lint]'),
        chalk.black(result.filePath)
      );
      result.messages.forEach((message: any) => {
        const chalkColor =
          ['green', 'yellow', 'red'][message.severity] || 'red';
        if (message.severity > 1) {
          errorCount++;
        }
        const msg = [];
        if (message.ruleId) {
          msg.push(`[${chalk[chalkColor](message.ruleId)}]`);
        }
        msg.push(message.message);
        msg.push(
          chalk.blue(`(line: ${message.line}, column: ${message.column})`)
        );
        taskContext.logger.info(...msg);
      });
    }
  });
  if (errorCount) {
    throw new TaskError('lint errors');
  } else {
    taskContext.logger.info(chalk.magenta('[lint]'), 'success');
  }
}

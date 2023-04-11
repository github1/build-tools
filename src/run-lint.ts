import { TaskContext, TaskError } from './types';
import * as path from 'path';
import chalk from 'chalk';

export function runLint(taskContext: TaskContext) {
  const CLIEngine = require('eslint').CLIEngine;
  const cli = new CLIEngine({
    baseConfig: {
      extends: ['eslint:recommended', 'plugin:react/recommended'],
      settings: {
        react: {
          version: '16.0',
        },
      },
    },
    envs: ['node', 'browser', 'es6'],
    fix: true,
    useEslintrc: false,
    workingDirectories: [taskContext.workDir],
    parser: '@babel/eslint-parser',
    parserOptions: {
      ecmaVersion: 6,
      sourceType: 'module',
      requireConfigFile: 'false',
      babelOptions: {
        configFile: path.resolve(
          path.join(taskContext.buildToolsDir, 'config/babelrc.json')
        ),
      },
      ecmaFeatures: {
        jsx: true,
        arrowFunctions: true,
      },
    },
    plugins: ['react'],
    rules: {
      'react/display-name': 0,
      'react/prop-types': 0,
    },
    ignorePattern: ['src/**/*.test.js', '**/target/**'],
  });
  const report = cli.executeOnFiles([path.resolve(taskContext.workDir)]);
  report.results.forEach((file: any) => {
    if (file.messages.length > 0) {
      taskContext.logger.info(
        chalk.magenta('[lint]'),
        chalk.black(file.filePath)
      );
      file.messages.forEach((message: any) => {
        const chalkColor = ['green', 'orange', 'red'][message.severity];
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
  const hasErrorsOrWarnings =
    parseInt(report.errorCount, 10) + parseInt(report.warningCount, 10) > 0;
  if (hasErrorsOrWarnings) {
    throw new TaskError();
  } else {
    taskContext.logger.info(chalk.magenta('[lint]'), 'success');
  }
}

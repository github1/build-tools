# @github1/build-tools

Wrapper for webpack, jest and other dev tools

[![build status](https://img.shields.io/travis/github1/build-tools/master.svg?style=flat-square)](https://travis-ci.org/github1/build-tools)
[![npm version](https://img.shields.io/npm/v/@github1/build-tools.svg?style=flat-square)](https://www.npmjs.com/package/@github1/build-tools)
[![npm downloads](https://img.shields.io/npm/dm/@github1/build-tools.svg?style=flat-square)](https://www.npmjs.com/package/@github1/build-tools)

## Install
```shell
npm install @github1/build-tools --save-dev
```

## Usage

```shell
build-tools [command] [--options <argument>]
```

## Commands

### lint
Lints code

```shell
build-tools lint
```

### test
Runs tests

```shell
build-tools test [--coverage --watch]
```

### devserver
Launches a webpack dev server

```shell
build-tools devserver
```

Supports mechanisms for injecting custom middleware. See [@github1/app-server](https://github.com/github1/app-server) for more details. 

### build-tools-package-server
Packages an app for deployment

```shell
build-tools-package-server
```

## License
[MIT](LICENSE.md)
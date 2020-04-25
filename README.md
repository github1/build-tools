# @github1/build-tools

[description]

[badges]

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
[license]
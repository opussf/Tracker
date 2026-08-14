# Tracker (web)

## Build process

To Build:
* Configure `config.local.json` based on the `example` file.
* Install NPM modules: `npm install`
* Build to `dist/`: `npx gulp`

## Add modules for dev only

`npm install <module> --save-dev`

## Run locally

* Needs the `config.local.json`

`npx gulp local`

## Deploy to server

* Needs the `config.local.json`
* Setup server info in `~/.ssh/config` to use SSH key

`npx gulp deploy`

#!/usr/bin/env node
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { path, writeFileSync } = require('fs')
const prettier = require('prettier')

const manifest = require('../src/manifest.json')

const argv = yargs(hideBin(process.argv)).string('nextRelease').argv

manifest.version = argv.nextRelease

const output = prettier.format(JSON.stringify(manifest, null, 2), {
  filepath: './src/manifest.json',
})

writeFileSync('./src/manifest.json', output)

#!/usr/bin/env node
import * as commander from 'commander';
import { build, askCommand, askVersion } from './main';
const program = new commander.Command();

program
  .command('build')
  .description('start build')
  .action((...args) => {
    const version = args[1][0];
    if (version) {
      build(version);
    } else {
      askVersion();
    }
  });

if (process.argv.length === 2) {
  void askCommand();
}

program.parse(process.argv);

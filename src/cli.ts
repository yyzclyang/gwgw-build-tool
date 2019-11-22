#!/usr/bin/env node
import * as commander from 'commander';
import { askCommand } from './main';

const program = new commander.Command();

program
  .command('build')
  .description('start build')
  .action((...args) => {
    const version = args.slice(0, -1)[0];
    console.log(version);
  });

if (process.argv.length === 2) {
  void askCommand();
}

program.parse(process.argv);

#!/usr/bin/env node
import * as commander from 'commander';

const program = new commander.Command();

program
  .command('build')
  .description('start build')
  .action((...args) => {
    const version = args.slice(0, -1)[0];
    console.log(version);
  });

program.parse(process.argv);

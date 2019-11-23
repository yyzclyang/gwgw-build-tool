#!/usr/bin/env node
import * as commander from 'commander';
import { build, askCommand } from './main';
const program = new commander.Command();

program
  .command('build <version>')
  .description('start build')
  .option('-f, --force', '强制重新构建')
  .action((version, cmdObj) => {
    build(version, Boolean(cmdObj.force));
  });

if (process.argv.length === 2) {
  void askCommand();
}

program.parse(process.argv);

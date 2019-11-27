#!/usr/bin/env node
import * as commander from 'commander';
import main from './main';
import build from './buildProject';
const program = new commander.Command();

program
  .command('build <version>')
  .description('start build')
  .option('-f, --force', '强制重新构建')
  .action((version, cmdObj) => {
    build.startBuildProcess(version, Boolean(cmdObj.force));
  });

if (process.argv.length === 2) {
  void main.askCommand();
}

program.parse(process.argv);

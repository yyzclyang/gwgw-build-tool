import * as glob from 'glob';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as shell from 'shelljs';
import colors from 'colors';
import git, { DirBranchInfo } from './git';
import gitRecordDb, { GitRecordDbType } from './gitRecordDb';
import safeData from './safeData';

const buildProject = (path: string) => {
  const projectName = path.split('/').pop();
  console.log(colors.green(`\n项目 ${projectName} 开始执行打包...\n`));
  shell.cd(path);
  if (shell.exec(`npm run build`).code !== 0) {
    console.log(colors.bgRed(colors.white(`项目 ${projectName} 打包错误`)));
    shell.exit(1);
  }
  shell.cd('..');
  console.log(colors.green(`\n项目 ${projectName} 打包完毕`));
};

const copyBuildFile = (dirBranchInfoArr: Array<DirBranchInfo>) => {
  console.log(colors.yellow('\n开始拷贝打包文件'));
  shell.cd(path.resolve(process.cwd(), '.'));
  shell.rm('-rf', './gwgw-build-dist');
  const copyDir = dirBranchInfoArr.map((dirBranchInfo) => {
    return path.resolve(dirBranchInfo.path, './dist/*');
  });
  const targetDir = path.resolve(process.cwd(), './gwgw-build-dist');
  shell.mkdir('-p', targetDir);
  shell.cp('-Rf', copyDir, targetDir);
  console.log(colors.yellow('\n项目全部拷贝完毕'));
  console.log(colors.yellow('\n-------------------------'));
};

const performBuildCommand = async (
  dirBranchInfoArr: Array<DirBranchInfo>,
  branch: string,
  force: boolean,
  gitRecord?: GitRecordDbType
) => {
  console.log(
    colors.red(
      `\n开始执行打包拷贝，整个过程大概持续 ${dirBranchInfoArr.length} 分钟`
    )
  );
  const startTime = new Date().getTime();
  dirBranchInfoArr.map((dirBranchInfo) => {
    const projectName = dirBranchInfo.path.split('/').pop();
    // 当前分支的 commit 等于之前存储的 commit，说明没发生变化
    if (
      !force &&
      gitRecord &&
      gitRecord[projectName!] &&
      safeData(() => gitRecord[projectName!][branch].commit) ==
        dirBranchInfo.branches[branch].commit
    ) {
      console.log(
        colors.green(
          `\n项目 ${projectName} ${branch} 分支的 commit 与上次构建时一样，无需再次构建`
        )
      );
    } else if (dirBranchInfo.current !== branch) {
      git.checkout(dirBranchInfo.path, branch).then(() => {
        buildProject(dirBranchInfo.path);
      });
    } else {
      buildProject(dirBranchInfo.path);
    }
    if (gitRecord) {
      gitRecord[projectName!] = {
        ...gitRecord[projectName!],
        ...{
          [branch]: {
            branch: branch,
            commit: dirBranchInfo.branches[branch].commit,
            lastTime: new Date().getTime()
          }
        }
      };
    }
  });
  if (gitRecord) {
    await gitRecordDb.write(gitRecord);
  }
  console.log(colors.green('\n项目全部打包完毕'));
  console.log(colors.green('\n-------------------------'));
  copyBuildFile(dirBranchInfoArr);
  const endTime = new Date().getTime();
  console.log(
    colors.green(`\n完成，整个过程耗时约：${(endTime - startTime) / 1000}秒`)
  );
  shell.exit(0);
  process.exit(0);
};

const askBuildProject = (
  dirBranchInfoArr: Array<DirBranchInfo>,
  branch: string,
  force: boolean,
  gitRecord?: GitRecordDbType
) => {
  inquirer
    .prompt({
      type: 'list',
      name: 'project',
      message: '请选择你要进行打包的仓库?',
      choices: [
        { name: '-  全部', value: 'all' },
        { name: '-  自定义选择', value: 'custom' },
        ...dirBranchInfoArr.map((dirBranchInfo, index) => {
          const dirName = dirBranchInfo.path.split('/').pop();
          return {
            name: `${index + 1}. ${dirName}`,
            value: String(index)
          };
        })
      ],
      pageSize: 20
    })
    .then((select: { project: string }) => {
      switch (select.project) {
        case 'custom':
          {
            console.log(colors.white(colors.bgBlue('\n可选择仓库列表为：\n')));
            dirBranchInfoArr.map((dirBranchInfo, index) => {
              const dirName = dirBranchInfo.path.split('/').pop();
              console.log(`${index}. ${dirName}`);
            });
            console.log('');
            inquirer
              .prompt({
                type: 'input',
                name: 'project',
                message: '请输入要打包的仓库编号（多个仓库用空格分开）：'
              })
              .then((select: { project: string }) => {
                const selectProjectList = Array.from(
                  new Set(
                    select.project
                      .split(' ')
                      .map((value) => parseInt(value, 10))
                      .filter(
                        (value) => value >= 0 && value < dirBranchInfoArr.length
                      )
                  )
                ).map((select) => dirBranchInfoArr[select]);
                performBuildCommand(
                  selectProjectList,
                  branch,
                  force,
                  gitRecord
                );
              });
          }
          break;
        case 'all':
          {
            performBuildCommand(dirBranchInfoArr, branch, force, gitRecord);
          }
          break;
        default: {
          performBuildCommand(
            [dirBranchInfoArr[parseInt(select.project, 10)]],
            branch,
            force,
            gitRecord
          );
        }
      }
    });
};

const build = async (version: string, force = false) => {
  const gitRecordRes = await gitRecordDb.read().catch(() => {
    return { code: '-1', data: undefined };
  });
  const buildPath = path.resolve(process.cwd(), './*');
  const buildDir = glob.sync(buildPath);
  git.getDirPathByBranch(buildDir, version).then((dirBranchInfoArr) => {
    if (dirBranchInfoArr.length === 0) {
      console.log(colors.red(`没有符合仓库有当前版本的分支\n`));
      askVersion(true);
    } else {
      askBuildProject(dirBranchInfoArr, version, force, gitRecordRes.data);
    }
  });
};

const askForce = (version: string) => {
  inquirer
    .prompt({
      type: 'list',
      name: 'force',
      message: '是否强制构建（无视上一次构建的 commit 记录）？',
      choices: [
        { name: '否', value: 'false' },
        { name: '是', value: 'true' }
      ]
    })
    .then(({ force }) => {
      switch (force) {
        // 退出
        case 'false':
          {
            build(version, false);
          }
          break;
        // 开始 build
        case 'true':
          {
            build(version, true);
          }
          break;
        default: {
        }
      }
    });
};

const askVersion = (again = false) => {
  inquirer
    .prompt({
      type: 'input',
      name: 'version',
      message: `请${again ? '重新' : ''}输入要打包的版本：`
    })
    .then(({ version }) => {
      if (version === '') {
        askVersion(true);
      } else {
        askForce(version);
      }
    });
};

const askCommand = () => {
  inquirer
    .prompt({
      type: 'list',
      name: 'action',
      message: '请选择你要进行的操作?',
      choices: [
        { name: '退出', value: 'quit' },
        { name: '开始打包', value: 'build' }
      ]
    })
    .then(({ action }) => {
      switch (action) {
        // 退出
        case 'quit':
          {
            process.exit(0);
          }
          break;
        // 开始 build
        case 'build':
          {
            askVersion();
          }
          break;
        default: {
        }
      }
    });
};

export { build, askCommand, askVersion };

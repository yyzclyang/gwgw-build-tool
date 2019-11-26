import * as inquirer from 'inquirer';
import colors from 'colors';
import { DirBranchInfo } from './git';
import { BuildRecordDbType } from './buildRecordDb';
import build from './buildProject';

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
            build.startBuild(version, false);
          }
          break;
        // 开始 build
        case 'true':
          {
            build.startBuild(version, true);
          }
          break;
        default: {
        }
      }
    });
};

const askBuildProject = (
  dirBranchInfoArr: Array<DirBranchInfo>,
  branch: string,
  force: boolean,
  buildRecord: BuildRecordDbType | undefined
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
                build.performBuildCommand(
                  selectProjectList,
                  branch,
                  force,
                  buildRecord
                );
              });
          }
          break;
        case 'all':
          {
            build.performBuildCommand(
              dirBranchInfoArr,
              branch,
              force,
              buildRecord
            );
          }
          break;
        default: {
          build.performBuildCommand(
            [dirBranchInfoArr[parseInt(select.project, 10)]],
            branch,
            force,
            buildRecord
          );
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

const main = { askCommand, askVersion, askBuildProject };

export default main;

import * as glob from 'glob';
import * as inquirer from 'inquirer';
import * as path from 'path';
import simplegit from 'simple-git/promise';

type DirBranchInfo = { path: string; branch: Array<string>; current: string };

const getDirBranchInfoByDirPath = (dirPath: string): Promise<DirBranchInfo> => {
  const git = simplegit(dirPath);
  return git
    .branchLocal()
    .then((branchInfo) => {
      return {
        path: dirPath,
        branch: branchInfo.all,
        current: branchInfo.current
      };
    })
    .catch(() => {
      return {
        path: dirPath,
        branch: [],
        current: ''
      };
    });
};

const getDirPathByBranch = (checkedDir: string[], branch: string) => {
  return Promise.all(
    checkedDir.map((dirPath: string) => getDirBranchInfoByDirPath(dirPath))
  ).then((dirBranchInfoArr) =>
    dirBranchInfoArr.filter((dirBranchInfo) =>
      dirBranchInfo.branch.includes(branch)
    )
  );
};

const performBuild = (dirBranchInfo: DirBranchInfo, version: string) => {
  if (dirBranchInfo.current !== version) {
    const git = simplegit(dirBranchInfo.path);
    git.checkout(version).then(() => {
      console.log('执行打包');
    });
  } else {
    console.log('执行打包');
  }
};

const build = (version: string) => {
  const buildPath = path.resolve(process.cwd(), '../*');
  const buildDir = glob.sync(buildPath);
  getDirPathByBranch(buildDir, version).then((dirBranchInfoArr) => {
    console.log(dirBranchInfoArr);
    dirBranchInfoArr.map((dirBranchInfo) => {
      performBuild(dirBranchInfo, version);
    });
  });
};

const askVersion = () => {
  inquirer
    .prompt({
      type: 'input',
      name: 'version',
      message: '请输入要打包的版本：'
    })
    .then((task: { version: string }) => {
      if (task.version === '') {
        askVersion();
      } else {
        build(task.version);
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
        { name: '开始 build', value: 'build' },
        { name: '开始复制 dist', value: 'copy' }
      ]
    })
    .then((select: { action: string }) => {
      switch (select.action) {
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
        // 复制打包后的文件
        case 'copy':
          {
          }
          break;
        default: {
        }
      }
    });
};

export { build, askCommand, askVersion };

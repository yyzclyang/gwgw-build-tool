import * as glob from 'glob';
import * as path from 'path';
import * as shell from 'shelljs';
import colors from 'colors';
import git, { DirBranchInfo } from './git';
import buildRecordDb, { BuildRecordDbType } from './buildRecordDb';
import main from './main';
import safeData from './safeData';

const COMMAND_PATH = process.cwd();

const buildProject = (path: string) => {
  const projectName = path.split('/').pop();
  console.log(colors.green(`\n项目 ${projectName} 开始执行打包...\n`));
  shell.cd(path);
  if (shell.exec(`npm run build`).code !== 0) {
    console.log(colors.bgRed(colors.white(`项目 ${projectName} 打包错误`)));
    shell.exit(1);
  }
  // shell.cd('..');
  console.log(colors.green(`\n项目 ${projectName} 打包完毕`));
};

const copyBuildFile = (dirBranchInfoArr: Array<DirBranchInfo>) => {
  console.log(colors.yellow('\n开始拷贝打包文件'));
  shell.cd(COMMAND_PATH);
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

const projectShouldBuild = (
  force: boolean,
  projectName: string,
  branch: string,
  dirBranchInfo: DirBranchInfo,
  buildRecord: BuildRecordDbType | undefined
) => {
  // 如果强制构建或者读取本地 buildRecord 缓存报错
  if (force || buildRecord === undefined) {
    return true;
  }

  const lastBuildCommit = safeData(
    () => buildRecord[projectName!][branch].commit
  );
  const currentCommit = dirBranchInfo.branches[branch].commit;

  // 当前分支的 commit 等于之前存储记录的 commit，说明分支没发生变化
  if (lastBuildCommit !== currentCommit) {
    return true;
  } else {
    console.log(
      colors.green(
        `\n项目 ${projectName} 的 ${branch} 分支当前的 commit 与上次构建时一样，无需再次构建`
      )
    );
    return false;
  }
};

const performBuildCommand = async (
  dirBranchInfoArr: Array<DirBranchInfo>,
  branch: string,
  force: boolean,
  buildRecord: BuildRecordDbType | undefined
) => {
  console.log(
    colors.red(
      `\n开始执行打包拷贝，整个过程大概持续 ${dirBranchInfoArr.length} 分钟`
    )
  );
  const startTime = new Date().getTime();
  dirBranchInfoArr.map((dirBranchInfo) => {
    const projectName = dirBranchInfo.path.split('/').pop();
    const shouldBuild = projectShouldBuild(
      force,
      projectName!,
      branch,
      dirBranchInfo,
      buildRecord
    );
    if (shouldBuild) {
      if (dirBranchInfo.current !== branch) {
        git.checkout(dirBranchInfo.path, branch).then(() => {
          buildProject(dirBranchInfo.path);
        });
      } else {
        buildProject(dirBranchInfo.path);
      }
      // 如果读取记录时没出错，就记录本次构建的信息
      if (buildRecord) {
        buildRecord[projectName!] = {
          ...buildRecord[projectName!],
          ...{
            [branch]: {
              branch: branch,
              commit: dirBranchInfo.branches[branch].commit,
              lastBuildTime: new Date().getTime()
            }
          }
        };
      }
    }
  });
  if (buildRecord) {
    await buildRecordDb.write(buildRecord);
  }
  console.log(colors.green('\n项目全部打包完毕'));
  console.log(colors.green('\n-------------------------'));
  copyBuildFile(dirBranchInfoArr);
  const endTime = new Date().getTime();
  console.log(
    colors.green(
      `\n完成整个构建过程，共耗时约：${(endTime - startTime) / 1000}秒`
    )
  );
  shell.exit(0);
  process.exit(0);
};

const startBuild = async (version: string, force = false) => {
  const gitRecordRes = await buildRecordDb.read().catch(() => {
    return { code: '-1', data: undefined };
  });
  const buildPath = path.resolve(process.cwd(), './*');
  const buildDir = glob.sync(buildPath);
  git.screeningDirPathByBranch(buildDir, version).then((dirBranchInfoArr) => {
    if (dirBranchInfoArr.length === 0) {
      console.log(colors.red(`没有拥有当前版本分支的仓库\n`));
      main.askVersion(true);
    } else {
      main.askBuildProject(dirBranchInfoArr, version, force, gitRecordRes.data);
    }
  });
};

const build = {
  startBuild,
  buildProject,
  performBuildCommand,
  projectShouldBuild,
  copyBuildFile
};

export default build;

import * as glob from 'glob';
import * as path from 'path';
import * as shell from 'shelljs';
import colors from 'colors';
import git, { DirBranchInfo } from './git';
import buildRecordDb, { BuildRecordDbType } from './buildRecordDb';
import main from './main';
import safeData from './safeData';

const COMMAND_PATH = process.cwd();

const buildProject = (path: string, ranking: string) => {
  const projectName = path.split('/').pop();
  console.log(
    colors.green(`\n${ranking}：项目 ${projectName} 开始执行打包...\n`)
  );
  shell.cd(path);
  if (shell.exec(`npm run build`).code !== 0) {
    console.log(colors.bgRed(colors.white(`项目 ${projectName} 打包错误`)));
    shell.exit(1);
  }
  // shell.cd('..');
  console.log(colors.green(`\n${ranking}：项目 ${projectName} 打包完毕`));
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
  buildRecord: BuildRecordDbType | undefined,
  ranking: string
) => {
  // 如果强制构建或者读取本地 buildRecord 缓存报错
  if (force || buildRecord === undefined) {
    return true;
  }

  const lastBuildBranch = safeData(
    () => buildRecord[projectName].lastBuildBranch
  );
  const lastBuildCommit = safeData(
    () => buildRecord[projectName].branches[branch].commit
  );
  const currentCommit = dirBranchInfo.branches[branch].commit;

  // 上次构建时的分支不等于当前的分支
  // 当前分支的 commit 等于之前存储记录的 commit，说明分支没发生变化
  if (lastBuildBranch !== branch || lastBuildCommit !== currentCommit) {
    return true;
  } else {
    console.log(
      colors.green(
        `\n${ranking}：项目 ${projectName} 上次构建时的分支和本次一致，且 ${branch} 分支当前的 commit 与上次构建时一样，无需再次构建`
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
  const dirArrLength = dirBranchInfoArr.length;
  console.log(
    colors.red(`\n开始执行打包拷贝，整个过程大概持续 ${dirArrLength} 分钟`)
  );
  const startTime = new Date().getTime();
  dirBranchInfoArr.map((dirBranchInfo, index) => {
    const projectName = dirBranchInfo.path.split('/').pop();
    const ranking = `[${index + 1}/${dirArrLength}]`;
    const shouldBuild = projectShouldBuild(
      force,
      projectName!,
      branch,
      dirBranchInfo,
      buildRecord,
      ranking
    );
    if (shouldBuild) {
      if (dirBranchInfo.current !== branch) {
        git.checkout(dirBranchInfo.path, branch).then(() => {
          buildProject(dirBranchInfo.path, ranking);
        });
      } else {
        buildProject(dirBranchInfo.path, ranking);
      }
      // 如果读取记录时没出错，就记录本次构建的信息
      if (buildRecord) {
        buildRecord[projectName!] = {
          ...buildRecord[projectName!],
          lastBuildBranch: branch,
          branches: {
            ...(safeData(() => buildRecord[projectName!].branches) || {}),
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

  const duration = (endTime - startTime) / 1000;
  const minutes = Math.floor(duration / 60);
  const seconds = Number.prototype.toFixed.call(duration % 60, 3);

  console.log(
    colors.green(
      `\n完成整个构建过程，共耗时约：${
        minutes ? minutes + ' 分钟 ' : ''
      }${seconds} 秒`
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

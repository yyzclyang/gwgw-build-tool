import simplegit from 'simple-git/promise';

type BranchType = {
  current: string;
  name: string;
  commit: string;
  label: string;
};
export interface DirBranchInfo {
  path: string;
  branchList: Array<string>;
  current: string;
  branches: {
    [key: string]: BranchType;
  };
}

const getDirBranchInfoByDirPath = (dirPath: string): Promise<DirBranchInfo> => {
  const git = simplegit(dirPath);
  return git
    .branchLocal()
    .then((BranchSummary) => {
      console.log(BranchSummary);
      return {
        path: dirPath,
        branchList: BranchSummary.all,
        current: BranchSummary.current,
        branches: BranchSummary.branches
      };
    })
    .catch(() => {
      return {
        path: dirPath,
        branchList: [],
        current: '',
        branches: {}
      };
    });
};

const getDirPathByBranch = (checkedDir: string[], branch: string) => {
  return Promise.all(
    checkedDir.map((dirPath: string) => getDirBranchInfoByDirPath(dirPath))
  ).then((dirBranchInfoArr) =>
    dirBranchInfoArr.filter((dirBranchInfo) =>
      dirBranchInfo.branchList.includes(branch)
    )
  );
};

const checkout = (path: string, branch: string) => {
  const git = simplegit(path);
  return git.checkout(branch);
};

export default {
  getDirBranchInfoByDirPath,
  getDirPathByBranch,
  checkout
};

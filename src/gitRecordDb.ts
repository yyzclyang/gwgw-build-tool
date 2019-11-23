const homeDir = process.env.HOME || require('os').homedir();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(homeDir, '.gwgw-build-tool-db');

interface GitRecordType {
  branch: string;
  commit: string;
  lastTime: number;
}

export interface GitRecordDbType {
  [repository: string]: {
    [branch: string]: GitRecordType;
  };
}

const gitRecordDb = {
  read(path = dbPath): Promise<{ code: string; data: GitRecordDbType }> {
    return new Promise((resolve, reject) => {
      fs.readFile(
        path,
        { flag: 'a+' },
        (err: NodeJS.ErrnoException | null, data: Buffer) => {
          if (err) {
            return reject(err);
          }

          let gitRecord: GitRecordDbType;
          try {
            gitRecord = JSON.parse(data.toString());
          } catch (err) {
            gitRecord = {};
          }

          resolve({ code: '00', data: gitRecord });
        }
      );
    });
  },
  write(taskList: any, path = dbPath) {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        path,
        JSON.stringify(taskList) + '\n',
        (err: NodeJS.ErrnoException | null) => {
          if (err) {
            return reject(err);
          }
          resolve();
        }
      );
    });
  }
};

export default gitRecordDb;

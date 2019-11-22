# 官网官微项目打包工具

## 安装

```node
npm i -g gwgw-build-tool
yarn add global gwgw-build-tool
```

## 使用

将待打包的项目全部放到同一个文件夹下，并保证项目的打包命令为 `build`，输入目录为 `dist/ilifecore/`。

安装打包工具后，在这个文件夹下运行 `gwbt build 版本号`，等待程序运行完毕之后，会将所有拥有分支名为 `版本号` 的项目打包，并将打包文件复制到当前目录的 `gwgw-build-dist` 文件夹下。

比如 `gwbt build v1.12.10`，会将当前目录下的文件夹中拥有 `v1.12.10` 分支的仓库执行 `build`，并将符合条件的仓库打包后的 `dist` 下的文件复制到当前文件夹下的 `gwgw-build-dist` 文件夹中。

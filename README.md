# 官网官微项目打包工具

协助老项目构建打包。

## 安装

```node
npm i -g gwgw-build-tool
yarn add global gwgw-build-tool
```

## 使用

### 前期准备

1.首先要将所有待构建的项目放到同一个文件夹下，示例如下：

```
.
├── project1
├── project2
└── project3
```

2.保证所有待构建项目的脚本构建命令为 `build`，构建文件的输出目录为 `dist`。

### 开始构建

```node
gwbt build <version>
```

构建完成之后，会将所有待构建项目完成构建之后的 `dist` 文件下的文件复制到当前目录下的 `gwgw-build-dist` 文件夹中。示例如下：

```
.
├── gwgw-build-dist
├── project1
├── project2
└── project3
```

### 额外选项

- `--force (-f)` 强制构建所选的项目
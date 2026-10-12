# 词流 Wordflow

一个面向 Android、iOS 和 Web 的 Expo + React Native + TypeScript 背词应用原型，重点是可自定义的模块化复习流程。

## 当前 MVP

- 词库页：按词根/词缀筛选、搜索词条、手动录词、创建词根词库、粘贴 CSV 并解析预览后批量导入；重复单词会跳过。
- 流程页：练习模块启停、排序、改名、增删；答错时可通过条件分支进入错词强化。
- 计划页：选择词库、设置每日学习上限、提醒偏好。
- 学习页：先排到期词，再排新词；按流程执行回忆、听音、拼写、例句和错词强化。听音使用设备语音能力。
- 复盘页：显示到期词、错词、模块自评/拼写表现。
- 词库、流程、计划和练习记录使用 AsyncStorage 保存在本机。

目前数据只保存在单台设备；提醒开关只是偏好记录，尚未接入系统通知。CSV 通过粘贴文本导入。间隔复习采用简单本地规则，不等于成熟的遗忘曲线算法；词根关联以用户录入和分类为主，还未建立公共词条平台。

## 启动

```bash
npm install
npx expo start
```

在终端里按 `w` 打开 Web，或用手机 Expo Go 扫描二维码预览。iOS 本地构建需要 macOS/Xcode；Expo EAS 可用于云构建。

## 发布可持续更新的网页预览

项目已配置 Expo Router 静态 Web 输出，构建命令为 `npm run build:web`，输出目录为 `dist`。可用 Cloudflare Pages 绑定 GitHub 仓库，实现推送后自动发布：

1. 将本项目推送到 GitHub 仓库（建议先设为私有）。
2. 在 Cloudflare Pages 创建项目并连接该 GitHub 仓库。
3. 构建设置填写：生产分支 `master`、构建命令 `npm run build:web`、构建输出目录 `dist`。
4. 部署完成后，将 Pages 提供的固定网址发给朋友。后续推送到 `master` 会自动更新该网址；其他分支会生成预览部署。

网页无需安装 App。词条和学习记录目前保存在每个访问者自己的浏览器本地，不会在朋友之间同步；提醒偏好也尚未触发系统通知。

## 检查

```bash
npx expo lint
npx tsc --noEmit
npx expo export --platform web
```

# 研程 v1.2.0 安装指南

这个文件说明如何把压缩包部署到 GitHub Pages，并在电脑、Android 手机、iPhone 和 iPad 上安装，以及如何开启 GitHub Gist 同步。

## 压缩包里有什么

解压后，根目录应直接看到：

```text
index.html
manifest.webmanifest
sw.js
.nojekyll
.gitignore
README.md
LICENSE
icons/
docs/
src/
scripts/
```

`index.html` 必须位于 GitHub 仓库根目录，不能多套一层文件夹。

## 一、上传到 GitHub

### 方式 A：网页上传

1. 在 GitHub 新建一个空仓库，例如 `yancheng`，不要勾选自动生成 README。
2. 打开仓库，点 **Add file → Upload files**。
3. 打开解压后的文件夹，选中里面的**所有内容**（不是外层文件夹），拖进网页。
4. Commit changes。
5. 确认仓库首页能看到 `index.html`。

### 方式 B：命令行

```bash
cd yancheng-github-v1.2.0
git init
git add .
git commit -m "feat: 研程 v1.2.0"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

## 二、开启 GitHub Pages

1. 打开仓库 **Settings → Pages**。
2. Source 选择 **Deploy from a branch**。
3. Branch 选择 `main`，Folder 选择 `/ (root)`。
4. 点 Save。
5. 等待 1–2 分钟，访问：

```text
https://<你的用户名>.github.io/<仓库名>/
```

第一次打开应能看到「今天」页面。若出现 404，先检查 `index.html` 是否在仓库根目录，以及 Pages 的 branch/folder 设置。

## 三、电脑安装

### Chrome / Edge（Windows、macOS）

1. 打开 Pages 地址。
2. 地址栏右侧会出现安装图标；没有的话打开浏览器菜单，选择「安装研程」或「安装应用」。
3. 确认安装。之后从桌面/开始菜单/应用程序打开。
4. 也可以直接收藏网址，不安装也能使用。

电脑端数据保存在这个浏览器的站点存储里；换浏览器或清理站点数据会失去本地数据。

## 四、Android 手机安装

1. 用 Chrome 打开 Pages 地址。
2. 点右上角菜单。
3. 选择「安装应用」或「添加到主屏幕」。
4. 确认名称「研程」，添加。
5. 从桌面图标打开。首次联网打开一次后，应用外壳会被缓存，之后可离线打开。

如果菜单没有安装项，选择「添加到主屏幕」创建快捷方式；部分浏览器只创建快捷方式，不提供完整离线壳。

## 五、iPhone 安装

1. 必须使用 **Safari** 打开 Pages 地址。
2. 点底部分享按钮。
3. 选择「添加到主屏幕」。
4. 确认名称「研程」，点「添加」。
5. 从桌面图标打开。

iPhone 上的 Chrome / Edge 不能可靠地安装独立 PWA，请用 Safari。

## 六、iPad 安装

1. 用 **Safari** 打开 Pages 地址。
2. 点顶部分享按钮。
3. 选择「添加到主屏幕」。
4. 确认名称「研程」，点「添加」。
5. 从桌面图标打开；横屏和竖屏都可使用。

iPad 上的 Chrome 不能可靠地安装 PWA，请用 Safari。

## 七、开启 Gist 同步

三台设备都安装好后，在每台设备连接同一个 Gist。

### 1. 创建 GitHub token

推荐 fine-grained token：

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens。
2. 生成新 token。
3. Account permissions → Gists → **Read and write**。
4. 设置有效期并生成，复制 token。

或使用 classic token：

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)。
2. Generate new token，勾选 `gist`。
3. 生成并复制 token。

不要把 token 发给别人，也不要提交到 GitHub 仓库。

### 2. 第一台设备创建 Gist

1. 打开研程 →「数据与备份」→「GitHub Gist 同步」。
2. 粘贴 token。
3. 点「创建新 Gist 并上传」。
4. 确认后，当前本机数据会写入一个新的 Secret Gist。
5. 成功后复制显示的 Gist ID。

### 3. 其他设备连接

1. 在同一网址的研程里打开「数据与备份」→「GitHub Gist 同步」。
2. 粘贴**同一个 token** 和 **Gist ID**。
3. 点「连接已有 Gist」。
4. 确认后，云端数据会覆盖该设备当前数据。
5. 如果该设备已有重要内容，先「复制 JSON」备份。

### 4. 同步行为

- 本机修改后约 2 秒上传。
- 打开应用、回到前台、联网、每 2 分钟检查云端。
- 两边都改过时，选择「保留本地」或「使用云端」。
- 连接状态和最近同步时间显示在同步设置里。
- 断开同步不会删除 Gist；Gist 需要到 GitHub 手动删除。

## 八、数据会保留吗

### 会保留

- 同一个 GitHub Pages 网址
- 同一个浏览器
- 没有清理站点数据
- 直接覆盖新版 `index.html`、刷新页面、重新打开 PWA

未来增加栏目时，新版会读取旧 localStorage 数据并做迁移；不会因为换 `index.html` 清空旧数据。

### 不会自动保留

- 从本地 `preview.html` 或 `localhost` 换到 GitHub Pages
- 更换 GitHub 用户名、仓库名或自定义域名
- 换浏览器、无痕模式、清理站点数据
- iPhone/iPad 的 Safari 标签页与主屏幕 App 可能使用不同的数据容器

所以：

- 正式使用前先部署到固定 Pages 地址。
- 现在已经在预览里记录的内容，先导出 JSON，再在 Pages 版导入；或两边连接同一个 Gist。
- 每次大改前导出 JSON。Gist 是额外副本，不是本地备份的替代。

## 九、以后更新版本

1. 用新版文件覆盖仓库里的 `index.html`；如果新版还改了 `sw.js`、`manifest.webmanifest`、`icons/`，一起上传。
2. GitHub Pages 自动重新部署。
3. 手机/电脑重新打开研程；必要时完全关闭 App 再打开。
4. 数据不会因为这次覆盖而清空（前提：同一网址、同一浏览器、未清理站点数据）。

如果新版改了 `sw.js` 的缓存名，旧缓存会自动清理；更新后第一次打开可能需要多等几秒。

## 十、常见问题

**打开是 404**

- `index.html` 是否直接在仓库根目录。
- Pages 是否设置为 `main` / `/ (root)`。
- Pages 首次部署通常要等 1–2 分钟。

**图标或 manifest 404**

- 确认 `icons/` 和 `manifest.webmanifest` 在根目录。
- 用浏览器直接打开 `https://<你的站点>/manifest.webmanifest`，应返回 JSON。

**添加到主屏幕后数据不见了**

- 检查是否换了网址/浏览器。
- iPhone/iPad 是否在 Safari 标签页和主屏幕 App 之间切换；固定用主屏幕 App。
- 如果之前导出过 JSON，用「从文本导入」恢复；如果连接了 Gist，点「从云端恢复」。

**同步失败**

- token 是否有 Gists 读写权限。
- Gist ID 是否正确。
- 当前网络是否能访问 `api.github.com`。
- 到「GitHub Gist 同步」查看错误信息；必要时断开后重新连接。

**Secret Gist 安全吗**

- 不公开列出，但拿到链接的人可以读取。
- 不要同步高度敏感内容。
- token 只保存在当前浏览器；如果设备共享，注意清理或断开同步。

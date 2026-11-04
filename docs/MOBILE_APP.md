# 在手机上安装研程

研程是一个 **PWA（渐进式 Web App）**。部署到 GitHub Pages 后，可以直接从手机浏览器添加到主屏幕，得到独立图标和接近原生 App 的独立窗口。

## 方案一：添加到主屏幕（推荐，手机上即可完成）

### Android / Chrome / Edge

1. 用手机浏览器打开你的 Pages 地址，例如：
   `https://yourname.github.io/yancheng/`
2. 等页面完整加载一次。
3. 点右上角菜单：
   - Chrome：选择「安装应用」或「添加到主屏幕」
   - Edge：选择「添加到手机」
4. 确认名称「研程」，添加到主屏幕。
5. 从桌面图标打开；首次打开后应用外壳会被缓存，之后断网也能打开。

如果菜单里没有「安装应用」，选择「添加到主屏幕」也能创建快捷方式；部分浏览器只有快捷方式，不会缓存离线内容。

### iPhone / iPad / Safari

1. 必须使用 **Safari** 打开 Pages 地址。
2. 点分享按钮（iPhone 在底部，iPad 在顶部）。
3. 选择「添加到主屏幕」。
4. 确认名称为「研程」，点「添加」。
5. 从桌面打开。

> iOS / iPadOS 的 Chrome / Edge 不能可靠地创建独立 PWA；请用 Safari。

## 在电脑、手机和 iPad 之间同步

先在每台设备用同一个 GitHub Pages 网址安装 PWA，然后在每台设备的「数据与备份 → GitHub Gist 同步」中连接同一个 Gist：

1. 第一台设备：填入 GitHub token，点「创建新 Gist 并上传」。
2. 复制创建后显示的 Gist ID。
3. 其他设备：填入同一个 token 和 Gist ID，点「连接已有 Gist」。
4. 连接会以云端数据覆盖该设备当前数据；如果该设备已有重要内容，先导出 JSON。
5. 默认开启自动同步；本机修改后约 2 秒上传，应用回到前台或每 2 分钟检查云端。

Token 需要 `gist` 读写权限。Secret Gist 不公开列出，但拿到链接的人可以读取；不要放高度敏感内容。Token 只保存在当前浏览器，不包含在 JSON 备份中。

## 数据会怎样

- 安装后的 App 和浏览器共用同一站点的存储；数据默认在本机。
- 如果在「数据与备份」中开启 GitHub Gist 同步，数据会写入你自己的 Secret Gist；未开启时不会上传。
- 备份文件包含日程、打卡、课题和闪念；换设备时一起迁移。
- 手机和电脑各有一份独立数据。换设备时：
  1. 旧设备：数据与备份 → 复制 JSON（或下载 JSON）。
  2. 新设备：数据与备份 → 从文本导入 / 导入文件。
- 清理站点数据、卸载浏览器、换浏览器域名，都会丢失本地数据。请定期导出备份。
- 如果以后更换 GitHub 用户名或仓库名，PWA 的存储会跟着新域名重新开始，需要先导出再导入。
- iPhone / iPad 的 Safari 标签页与主屏幕 App 可能使用不同的站点数据容器；请固定用主屏幕 App，或开启 Gist 同步。

## 更新应用

1. 把新的 `index.html` 等文件上传到 GitHub 仓库。
2. 手机重新打开研程，等待几秒；Service Worker 会优先从网络取最新页面。
3. 如果仍是旧界面，完全关闭 App 再打开，或在浏览器中刷新一次。
4. 如果改了 `sw.js` 的缓存清单，建议同时修改 `CACHE_NAME`（例如 `yancheng-v1.0.1`），让旧缓存自动清理。

## 方案二：生成 APK（可选）

只有确实需要 `.apk` 安装包时才需要这一步。PWA 已经能满足“手机桌面 App”的日常使用。

### PWABuilder（最省事）

1. 先在 GitHub Pages 完成部署，并确认手机能打开。
2. 在电脑或手机浏览器打开 <https://www.pwabuilder.com/>。
3. 输入你的 Pages 地址，等待检测。
4. 选择 Android → 生成包。
5. 下载签名后的 APK / AAB，传到手机安装。

注意：

- PWABuilder 的 Android 包通常需要签名配置；按页面提示生成或使用自己的 keystore。
- APK 与浏览器 PWA 使用不同的应用容器，**本地数据默认不互通**。首次打开 APK 后用 JSON 备份导入。
- 如果只是自己用，优先「添加到主屏幕」，维护成本最低。

### Capacitor / Android Studio（开发者路线）

适合需要自己控制包名、签名和原生能力的场景，需要电脑安装 Node.js、Android Studio 和 JDK：

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init 研程 com.example.yancheng --web-dir=.
npx cap add android
npx cap sync
npx cap open android
```

然后在 Android Studio 中构建 APK。此路线不适合“只在手机上操作”的场景。

## 常见问题

**打开是 GitHub 404**
- 检查 `index.html` 是否在仓库根目录。
- 检查 Pages 的 Branch / Folder 是否为 `main` / `/ (root)`。
- Pages 首次部署通常需要 1–2 分钟。

**页面能开，但样式或图标不对**
- 确认 `icons/`、`manifest.webmanifest`、`sw.js` 都在根目录。
- 强制刷新一次；或换一个浏览器标签打开。

**添加到主屏幕后没有图标**
- 确认 `manifest.webmanifest` 可访问（浏览器打开该地址应显示 JSON）。
- 确认 `icons/icon-192.png` 和 `icons/icon-512.png` 可访问。
- Android 需要 HTTPS；GitHub Pages 默认满足。

**离线打不开**
- 首次必须联网完整打开一次，让 Service Worker 完成缓存。
- 浏览器隐私模式、部分国产浏览器会禁用 Service Worker。
- `file://` 直接打开不会启用 Service Worker，请用 GitHub Pages 或本地 HTTP 服务器。

**数据丢了**
- 先检查是否换了域名 / 浏览器 / 无痕模式。
- 如果之前导出过 JSON，在「数据与备份」中导入恢复。
- 清理站点数据后无法从浏览器恢复；备份是唯一的恢复路径。

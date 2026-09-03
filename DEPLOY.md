# 发布流程说明（给下个会话 / 自己用）

本项目是纯静态站点，托管在 GitHub Pages。仓库地址：<https://github.com/williamzlj/beautifulCards>
线上地址：<https://williamzlj.github.io/beautifulCards/>

> 日常更新只需要「提交 + 推送」，Pages 会自动构建，无需任何手动操作。

---

## 一、环境前提（一次性，通常已就绪）

- **Git 已安装**：`git --version`（本机 2.54，Windows）
- **用户信息已配置**（全局）：
  ```powershell
  git config --global user.name "williamzlj"
  git config --global user.email "williamzlj@126.com"
  ```
- **凭据**：使用 Windows 的 Git Credential Manager（GCM），首次推送时弹窗登录 GitHub 后会记住。
  本仓库已配置：`git config --local credential.helper manager`
- **网络**：Shell 直连 GitHub 可能超时（443 连不上）。若推送报
  `Failed to connect to github.com port 443`：
  - 确认能访问 GitHub（浏览器可开），等网络恢复后重试；或
  - 若有 Clash/代理（127.0.0.1:7890），开启后执行：
    ```powershell
    git config --global http.proxy http://127.0.0.1:7890
    git config --global https.proxy http://127.0.0.1:7890
    # 用完可取消：git config --global --unset http.proxy; git config --global --unset https.proxy
    ```

## 二、日常更新发布（最常用）

在项目目录 `c:\Users\X13\Documents\trae_projects\beautifulCards` 下：

```powershell
cd "c:\Users\X13\Documents\trae_projects\beautifulCards"

# 1. 查看改动
git status

# 2. 暂存并提交（PowerShell 不支持 bash heredoc，多行用多个 -m）
git add .
git commit -m "简述本次改动" -m "补充说明（可省略）"

# 3. 推送（Pages 自动触发构建，约 1~2 分钟生效）
git push
```

> 注意：
> - PowerShell 里**不要**用 `git commit -m "$(cat <<'EOF' ...)"` 这种 bash heredoc，会报语法错；多个 `-m` 即可。
> - `git push` 的进度信息走 stderr，PowerShell 里看到红色文字但出现 `* [new branch]` 或 `-> main` 即成功。

推送后验证：

```powershell
# 等待约 60~90 秒后访问，应返回 200
Start-Sleep -Seconds 60
(Invoke-WebRequest "https://williamzlj.github.io/beautifulCards/" -UseBasicParsing).StatusCode
```

## 三、Pages 配置（已完成，仅备查）

- **Source**：分支 `main`，目录 `/ (root)`
- 站点类型：项目站点，URL 前缀为 `/beautifulCards/`
  → 页面内链接/资源必须用**相对路径**（如 `css/style.css`、`editor.html?id=...`），不要用绝对路径 `/css/...`
- 首页文件：`index.html`（项目管理页）；编辑/查看页：`editor.html`

首次开启 Pages 用的命令（无需重复执行，除非换仓库）：

```powershell
# 复用 GCM 中存的 GitHub 凭据调 API
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ($cred | Select-String '^password=' | Select-Object -First 1).Line.Substring(9)
$user  = ($cred | Select-String '^username=' | Select-Object -First 1).Line.Substring(9)
$body = '{"source":{"branch":"main","path":"/"}}'
Invoke-RestMethod -Uri "https://api.github.com/repos/$user/beautifulCards/pages" `
  -Method Post -Headers @{Authorization="token $token"; Accept="application/vnd.github+json"; "User-Agent"="deploy"} `
  -Body $body -ContentType "application/json"
```

## 四、查询构建状态 / 排查 404

推送后若页面没更新或 404，查构建状态：

```powershell
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = ($cred | Select-String '^password=' | Select-Object -First 1).Line.Substring(9)
$user  = ($cred | Select-String '^username=' | Select-Object -First 1).Line.Substring(9)
$info = Invoke-RestMethod -Uri "https://api.github.com/repos/$user/beautifulCards/pages" `
  -Headers @{Authorization="token $token"; Accept="application/vnd.github+json"; "User-Agent"="deploy"}
"status=$($info.status)  url=$($info.html_url)"
# status: building（构建中） / built（完成）
```

- 刚推送时 `building` 属正常，等 1~2 分钟变 `built`。
- 强刷浏览器（Ctrl+F5）避免缓存。

## 五、本地预览（发布前自测）

任意静态服务器即可（项目无构建步骤）：

```powershell
# Node 内置零依赖服务器（端口 8000）
node -e "const http=require('http'),fs=require('fs'),path=require('path'),root=process.cwd(),port=8000,types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);fs.readFile(f,(err,d)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(d)})}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port))"
```

访问 <http://127.0.0.1:8000>。注意：数据存浏览器 localStorage，本地与线上环境数据不互通。

## 六、文件清单

```
index.html        项目管理首页（卡片式项目列表）
editor.html       编辑 / 只读查看页
css/style.css     全局 + 首页 + 编辑器样式
css/templates.css 9 套预设模板样式
js/app.js         编辑器主逻辑
js/projects.js    项目加载/只读模式/自动保存
js/storage.js     localStorage 持久化
js/parser.js      文本解析
js/templates.js   预设模板配置
js/template-editor.js  可视化模板编辑器
js/exporter.js    PNG/PDF/ZIP 导出
```

发布前确认：`.gitignore` 已忽略系统/临时文件；不要提交测试图片、日志等杂物。

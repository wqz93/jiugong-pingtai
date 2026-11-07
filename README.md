# 移动端培训部聚合平台

面向培训部的移动端 H5 聚合平台。当前已上线入口：**查询招生简章**（教室查询 / 功能查询 / 空教室查询），其余入口为占位，后续陆续接入。

线上地址：https://sng-jiugong-pingtai.netlify.app

## 页面结构

```
首页（功能入口宫格）
  └─ 查询招生简章
       ├─ 导入页：导入 招生简章.xls + 教室功能.xlsx
       └─ 查询页：教室查询 / 功能查询 / 空教室查询（双校区切换）
```

## 功能说明

| 功能 | 说明 |
|---|---|
| 教室查询 | 输入教室号模糊匹配（如 `409`），查看该教室功能标签与全部排课班级；表格按「星期 → 开始时间」排序 |
| 功能查询 | 从教室功能表汇总下拉选择（桌椅 / 钢琴 / 画架 / 瑜伽垫），列出具备该功能的教室及排课 |
| 空教室查询 | 按星期输出矩阵表：行为教室（含功能），列为时段；周末 6 节（上午 2、下午 2、晚上 2），周一至周五仅晚上 2 节；「空」=空闲，「—」=已排课，空闲多的教室排前 |

双校区：厦港 / 镇海，可一键切换。

## 数据说明

- **不内置任何数据**。用户须在导入页选择两份文件，文件在**浏览器本地**由 SheetJS 解析，不上传服务器。
- 解析结果缓存在浏览器 `localStorage`，下次打开直接生效；可在导入页底部一键清除并重新导入。
- 表格解析逻辑见 `build_data.py`（离线统计脚本，输出 `data.json` 仅供校验，不随仓库发布）。

### 教室归属规则

- 招生简章中 `区域` 列决定校区：`【厦港校区】报名入口` → 厦港，`【镇海校区】报名入口` → 镇海。
- 教室名前缀 `厦港教室` / `镇海教室` 会被剥离；`钢琴教室`、`大礼堂`、`礼堂02` 归镇海；`思明小学…` 归厦港。
- 单元格内换行的多教室课程（换教室/跨天）会被拆分；功能表未登记的教室（舞蹈排练厅、小飞鹭剧场、思明小学场地等）显示为「功能未登记」。

## 目录结构

```
index.html      # 应用本体（单文件，内联样式与脚本）
build_data.py   # 招生简章离线解析与统计脚本
netlify.toml    # 发布配置（publish = "."）
```

## 本地开发与部署

```bash
# 本地预览：直接用浏览器打开 index.html 即可
# 部署到 Netlify（本仓库关联站点 sng-jiugong-pingtai）
netlify deploy --site 9d4db5a9-7c14-44fd-8bd0-6f18284848c7 --dir=. --prod
```

修改页面后：改 `index.html` → 提交推送 → 自动部署上线（见下）。

## 自动部署（GitHub Actions）

仓库内置 `.github/workflows/deploy.yml`，push 到 `main` 即触发部署到 Netlify 生产环境。

启用方式（二选一）：

1. **配置 Netlify Token（推荐，无需额外授权）**
   - 在 Netlify 后台 → Account settings → API tokens → Personal access tokens → New token → Generate
   - 把 token 作为仓库密钥添加：`gh secret set NETLIFY_AUTH_TOKEN --body "<token>" -R wqz93/jiugong-pingtai`
   - 之后每次 push 自动部署到 https://sng-jiugong-pingtai.netlify.app

2. **在 Netlify 后台关联本仓库**
   - Netlify → Add new site → Import an existing project → 选择 `wqz93/jiugong-pingtai`
   - 由 Netlify 自带的 CI 完成构建部署（仓库已配置 `netlify.toml`，发布目录为仓库根目录）

## 后续规划

首页其余入口待接入（课表查询、教师信息、数据统计等），确定功能与数据来源后按同样的「导入 → 查询」模式扩展。

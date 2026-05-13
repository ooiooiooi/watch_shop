## Watch Shop Backend

### 技术栈

- Spring Boot + Spring Data JPA
- MySQL（默认）

### 本地启动（MySQL）

默认连接配置在 [application.yml](file:///Users/mac/workspace/watch_shop/watch_shop_backend/src/main/resources/application.yml)：

- host: localhost:3306
- database: watch_shop（支持 createDatabaseIfNotExist=true）
- username: root
- password: 123456

启动：

```bash
cd watch_shop_backend
mvn spring-boot:run
```

验证：

```bash
curl --noproxy '*' http://localhost:8080/api/public/categories
```

### 可选：覆盖数据库配置（推荐用环境变量）

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/watch_shop?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true'
export SPRING_DATASOURCE_USERNAME='root'
export SPRING_DATASOURCE_PASSWORD='123456'
cd watch_shop_backend
mvn spring-boot:run
```

### 后台登录

- 接口：POST /api/admin/auth/login
- 默认账号：admin
- 默认密码：admin123

### 测试数据

启动时会自动写入分类/商品的初始测试数据，并在数据库为空时进行初始化（可通过 APP_SEED_ENABLED=false 关闭）。

### 注意

如果你本机开启了 HTTP 代理，curl 访问 localhost 可能会返回 502，请使用：

```bash
curl --noproxy '*' http://localhost:8080/api/public/categories
```

### 导入 Avi & Co. 手表

项目里新增了 `scripts/import_aviandco_catalog.py`，默认通过 Playwright 浏览器渲染 Avi & Co. 页面，再通过当前后台管理 API 写入本地库。

最小跑法：

```bash
cd /Users/mac/workspace/watch_shop
AVI_MAX_PAGES=1 AVI_IMPORT_LIMIT=20 python3 scripts/import_aviandco_catalog.py
```

常用环境变量：

- `AVI_MAX_PAGES`：抓取分页数，默认 `1`
- `AVI_IMPORT_LIMIT`：最多导入多少条，`0` 表示不限
- `AVI_FETCH_DETAILS`：是否再进详情页补全品牌、型号、参考号和图集，默认 `true`
- `AVI_FETCH_MODE`：抓取模式，默认 `browser`；必要时可切回 `html`
- `AVI_SLEEP_MS`：请求间隔，默认 `350`
- `AVI_CLEAR_EXISTING`：是否先清空现有商品、品牌、型号、分类，默认 `false`
- `AVI_COOKIE`：如果页面出现挑战或登录态校验，可填浏览器 Cookie 后重试
- `AVI_STORAGE_STATE`：复用已通过验证的浏览器会话状态文件

如果站点弹出浏览器挑战，先做一次可视化预热：

```bash
cd /Users/mac/workspace/watch_shop
AVI_BROWSER_HEADLESS=false \
AVI_BROWSER_WAIT_FOR_UNLOCK_MS=60000 \
AVI_SAVE_STORAGE_STATE=/private/tmp/aviandco-state.json \
/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
scripts/aviandco_browser_fetch.mjs listing https://www.aviandco.com/shop-by-brand
```

在弹出的浏览器里完成验证后，后续导入时复用：

```bash
cd /Users/mac/workspace/watch_shop
AVI_STORAGE_STATE=/private/tmp/aviandco-state.json \
AVI_MAX_PAGES=1 AVI_IMPORT_LIMIT=20 \
python3 scripts/import_aviandco_catalog.py
```

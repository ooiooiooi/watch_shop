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

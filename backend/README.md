# 深圳路线矩阵后端

## 作用

- 提供 `/api/health`
- 提供 `/api/route-matrix`
- 可直接托管上一级目录的前端静态页面

## 环境变量

参考同目录下的 `.env.example`：

- `AMAP_WEB_SERVICE_KEY`
- `ROUTE_PLANNER_HOST`
- `ROUTE_PLANNER_PORT`

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动服务

```bash
python app.py
```

默认地址：

- `http://127.0.0.1:5050/`

前端会优先请求：

- `http://127.0.0.1:5050/api/route-matrix`

如果页面不是通过这个后端托管，而是以 `file://` 或其他静态服务方式打开，前端也会优先尝试请求本地 `5050` 端口。

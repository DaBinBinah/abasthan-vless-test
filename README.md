# Abasthan 测试静态页 + VLESS（Node.js Web Service，共用唯一免费名额）

Abasthan 不支持 Dockerfile / 容器镜像部署，只支持 Node/Python/PHP/Static 从 Git 部署，
所以改走纯 Node.js Web Service：一个应用同时提供静态页和 VLESS-WS。

- 静态页：`GET /`（index.html），`GET /health` 返回 ok
- VLESS：`vless://fc8b6a71-8f59-4e41-9498-29f310a2795d@<子域名>:443?encryption=none&security=tls&type=ws&host=<子域名>&path=/577dd7e0#Abasthan-VLESS`
  - UUID: fc8b6a71-8f59-4e41-9498-29f310a2795d（本节点专用，与 217/VM 节点不同）
  - WS 路径：/577dd7e0，TLS 由 Abasthan 边缘终结，容器内只走明文 WS
  - 监听：$PORT（默认 3000），绑定 0.0.0.0
- 部署：Abasthan Dashboard → Create App → Web Service → Public Git Repository 填本仓库 URL
  - Language: Node.js 22，Build Command: `npm install`，Start Command: `npm start`
  - Instance: Free（512MB / 0.1vCPU，会休眠，见 pricing）
- 本地验证：2026-11-17，`/` 200，`/health` ok，VLESS-WS 握手后经 example.com:80 拿到 HTTP 200。

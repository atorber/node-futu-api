## FTAPI4J

Futu Open API WebSocket的JS版本。

### 目录结构：

1. src：js库文件
2. sample：示例


### 更新编译PB：
1. 从https://github.com/FutunnOpen/py-futu-api/tree/master/futu/common/pb上找到对应的分支(比如现在最新的是v3.14)，下载所有pb文件
2. src\ft-websocket\proto里替换所有proto文件，并用命令npx pbjs -t json-module -w commonjs -o proto.js  *.proto
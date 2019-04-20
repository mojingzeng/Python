# HTTP协议

- **HTTP**: Hypertext Transfer Protocol ,超文本传输协议

- **HTTP** 是一个基于 “请求与响应” 模式的、**无状态**的应用层协议；

- **HTTP** 协议采用 **URL** 作为定位网络资源的标识，

  - URL 的格式：http://host [:port] [path]
  - **host**：合法的 Internet 主机域名或 IP 地址
  - **port**： 端口号，缺省端口为 80 
  - **path**：请求资源的路径
  - 实例：http://www.baidu.com  或 http://14.215.177.39/s

- **HTTP** 协议对资源的操作：

  - **GET**:  请求获取 URL 位置的资源；
  - **HEAD** :  请求获取 URL 位置资源的响应消息报告，即获得该资源的头部信息
  - **POST** :  请求向 URL 位置的资源后附加新的数据
  - **PUT** :  请求向 URL 位置存储一个资源，覆盖原该处资源的部分内容；
  - **PATCH** ：  请求局部更新 URL 位置的资源，即改变该处资源的部分内容
  - **DELETE** :  请求删除 URL 位置存储的资源

- **PATCH** 和 **PUT** 的区别：
  假设 URL 位置有一组数据 UserInfo, 包括 UserID、UserName等20个字段

  需求：用户修改了UserName，其他不变

  - 采用 **PATCH** ，仅向 URL 提交 UserName 的局部更新请求；
  - 采用 **PUT** ，必须将所有20个字段一并提交到 URL ，未提交的字段被删除
  - 好处：节省了网络带宽 

  
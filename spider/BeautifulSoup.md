### BeautifulSoup 库

- 安装：

  - windows：pip install beautifulsoup

- 引用： from bs4 import BeautifulSoup

- BeautifulSoup 库解析器：

  |        解析器        |            使用方法             |         条件         |
  | :------------------: | :-----------------------------: | :------------------: |
  |   bs4的HTML解析器    | BeautifulSoup(mk,'html.parse')  |       安装bs4        |
  |   lxml的HTML解析器   |    BeautifulSoup(mk,'lxml')     |   pip install lxml   |
  | lxml的**XML** 解析器 |   BeautifulSoup('mk', 'xml')    |   pip install lxml   |
  |  html5lib 的解析器   | BeautifulSoup('mk', 'html5lib') | pip install html5lib |

- **BeautifulSoup 类的基本元素**：

  |    基本元素     |                           说明                            |
  | :-------------: | :-------------------------------------------------------: |
  |       Tag       |  标签，最基本的信息组织单元，分别用<>和</>标明开头和结尾  |
  |      Name       |   标签的名字，<p>...</p>的名字是 'p', 格式：<tag>.name    |
  |   Attributes    |        标签的属性，字典形式组织，格式：<tag>.attrs        |
  | NavigableString | 标签内非属性字符串，<>...</> 中字符串。格式：<tag>.string |
  |     Comment     |      标签内字符串的注释部分，一种特殊的 Comment 类型      |

  ```Python
  import requests
  from bs4 import BeautifulSoup
  
  
  url = "http://python123.io/ws/demo.html"
  r = requests.get(url)
  if r.status_code == 200:
      demo = r.text
      # 实例化一个 BeautifulSoup 对象
      soup = BeautifulSoup(demo, 'html.parser')
      # 获取 a 标签
      a = soup.a
      # 获取 a 标签的所有属性
      a_attrs= a.attrs
      # 获取 a 的父标签
      a_parent = a.parent
      
  ```

  
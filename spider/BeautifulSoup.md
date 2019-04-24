### BeautifulSoup 库

- 安装：

  - windows：pip install beautifulsoup

- 代码流程：

  - 核心思想： 将html文档转成Beautiful对象，然后掉用改对象中的属性和方法进行html文档制定内容的定位查找
  - 导包： from bs4 import BeautifulSoup
  - 创建 Beautiful对象：
    - 如果html 文档是来源于**本地** ：
      - BeautifulSoup ('open("本地的html文件")','lxml')
    - 如果 html 是来源**网络**：
      - BeautifulSoup ('网络请求到的页面数据’，'lxml')

- 属性和方法：

  1.  根据**标签名**查找
     - **soup.a** ： 智能找到第一个符合要求的标签		

  2.  获取**属性**：

     - **soup.a.attrs **：获取a 所有的属性和属性值，返回一个字典	

     - **soup.a.attrs['href'] **：获取href书书属性		

     - **soup.a['href']**： 也可以简写为这种模式

  3.  获取**内容**：

     - **soup.a.string**	

     - **soup.a.text**

     - **soup.a.get_text()**： 【注意】如果标签还有标签，那么string获取到的结果为None,而其他两个可以获取文本内容

  4.  **find**：找到第一个符合要求的标签

     - soup.find('a') 找到第一个符合要求的标签

     - soup.find('a', title="xxx")

     - soup.find('a', alt="xxx")

     - soup.find('a', class="xxx")

     - soup.find('a', id="xxx")

  5.  **find_all**: 找到所有符合要求的标签

     - soup.find_all('a')
     - soup.find_all(['a','b']) 找到所有的a和 b 标签

     - soup.find_all('a', limit=2) 限制前两个

  6.  根据选择器选择制定的内容：

     - **select**:  soup.select('#fing')

     - 常见的选择器：
       - 标签选择器 **(a)** 
       - 类选择器**(.)** 
       - id 选择器 **(#)** 
       - 层级选择器： div .dudu #lala .meme .xixi 下面好多级 div > p > a > .lala 只能下面一级

  - 【注意】select 选择器返回永远是列表，需要通过下标提取指定的对象

- **BeautifulSoup 库解析器**：

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

- **基于bs4库的HTML内容遍历方法**

  - 标签树的**下行遍历**：

    |       属性       |                           说明                            |
    | :--------------: | :-------------------------------------------------------: |
    |  **.contents**   |         子节点的列表，将<tag>所有儿子节点存入列表         |
    |  **.children**   | 子节点的迭代类型，与 .contants 类似，用于循环遍历儿子节点 |
    | **.descendants** |   子孙节点的迭代类型，包含所有的子孙节点，用于循环遍历    |

  - 标签树的**下行遍历**：

    |     属性     |                     说明                      |
    | :----------: | :-------------------------------------------: |
    | **.parent**  |                节点的父亲标签                 |
    | **.parents** | j节点先辈标签的迭代类型，用于循环遍历先辈节点 |

  - 标签树的**平行遍历**

    |        属性        |                          说明                          |
    | :----------------: | :----------------------------------------------------: |
    |   .next_sibling    |       返回安装 HTML 文本顺序的下一个平行节点标签       |
    | .previous_sibling  |       返回按照 HTML 文本顺序的上一个平行节点标签       |
    |   .next_siblings   | 迭代类型，返回按照 HTML 文本顺序的后续所有平行节点标签 |
    | .previous_siblings | 迭代类型，返回按照 HTML 文本顺序的前续所有平行节点标签 |

  - **prettify()** 方法：格式化html文本输出

- 扩展方法：

  |            方法             |                           说明                            |
  | :-------------------------: | :-------------------------------------------------------: |
  |          <>.find()          |   搜索且只返回一个结果，字符串类型，通 .find_all() 参数   |
  |      <>.find_parents()      |    在先辈节点中搜索，返回列表类型，同 .find_all() 参数    |
  |      <>.find_parent()       |   在先辈节点中返回一个结果，字符串类型，同 .find() 参数   |
  |   <>.find_next_siblings()   |  在后续平行节点中搜索，返回列表类型，同 .find_all() 参数  |
  |   <>.find_next_sibling()    | 在后续平行节点中返回一个结果，字符串类型，同 .find() 参数 |
  | <>.find_previous_siblings() |  在前序平行节点中搜索，返回列表类型，同 .find_all() 参数  |
  | <>.find_previous_sibling()  | 在前序平行节点中返回一个结果，字符串类型，同 .find() 参数 |

  
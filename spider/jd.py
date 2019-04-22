#！usr/bin/python3
import requests


url = "https://item.jd.com/100002544828.html"
try:
    r = requests.get(url)
    r.raise_for_status()
    r.encoding = r.apparent_encoding()
    print(r.text[:1000]
except:
    print("爬取失败")
    
#with open("./jd.html",'w',encoding="gbk") as fp:
#    fp.write(r.text)
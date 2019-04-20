#!/usr/bin/python
# _*_ coding:utf-8 _*_
# @Time   : 2019/4/20 23:05
# @Author : Jingzeng Mo
# @Project: Python
import requests
import time


def getHTMLText(url):
    """
    :param url:
    :return:
    """
    try:
        r = requests.get(url=url, timeout=3)
        r.raise_for_status()
        r.encoding = r.apparent_encoding
        return True
    except:
        return None


if __name__ == "__main__":
    t1 = time.time()
    print(t1)
    url = 'http://www.baidu.com'
    for i in range(100):
        res = getHTMLText(url)
        if not res:
            print("连接异常！", i)
        else:
            print(res,i)

    t2 = time.time()
    cost_time = t2 - t1
    print("运行时长：%0.2f 秒"%cost_time)
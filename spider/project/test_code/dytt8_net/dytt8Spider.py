#!/usr/bin/env/python
# _*_ coding:utf-8 _*_
# @Time   : 2019/1/4 15:10
# @Author : Jingzeng Mo
# @Project: spider
from lxml import etree
import requests


class DyttSpider:

    def __init__(self, url):
        self.start_url = url
        self.base_url = "https://www.dytt8.net"
        self.headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
                        AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"}

    def get_movies_url(self, response):
        # 提取电影详情页面的 url 地址
        tree = etree.HTML(response)
        movies_detail_url_list = []
        url_list = tree.xpath('.//table[@class="tbspan"]//a/@href')
        for url in url_list:
            url = self.base_url + url
            movies_detail_url_list.append(url)
        # 提取下一页的url地址



    def run(self):
        # 1.发起请求
        response = requests.get(url=self.start_url, headers=self.headers).content.decode("gbk")
        # 2. 解析数据
        self.get_movies_url(response)


if __name__ == "__main__":
    start_url = "https://www.dytt8.net/html/gndy/dyzz/index.html"
    spider = DyttSpider(start_url)
    spider.run()

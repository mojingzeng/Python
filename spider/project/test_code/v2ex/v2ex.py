#!/usr/bin/env/python
# _*_ coding:utf-8 _*_
# @Time   : 2019/1/3 20:40
# @Author : Jingzeng Mo
# @Project: spider
import requests
import re
from lxml import etree


class V2ex:

    def __init__(self, url):
        self.start_url = url
        self.headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
                        AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"}
        self.article_url = []

    def get_article_url(self, response):
        # 解析网页：提取下一页url,title, article_url
        tree = etree.HTML(response)
        next_url_list = tree.xpath('.//td[@class="super normal_page_right button"]/attribute::onclick')
        next_url_temp = next_url_list[0] if len(next_url_list) > 0 else None
        next_url = "https://www.v2ex.com" + re.findall("href='(.*)'", next_url_temp, re.S)[0]
        div_list = tree.xpath('.//div[@id="TopicsNode"]/div')
        # print(div_list)
        for div in div_list:
            article_url = "https://www.v2ex.com" + div.xpath('.//span[@class="item_title"]/a/attribute::href')[0]
            self.article_url.append(article_url)
        return next_url

    def save(self, response):
        with open("./v2ex.html", "w", encoding="utf-8") as fp:
            fp.write(response)

    def run(self):
        # 1.发情请求
        response = requests.get(url=self.start_url, headers=self.headers).content
        next_url = self.get_article_url(response)

 



if __name__ == "__main__":

    start_url = "https://www.v2ex.com/go/jobs"
    v = V2ex(url=start_url)
    v.run()


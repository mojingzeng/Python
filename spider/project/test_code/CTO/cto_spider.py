#!/usr/bin/env/python
# _*_ coding:utf-8 _*_
# @Time   : 2018/12/26 18:58
# @Author : Jingzeng Mo
# @Project: spider
import requests


class CtoSpider:
    """
    51cto 视频网站视频爬虫
    """

    def __init__(self, url, course_id):
        self.url = url
        self.params = {"id": course_id}
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
             AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36"
        }

    def parse_url(self):
        """
        发送请求：获取响应
        :return:
        """
        response = requests.get(url=self.url, params=self.params)
        return response.content.decode()

    def run(self):
        # 1.获取响应
        content = self.parse_url()
        print(content)


if __name__ == '__main__':
    url = "http://edu.51cto.com/center/course/lesson/index"
    course_id = 268706
    cto_obj = CtoSpider(url, course_id)
    cto_obj.run()

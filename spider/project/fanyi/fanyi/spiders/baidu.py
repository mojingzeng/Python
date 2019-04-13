# -*- coding: utf-8 -*-
import scrapy


class BaiduSpider(scrapy.Spider):
    # 百度词条中指定词条对应的翻译结果进行获取
    name = 'baidu'
    # allowed_domains = ['www.baidu.com']
    start_urls = ['https://fanyi.baidu.com/sug']
    # 发起 post 请求
    def start_requests(self):
        print("star...")
        # post 请求参数
        data = {
            'kw': 'dog'
        }
        for url in self.start_urls:
            # formdata: 请求参数对应的字典
            yield scrapy.FormRequest(url=url, formdata=data, callback=self.parse)

    def parse(self, response):
        print(response.text)

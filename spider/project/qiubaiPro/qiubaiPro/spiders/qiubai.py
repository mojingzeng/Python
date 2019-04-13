# -*- coding: utf-8 -*-
import scrapy
from qiubaiPro.items import QiubaiproItem

class QiubaiSpider(scrapy.Spider):
    name = 'qiubai'
    # allowed_domains = ['www.qiushibaike.com/text']
    start_urls = ['http://www.qiushibaike.com/text/']

    def parse(self, response):
        """
        得到解析的页面数据
        :param response:
        :return:
        """
        # 调用xpath解析
        div_list = response.xpath('//div[@id="content-left"]/div')
        # 存储解析到的页面数据到列表中
        data_list = []
        for div in div_list:
            # xpath 解析到的指定内容被存储到Selector对象中
            # extract() 方法可以将Selector对象中存储的数据值拿到
            # title = div.xpath('./div/a[2]/h2/text()').extract()[0]
            title = div.xpath('./div/a[2]/h2/text()').extract_first()
            content = div.xpath('.//div[@class="content"]/span/text()').extract()[0]

            # print(title,content)
            dict = {
                'author': title,
                'content': content
            }
            data_list.append(dict)

            # 1.将解析到的数据值( author 和 content ) 存储到 items 对象中
            item = QiubaiproItem()
            item['author'] = title
            item['content'] = content
            print(content)
            # 2.将item 对象提交给管道
            yield item
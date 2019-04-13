# -*- coding: utf-8 -*-
import scrapy
from qiubaipages.items import QiubaipagesItem

class QiubaiSpider(scrapy.Spider):
    name = 'qiubai'
    # allowed_domains = ['www.qiushibaike.com/text']
    start_urls = ['https://www.qiushibaike.com/text/']

    def parse(self, response):
        div_list = response.xpath('//*[@id="content-left"]/div')

        for div in div_list:
            author = div.xpath('./div[@class="author clearfix"]/a[2]/h2/text()').extract_first()
            content = div.xpath('string(.//div[@class="content"]/span)').extract_first()
            # print(author, content)

            item = QiubaipagesItem()
            item['author'] = author
            item['content'] = content

            yield item

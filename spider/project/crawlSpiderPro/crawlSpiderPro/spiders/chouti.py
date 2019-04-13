# -*- coding: utf-8 -*-
import scrapy
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule


class ChoutiSpider(CrawlSpider):
    name = 'chouti'
    # allowed_domains = ['dig.chouti.com']
    start_urls = ['httpS://dig.chouti.com/']

    link = LinkExtractor(allow=r'/all/hot/recent/\d+')
    rules = (
        Rule(link, callback='parse_item', follow=True),
    )

    def parse_item(self, response):
        # i = {}
        #i['domain_id'] = response.xpath('//input[@id="sid"]/@value').extract()
        #i['name'] = response.xpath('//div[@id="name"]').extract()
        #i['description'] = response.xpath('//div[@id="description"]').extract()
        # return i
        print(response)

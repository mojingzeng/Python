# -*- coding: utf-8 -*-

# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://doc.scrapy.org/en/latest/topics/item-pipeline.html


class QiubaiproPipeline(object):
    # 该方法只会在开始时执行一次
    fp = None
    def open_spider(self, spider):
        print("开始爬虫！")
        self.fp = open('./qiubai_pipe.txt', 'w', encoding='utf-8')
    # 该方法就可以接收爬虫文件提交过来的 item 对象，并且
    # 对 item 对象中存储的页面数据进行持久化存储

    # item 表示的就是接收到的item对象
    def process_item(self, item, spider):
        author = item['author']
        content = item['content']

        # 持久化存储

        self.fp.write(author + ":" + content + "\n\n")

        return item

    # 该方法只在爬虫结束时被调用
    def close_spider(self, spider):
        print("爬虫结束")
        self.fp.close()
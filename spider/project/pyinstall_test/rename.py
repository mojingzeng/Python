#!/usr/bin/env/python
# _*_ coding:utf-8 _*_
# @Time   : 2019/1/8 14:53
# @Author : Jingzeng Mo
import os


print("欢迎使用！")
while 1:
    BASE_DIR = input("请输入文件目录:")
    if BASE_DIR == 'q':
        break
    if os.path.isdir(BASE_DIR):
        files_list = os.listdir(BASE_DIR)
        for name in files_list:
            old_name = os.path.join(BASE_DIR, name)
            if len(name) == 1:
                name = '000' + name + '.ts'
            elif len(name) == 2:
                name = '00' + name + '.ts'
            elif len(name) == 3:
                name = '0' + name + '.ts'
            elif len(name) == 4:
                name = name + '.ts'
            new_name = os.path.join(BASE_DIR, name)
            os.rename(old_name, new_name)
        print(os.listdir(BASE_DIR))
    else:
        print("****你输入的不是目录！请重新输入！*****")
# print(files_list)



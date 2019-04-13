#!/usr/bin/env/python
# _*_ coding:utf-8 _*_
# @Time   : 2018/12/26 23:09
# @Author : Jingzeng Mo
# @Project: spider
import json
import base64
import re


s1 = "MiTynkzVsZOzTy0EMWl1ER5lmYwYYT3MlZBkTR5UZT4gTOBjlZwcNVyUWOw4kez4NH5YVNY1FMkBVT1AnZlkUSm9NT5E2dJmXZxEbHkpkZ4y1VwcOGklDWcwXO5gTki53Mc40Mm9NjkVGew0FOjFTmit0MQwFekBZmm1laJmUZk9Nj4AXZc5zNlNOG"
strgg = 'qimHiwDlsNzlilLPjEHylUXi0ENPHG5w3RNNxRLRq9UOOJMPHSUw3jLVp2P0auNi0x5NUPPxUnPiaW7PHAUw1gPNwYQzlmN0UeSZlOLNxXNNBJPPkvMw3I5RqJPxPIHYxP7OPILRqXPia2MjaQOzDjON'#W1'
strg = "qiBfsBcxnwNqxte4e5fFDnwY7m77wCmCqDBmq4B7DDrDnBIxriWvpdFGvGHKbc8J32IYEYN4KP1YMGBJOeHJ2pgxW7ve6v8u3CWWFYI4KPctnBIvLpgvpINtK2y402vxH2KJBu3vQ2ISpEcTTB3vddHxKqc2WBc"
# print(len(s1))

lens = len(strg)
lenx = lens - (lens % 4 if lens % 4 else 4)
# try:
print(lens, lenx)
result = base64.b64decode(strg[:lenx])
res = base64.b64decode(strgg)
# except:
#    pass
# d = base64.b64decode(result)
# print(result)
# print(len(result))
# print(res)

b1 = b'\xaa _\xb0\x171\x9f\x03j\xc6\xd7\xb8{\x97\xc5\x0e|\x18\xeen\xfb\xc0)\x82\xa80f\xab\x80{\x0c:\xc3\x9c\x121\xae%\xaf\xa5\xd1F\xbca\xcam\xcf\t\xdfb\x18\x11\x83x(\xfdX0`I9\xe1\xc9\xda\x981[\xbb\xde\xea\xff.\xdc%\x96\x15\x828(\xf7-\x9c\x12/.\x98/\xa4\x83m+l\xb8\xd3k\xf1\x1fb\x89\x06\xed\xefCb\x12\xa4G\x13L\x1d\xefu\xd1\xf1*\xa76'
b2 = b'\xaa)\x87\x8b\x00\xe5\xb0\xdc\xe5\x8aR\xcf\x8cA\xf2\x95E\xe2\xd0CO\x1cnp\xdd\x13M\xc5\x12\xd1\xab\xd5\x0e8\x93\x0f\x1d%0\xde2\xd5\xa7c\xf4j\xe3b\xd3\x1eMP\xf3\xf1Rs\xe2in\xcf\x1c\x050\xd6\x03\xcd\xc1\x843\x96ctQ\xe4\x99\x94\xe2\xcd\xc5sM\x04\x93\xcf\x92\xf30\xdc\x8eQ\xa8\x93\xf1<\x81\xd8\xc4\xfe\xce<\x82\xd1\xa9s\xe2kc#i\x03\xb3\x0e3\x8d'
# r = re.findall('x(..)', b1)
tmp = str(b2).split('\\x')[1:]
ss = ''
for st in tmp:
    ss +=st[:2]
print(ss)
print(len(ss))

# r =b1.hex()
# print(r)

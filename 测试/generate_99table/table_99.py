#!/usr/bin/python3
# 生成一个九九乘法表
with open('九九乘法表.txt','a',encoding='utf-8') as f:
    for j in range(1,10):
        i = 1        
        while(1):  
            s = str(i)+"*"+str(j)+"="+str(i*j)
            if i == j :
                
                print (s)
                #print (i,"*",j,"=",i*j)
                f.write(s+"\n")                
                break
            else:
                #print (i,"*",j,"=",i*j, end="  ")
                i += 1
                f.write(s+"  ")


       


#! /usr/bin/python3
"""
def fun(n):
    n1,n2 = 1,1
    count = 2
    # print(type(n1))
    if n < 0:
        return "请输入一个正整数"
    elif n == 1:
	    return print("1")
    elif n == 2:
	    return print("1,1")
    else:   
        print(n1,",",n2,end=",")
        
        while count < n:
           sum = n1 + n2
           print(sum,end=",")
           n1 = n2
           n2 = sum
           count += 1

           
if __name__ == "__main__":
            
    while True:
        n = input("请输入：")
        if n == 'q':
            break
        else :
            fun(int(n))
"""
# 用递归实现斐波那契数列

def fib(n):

    if n == 1 or n == 0:
        return n
    if n <= 2:
        return 1
    #fib(n-1)+fib(n-2) 
    return fib(n-1) + fib(n-2)
    
a = int(input("Please input a Number:")) 
#fib(a)
for i in range(a):
    print(fib(i),end=",")



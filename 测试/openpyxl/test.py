from openpyxl import Workbook


wb = Workbook()
# grab the active worksheet
ws = wb.active

# insert at the end (default)
# 可以通过create_sheet()这个方法来创建一个新的工作表
ws1 = wb.create_sheet("Mysheet")

# or insert at first position
ws2 = wb.create_sheet("Mysheet1",1)

# 工作表创建时会自动为其命名(Sheet,Sheet1,...),可以通过 Worksheet.title属性更改工作表名称
ws.title = "new Title"

# 一旦尾工作表提供了名称，就可以将其作为工作簿上的一个键：
ws3 = wb["new Title"]

# 可以使用 Workbook.sheetname 属性来查看工作簿的所有工作表的名称，返回一个列表
print(wb.sheetnames)

# 也可以遍历工作表
for sheet in wb:
    print(sheet.title)

# 创建工作表的副本;
# 注意：仅复制单元格(包括值、样式、超链接和注释)和某些工作表属性(包括维度、格式和属性)
source = wb.active
target = wb.copy_worksheet(source)

############ 单元格操作 ############

# Data can be assinged directly to cells
# 数据可以直接分配给单元格
ws ['A1'] = 42

# Rows can also be appended
# 也可以通过 append 的方式进行整行赋值
ws.append([1,2,3])

# Worksheet.cell()方法：
# 使用行和列表示法提供对单元格的访问：
d = ws1.cell(row=4, column=2, value=10)  # 设置第4行第2列单元格的值为10

# 可以使用切片访问单元格范围：
ws1['A1']='aa'
ws1['B2']='bb'
cell_range = ws1['A1':'C2']
print(cell_range)

# Python types will automatically be converted
# Python 的数据类型可以被自动转换
import datetime
ws['A2'] = datetime.datetime.now()
print(datetime.datetime.now())

# Save the file
wb.save("sample.xlsx")
print("it's ok!")

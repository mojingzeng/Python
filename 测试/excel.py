# coding: utf-8


from openpyxl import Workbook


wb = Workbook()
ws = wb.get_active_sheet()
ws.title = '99乘法表'
for row in range(1,10):
    for col in range(1, 10):
        ws.cell(row=row, column=col).value = row * col
wb.save(filename='mul_table.xlsx')

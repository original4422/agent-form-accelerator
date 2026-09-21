# Fictional test inputs, no production extractor or website mappings imported.
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]/'fixtures'/'pdf'
root.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
sections=[(40,750,['林示例','candidate@example.test | 中国','意向工作城市：杭州','学历层次：硕士']),
 (320,750,['第一段教育经历','南方示例学院','Southern Example College','深圳校区（Shenzhen campus）','软件工程']),
 (320,610,['第二段教育经历','北方示例大学','Northern Example University','北京校区（Beijing campus）','计算机科学']),
 (40,530,['个人介绍','我参与过虚构的校园资料整理项目，负责检查字段含义与数据格式。','这份资料中的人物、学校与经历仅用于本地测试。'])]
for name,blocks in [('two-columns',sections),('reverse-draw-order',list(reversed(sections)))]:
 c=Canvas(str(root/(name+'.pdf')),pagesize=(620,840),invariant=1)
 c.setTitle('Fictional resume extraction fixture')
 c.setFont('STSong-Light',11)
 for x,y,lines in blocks:
  for i,line in enumerate(lines):c.drawString(x,y-20*i,line)
 c.showPage();c.save()
c=Canvas(str(root/'scan.pdf'),pagesize=(620,840),invariant=1)
i=Image.new('RGB',(600,120),'white');ImageDraw.Draw(i).text((20,30),'Image-only fictional resume',fill='black');c.drawInlineImage(i,20,650,width=580,height=116);c.showPage();c.save()

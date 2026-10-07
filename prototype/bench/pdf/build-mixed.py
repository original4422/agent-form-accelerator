"""Deterministic fictional CV fixtures. Images never use real personal data."""
from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader

root = Path(__file__).resolve().parents[2] / 'fixtures' / 'pdf'
portrait = Image.new('RGB', (160, 180), '#dbeafe')
draw = ImageDraw.Draw(portrait)
draw.ellipse((50, 25, 110, 85), fill='#64748b')
draw.rounded_rectangle((30, 100, 130, 175), radius=25, fill='#64748b')
facts = Image.new('RGB', (520, 100), 'white')
ImageDraw.Draw(facts).text((15, 20), 'Earliest start: 2030-07-19 (image only)', fill='black')

for name in ['text-portrait', 'image-facts', 'mixed-scan-page', 'duplicate-names']:
    c = Canvas(str(root / (name + '.pdf')), pagesize=(620, 840), invariant=1)
    c.setTitle('Fictional mixed PDF - ' + name)
    c.setFont('Helvetica', 16)
    c.drawString(40, 785, 'Fictional CV fixture')
    c.setFont('Helvetica', 11)
    c.drawString(40, 750, 'Candidate: Taylor Example')
    c.drawString(40, 730, 'candidate@example.test')
    c.drawString(40, 710, 'Role: software engineering')
    if name == 'text-portrait':
        c.drawImage(ImageReader(portrait), 470, 690, width=100, height=112.5)
    elif name == 'image-facts':
        c.drawImage(ImageReader(facts), 40, 530, width=520, height=100)
    elif name == 'mixed-scan-page':
        c.showPage()
        c.drawImage(ImageReader(facts), 40, 530, width=520, height=100)
    else:
        c.drawString(40, 655, 'Candidate')
        c.drawString(330, 655, 'Reference')
        c.drawString(40, 635, 'Taylor Example')
        c.drawString(330, 635, 'Taylor Example')
        c.drawImage(ImageReader(portrait), 470, 690, width=100, height=112.5)
    c.showPage()
    c.save()

# Preserve the rendered inline-image counterexample, plus one inside a Form.
for name in ['inline-facts', 'form-inline-facts']:
    c = Canvas(str(root / (name + '.pdf')), pagesize=(620, 840), invariant=1)
    c.drawString(40, 750, 'Candidate: Taylor Example')
    if name.startswith('form-'):
        c.beginForm('facts')
    c.drawInlineImage(facts, 40, 530, width=520, height=100)
    if name.startswith('form-'):
        c.endForm()
        c.doForm('facts')
    c.showPage()
    c.save()

# PDF string data mentioning BI must not be mistaken for an image operator.
c = Canvas(str(root / 'literal-bi.pdf'), pagesize=(620, 840), invariant=1)
c.drawString(40, 750, 'BI is literal resume text, not a PDF operator')
c.showPage()
c.save()

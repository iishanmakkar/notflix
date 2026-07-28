from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Preformatted, PageBreak, KeepTogether,
)

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "README.md"
OUTPUT = ROOT / "output" / "pdf" / "Notflix-README-Updated.pdf"


def clean(text):
    return (text.replace("📚", "").replace("🌟", "").replace("📝", "")
                .replace("🔍", "").replace("💬", "").replace("👤", "")
                .replace("💎", "").replace("🛠️", "").replace("🚀", "")
                .replace("📱", "").replace("🔐", "").replace("🎨", "")
                .replace("📈", "").replace("🤝", "").replace("📄", "")
                .replace("👨‍💻", "").replace("—", "-").strip())


def inline(text):
    text = clean(text)
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r'<u>\1</u>', text)
    return text


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleNotflix", parent=styles["Title"], fontName="Helvetica-Bold",
                          fontSize=28, leading=34, alignment=TA_CENTER, textColor=colors.HexColor("#183B56"), spaceAfter=12))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontSize=12, leading=18,
                          alignment=TA_CENTER, textColor=colors.HexColor("#52758F"), spaceAfter=32))
styles.add(ParagraphStyle(name="H1Notflix", parent=styles["Heading1"], fontName="Helvetica-Bold",
                          fontSize=17, leading=22, textColor=colors.HexColor("#183B56"), spaceBefore=18, spaceAfter=9))
styles.add(ParagraphStyle(name="H2Notflix", parent=styles["Heading2"], fontName="Helvetica-Bold",
                          fontSize=13, leading=17, textColor=colors.HexColor("#276678"), spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle(name="BodyNotflix", parent=styles["BodyText"], fontName="Helvetica",
                          fontSize=9.5, leading=14, textColor=colors.HexColor("#1F2933"), spaceAfter=5))
styles.add(ParagraphStyle(name="BulletNotflix", parent=styles["BodyText"], fontName="Helvetica",
                          fontSize=9.5, leading=14, leftIndent=14, firstLineIndent=-10, bulletIndent=2,
                          textColor=colors.HexColor("#1F2933"), spaceAfter=3))
styles.add(ParagraphStyle(name="CodeNotflix", parent=styles["Code"], fontName="Courier", fontSize=7.7,
                          leading=10, backColor=colors.HexColor("#F1F5F9"), borderColor=colors.HexColor("#D6E0E8"),
                          borderWidth=0.4, borderPadding=7, spaceBefore=5, spaceAfter=10))
styles.add(ParagraphStyle(name="TableHeader", parent=styles["BodyText"], fontName="Helvetica-Bold",
                          fontSize=9.5, leading=14, textColor=colors.white))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D6E0E8"))
    canvas.line(doc.leftMargin, 1.25 * cm, A4[0] - doc.rightMargin, 1.25 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#52758F"))
    canvas.drawString(doc.leftMargin, 0.8 * cm, "Notflix - Project README")
    canvas.drawRightString(A4[0] - doc.rightMargin, 0.8 * cm, f"Page {doc.page}")
    canvas.restoreState()


def make_table(rows):
    widths = [4.0 * cm, 12.2 * cm]
    data = [[Paragraph(inline(cell), styles["TableHeader"] if row_index == 0 else styles["BodyNotflix"])
             for cell in row] for row_index, row in enumerate(rows)]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#183B56")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C9D7E2")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FBFD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def build():
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    story = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith("# "):
            story += [Spacer(1, 2.0 * cm), Paragraph(inline(line[2:]), styles["TitleNotflix"])]
            index += 1
            continue
        if line.startswith("## "):
            story.append(Paragraph(inline(line[3:]), styles["H1Notflix"]))
        elif line.startswith("### "):
            story.append(Paragraph(inline(line[4:]), styles["H2Notflix"]))
        elif line.lstrip().startswith("```"):
            index += 1
            code = []
            while index < len(lines) and not lines[index].lstrip().startswith("```"):
                code.append(lines[index])
                index += 1
            story.append(Preformatted("\n".join(code), styles["CodeNotflix"]))
        elif line.startswith("|") and index + 1 < len(lines) and re.match(r"^\|\s*-+", lines[index + 1]):
            headers = [cell.strip() for cell in line.strip("|").split("|")]
            index += 2
            rows = [headers]
            while index < len(lines) and lines[index].startswith("|"):
                rows.append([cell.strip() for cell in lines[index].strip("|").split("|")])
                index += 1
            story += [make_table(rows), Spacer(1, 8)]
            continue
        elif re.match(r"^[-*] ", line):
            story.append(Paragraph(inline(line[2:]), styles["BulletNotflix"], bulletText="•"))
        elif re.match(r"^\d+\. ", line):
            text = re.sub(r"^\d+\. ", "", line)
            story.append(Paragraph(inline(text), styles["BulletNotflix"], bulletText="•"))
        elif line.strip() and not line.startswith("<!--"):
            story.append(Paragraph(inline(line), styles["BodyNotflix"]))
        index += 1

    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=1.55 * cm, rightMargin=1.55 * cm,
                            topMargin=1.3 * cm, bottomMargin=1.7 * cm, title="Notflix README")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build()

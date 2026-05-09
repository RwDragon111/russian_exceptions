import json
import re
from pathlib import Path

import fitz
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "textbooks" / "physics-1000-tasks.pdf"
OUTPUT_PATH = ROOT / "physics-problems-data.js"
FIGURE_DIR = ROOT / "physics-problem-pages"

doc = fitz.open(str(PDF_PATH))

SECTIONS = [
    {
        "id": "mechanics",
        "title": "Механика",
        "groups": [
            {
                "id": "mechanics-short",
                "title": "Задачи с кратким ответом",
                "type": "short",
                "pages": (5, 51),
                "answer_pages": (267, 268),
                "topics": [
                    ("kinematics", "Кинематика", ["Кинематика"]),
                    ("dynamics", "Динамика", ["Динамика"]),
                    ("statics", "Статика", ["Статика"]),
                    ("conservation", "Законы сохранения в механике", ["Законы сохранения в механике"]),
                    ("mechanical-waves", "Механические колебания и волны", ["Механические колебания и волны"]),
                ],
            },
            {
                "id": "mechanics-extended",
                "title": "Задания с развернутым ответом",
                "type": "extended",
                "pages": (51, 78),
                "answer_pages": (269, 300),
                "topics": [("mechanics-extended-all", "Задания с развернутым ответом", [])],
            },
        ],
    },
    {
        "id": "molecular",
        "title": "Молекулярная физика и термодинамика",
        "groups": [
            {
                "id": "molecular-short",
                "title": "Задачи с кратким ответом",
                "type": "short",
                "pages": (79, 98),
                "answer_pages": (301, 301),
                "topics": [
                    ("clapeyron", "Уравнение Клапейрона-Менделеева", ["Клапейрона", "Менделеева"]),
                    ("first-law", "Внутренняя энергия. Первое начало термодинамики", ["Внутренняя энергия", "Первое начало"]),
                    ("heat-engines", "Циклы. Тепловой двигатель. Цикл Карно", ["Циклы", "Тепловой двигатель", "Карно"]),
                    ("humidity", "Влажность воздуха", ["Влажность воздуха"]),
                    ("thermal-balance", "Уравнение теплового баланса", ["теплового баланса"]),
                ],
            },
            {
                "id": "molecular-extended",
                "title": "Задания с развернутым ответом",
                "type": "extended",
                "pages": (98, 116),
                "answer_pages": (302, 322),
                "topics": [("molecular-extended-all", "Задания с развернутым ответом", [])],
            },
        ],
    },
    {
        "id": "electricity",
        "title": "Электродинамика: электричество",
        "groups": [
            {
                "id": "electricity-short",
                "title": "Задачи с кратким ответом",
                "type": "short",
                "pages": (117, 131),
                "answer_pages": (323, 323),
                "topics": [
                    ("electrostatics", "Электростатика", ["Электростатика"]),
                    ("direct-current", "Постоянный ток", ["Постоянный ток"]),
                ],
            },
            {
                "id": "electricity-extended",
                "title": "Задания с развернутым ответом",
                "type": "extended",
                "pages": (131, 159),
                "answer_pages": (324, 349),
                "topics": [("electricity-extended-all", "Задания с развернутым ответом", [])],
            },
        ],
    },
    {
        "id": "field",
        "title": "Электродинамика: электромагнитное поле",
        "groups": [
            {
                "id": "field-short",
                "title": "Задачи с кратким ответом",
                "type": "short",
                "pages": (160, 183),
                "answer_pages": (350, 350),
                "topics": [
                    ("magnetic-field", "Магнитное поле", ["Магнитное поле"]),
                    ("induction", "Электромагнитная индукция", ["Электромагнитная индукция"]),
                    ("em-waves", "Электромагнитные колебания и волны", ["Электромагнитные колебания", "волны"]),
                    ("optics", "Оптика", ["Оптика"]),
                ],
            },
            {
                "id": "field-extended",
                "title": "Задания с развернутым ответом",
                "type": "extended",
                "pages": (183, 205),
                "answer_pages": (351, 375),
                "topics": [("field-extended-all", "Задания с развернутым ответом", [])],
            },
        ],
    },
    {
        "id": "quantum",
        "title": "Квантовая физика",
        "groups": [
            {
                "id": "quantum-short",
                "title": "Задачи с кратким ответом",
                "type": "short",
                "pages": (206, 217),
                "answer_pages": (376, 376),
                "topics": [("quantum-short-all", "Квантовая физика", ["Квантовая физика"])],
            },
            {
                "id": "quantum-extended",
                "title": "Задания с развернутым ответом",
                "type": "extended",
                "pages": (217, 234),
                "answer_pages": (377, 402),
                "topics": [("quantum-extended-all", "Задания с развернутым ответом", [])],
            },
        ],
    },
    {
        "id": "qualitative",
        "title": "Качественные задачи с развернутым ответом",
        "groups": [
            {
                "id": "qualitative-extended",
                "title": "Качественные задачи с развернутым ответом",
                "type": "extended",
                "pages": (235, 266),
                "answer_pages": (403, 431),
                "topics": [("qualitative-extended-all", "Качественные задачи", [])],
            }
        ],
    },
]


NUMBER_RE = re.compile(r"^\s*(\d+)\s*[.]\s*(.*)$", re.S)
JOIN_MARKER = "§join§"
ANSWER_WORD = "Ответ"
ANSWER_PROMPT_RE = re.compile(r"\bО\s*т\s*в\s*е\s*т\s*:", re.I)
ANSWER_MARKER_START_RE = re.compile(r"^(\d{1,3})\s*[.]\s*(.*)$")
ANSWER_MARKER_INSIDE_RE = re.compile(r"(?<=[.)%])\s+(\d{1,3})\s*[.]\s*")
SECTION_HEADINGS = [
    "Механика",
    "Молекулярная физика",
    "термодинамика",
    "Электродинамика",
    "Квантовая физика",
    "Качественные задачи",
]


def clean(text):
    text = text.replace("\xad", "").replace("\u200b", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    return text.strip()


def block_text(block):
    lines = []
    for line in block.get("lines", []):
        spans = "".join(span.get("text", "") for span in line.get("spans", []))
        if spans.strip():
            lines.append(spans.strip())
    text = ""
    previous_joined = False
    for line in lines:
        should_join_next = line.endswith("\xad")
        line = line.rstrip("\xad").strip()
        if not text:
            text = line
        elif previous_joined:
            text += line
        else:
            text += " " + line
        previous_joined = should_join_next
    if previous_joined:
        text += JOIN_MARKER
    return clean(text)


def page_blocks(page_number):
    blocks = []
    page = doc.load_page(page_number)
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        text = block_text(block)
        if not text:
            continue
        x0, y0, x1, y1 = block["bbox"]
        if y1 > 528 and text.isdigit():
            continue
        if is_diagram_noise(text):
            continue
        blocks.append({"text": text, "bbox": (x0, y0, x1, y1), "page": page_number})
    return sorted(blocks, key=lambda item: (item["bbox"][1], item["bbox"][0]))


def is_diagram_noise(text):
    text = text.replace(JOIN_MARKER, "").strip()
    if not text or "Ответ" in text:
        return False
    words = re.findall(r"[A-Za-zА-Яа-яЁё]{2,}", text)
    long_words = [word for word in words if len(word) >= 3]
    symbol_count = len(re.findall(r"[=®►*_/\\|]", text))
    short_tokens = [token for token in text.split() if len(token.strip(".,:;!?()")) <= 2]
    if len(text) <= 55 and not long_words and (symbol_count >= 1 or len(short_tokens) >= 3):
        return True
    return len(text) <= 35 and len(short_tokens) >= 4 and len(long_words) <= 1


def is_numeric_heading(text):
    stripped = text.strip().rstrip(".")
    return bool(stripped) and all(part.isdigit() for part in stripped.split(".") if part)


def is_heading(text):
    if is_numeric_heading(text):
        return True
    if text.startswith("Ответы"):
        return True
    if any(heading in text for heading in SECTION_HEADINGS):
        return True
    if text in {"Механика", "Кинематика", "Динамика", "Статика", "Оптика", "Квантовая физика"}:
        return True
    if "Задачи с кратким ответом" in text or "Задания с развернутым ответом" in text:
        return True
    return "Качественные задачи" in text and "ответом" in text


def strip_leading_number(text):
    match = NUMBER_RE.match(text)
    if not match:
        return None, text
    return int(match.group(1)), match.group(2).strip()


def match_topic(text, topics, current_topic):
    lowered = text.lower()
    for topic_id, title, keys in topics:
        if text == title or any(key.lower() in lowered for key in keys):
            return topic_id
    return current_topic


def normalize_problem_text(text):
    prompt_index = find_answer_prompt(text)
    if prompt_index >= 0:
        text = text[:prompt_index]
    text = re.sub(r"_{2,}", "____", text)
    text = re.sub(r"\s+", " ", text)
    return repair_problem_text(clean(text.replace(JOIN_MARKER, "")))


def join_problem_parts(parts):
    text = ""
    for part in parts:
        if not text:
            text = part
        elif text.endswith(JOIN_MARKER):
            text = text[: -len(JOIN_MARKER)] + part.lstrip()
        else:
            text += " " + part
    return text


def repair_problem_text(text):
    text = re.sub(r"\bте\s+чет\b", "течет", text)
    text = re.sub(r"\bин\s+дукц", "индукц", text)
    text = re.sub(r"\bКа\s+ков\b", "Каков", text)
    text = re.sub(r"\bче\s+рез\b", "через", text)
    text = re.sub(r"\bпру\s+жин", "пружин", text)
    text = re.sub(r"\bмагнитно\s+го\b", "магнитного", text)
    text = re.sub(r"\bЛо\s+ренц", "Лоренц", text)
    text = re.sub(r"\bдлин(ой|а|у)\s+[/I1]\s*[—=-]\s*", lambda match: f"длин{match.group(1)} l = ", text)
    text = re.sub(r"\bток\s*1\s*=", "ток I =", text)
    text = re.sub(r"\bток\s*1(?=\s)", "ток I", text)
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    return clean(text)


def find_answer_prompt(text):
    match = ANSWER_PROMPT_RE.search(text)
    if match:
        return match.start()
    stripped = text.strip()
    if stripped == ANSWER_WORD or (stripped.startswith(f"{ANSWER_WORD} ") and not re.match(r"Ответ\s+в\b", stripped)):
        return text.find(ANSWER_WORD)
    return -1


def is_extended_heading(text):
    return "Задания с развернутым ответом" in text or "Качественные задачи" in text


def parse_short_group(group):
    topics = group["topics"]
    current_topic = topics[0][0]
    tasks = []
    current_parts = []
    current_number = None
    current_page = None
    next_number = 1
    stopped = False

    def finalize():
        nonlocal current_parts, current_number, current_page, next_number
        text = normalize_problem_text(join_problem_parts(current_parts))
        if len(text) < 15:
            current_parts = []
            current_number = None
            return
        number = current_number or next_number
        tasks.append({"number": number, "page": current_page, "topicId": current_topic, "text": text})
        next_number = max(next_number, number + 1)
        current_parts = []
        current_number = None

    for page_number in range(group["pages"][0], group["pages"][1] + 1):
        if stopped:
            break
        for block in page_blocks(page_number):
            text = block["text"]
            if is_extended_heading(text):
                stopped = True
                break
            new_topic = match_topic(text, topics, current_topic)
            if new_topic != current_topic and len(text) < 120:
                if current_parts:
                    finalize()
                current_topic = new_topic
                continue
            if is_heading(text):
                continue
            number, rest = strip_leading_number(text)
            if number is not None:
                if current_parts:
                    finalize()
                current_number = number
                current_page = page_number
                text = rest
            elif not current_parts:
                current_page = page_number
            prompt_index = find_answer_prompt(text)
            if prompt_index >= 0:
                before_answer = text[:prompt_index].strip()
                if before_answer:
                    current_parts.append(before_answer)
                finalize()
            else:
                current_parts.append(text)
    return tasks


def should_start_new_extended(current_text, block, last_block):
    if not current_text or not last_block:
        return False
    previous = current_text.strip()
    if not previous.endswith((".", "?", "!", ")")):
        return False
    gap = 999 if block["page"] != last_block["page"] else block["bbox"][1] - last_block["bbox"][3]
    return gap >= 18 and len(previous) >= 90


def parse_extended_group(group):
    topic_id = group["topics"][0][0]
    tasks = []
    current_parts = []
    current_number = None
    current_page = None
    next_number = 1
    started = False
    last_block = None

    def finalize():
        nonlocal current_parts, current_number, current_page, next_number
        text = normalize_problem_text(join_problem_parts(current_parts))
        if len(text) < 20:
            current_parts = []
            current_number = None
            return
        number = current_number or next_number
        tasks.append({"number": number, "page": current_page, "topicId": topic_id, "text": text})
        next_number = max(next_number, number + 1)
        current_parts = []
        current_number = None

    for page_number in range(group["pages"][0], group["pages"][1] + 1):
        for block in page_blocks(page_number):
            text = block["text"]
            if not started:
                if is_extended_heading(text):
                    started = True
                    continue
                if "Ответ" in text or "Задачи с кратким ответом" in text:
                    continue
            elif is_extended_heading(text):
                continue
            if not started or is_heading(text):
                continue
            number, rest = strip_leading_number(text)
            if number is not None and (number == next_number or number <= next_number + 2 or number < 10):
                if current_parts:
                    finalize()
                current_number = number
                current_page = page_number
                if rest:
                    current_parts.append(rest)
            elif should_start_new_extended(" ".join(current_parts), block, last_block):
                finalize()
                current_page = page_number
                current_parts.append(text)
            else:
                if not current_parts:
                    current_page = page_number
                current_parts.append(text)
            last_block = block
    if current_parts:
        finalize()
    return tasks


def parse_short_answers(group):
    answers = {}
    current_number = None
    buffer = []

    def flush():
        nonlocal current_number, buffer
        if current_number is not None and buffer:
            answers[current_number] = repair_answer_ocr(clean(" ".join(buffer)))
        buffer = []

    def start_answer(number, rest):
        nonlocal current_number, buffer
        flush()
        current_number = number
        buffer = []
        if rest:
            append_answer_text(rest)

    def append_answer_text(text):
        nonlocal current_number, buffer
        pieces = split_inline_answer_markers(text)
        if not pieces:
            if text:
                buffer.append(text)
            return
        first_text, markers = pieces
        if first_text:
            buffer.append(first_text)
        for number, rest in markers:
            start_answer(number, rest)

    for page_number in range(group["answer_pages"][0], group["answer_pages"][1] + 1):
        for block in page_answer_blocks(page_number):
            if page_number == group["answer_pages"][0] and block["bbox"][1] < 100:
                continue
            for text in block["lines"]:
                text = normalize_answer_block(text)
                marker = ANSWER_MARKER_START_RE.match(text)
                if marker:
                    if current_number is not None and not buffer and int(marker.group(1)) != current_number + 1:
                        append_answer_text(text)
                    else:
                        start_answer(int(marker.group(1)), marker.group(2).strip())
                elif is_heading(text):
                    continue
                elif current_number is not None:
                    append_answer_text(text)
    flush()
    return answers


def normalize_answer_block(text):
    text = clean(text)
    text = re.sub(r"(\d)\s*,\s*(\d)", r"\1,\2", text)
    text = re.sub(r"(\d)\s+[.]", r"\1.", text)
    return text


def repair_answer_ocr(text):
    text = text.replace("Ю", "10").replace("ю", "10")
    text = re.sub(r"[Зз](?=\s*[сc]\b)", "3", text)
    text = re.sub(r"[Оо](?=\s*[Нн]\b)", "0", text)
    text = re.sub(
        r"(?<=\d)\s*[Оо]{2,}\s*(?=\D|$)",
        lambda match: " " + "0" * len(re.sub(r"\s+", "", match.group(0))),
        text,
    )
    return clean(text)


def split_inline_answer_markers(text):
    markers = list(ANSWER_MARKER_INSIDE_RE.finditer(text))
    if not markers:
        return None
    first_text = text[:markers[0].start()].strip()
    parsed = []
    for index, marker in enumerate(markers):
        start = marker.end()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        parsed.append((int(marker.group(1)), text[start:end].strip()))
    return first_text, parsed


def page_answer_blocks(page_number):
    blocks = []
    page = doc.load_page(page_number)
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        x0, y0, x1, y1 = block["bbox"]
        if y1 > 528 and x0 > 300:
            continue
        lines = []
        for line in block.get("lines", []):
            text = clean("".join(span.get("text", "") for span in line.get("spans", [])))
            if text:
                lines.append(text)
        if lines:
            blocks.append({"lines": lines, "bbox": (x0, y0, x1, y1), "page": page_number})
    return sorted(blocks, key=lambda item: (item["bbox"][1], item["bbox"][0]))


def parse_extended_answers(group):
    answers = {}
    current_parts = []
    current_number = None
    next_number = 1
    started = False
    last_block = None

    def finalize():
        nonlocal current_parts, current_number, next_number
        solution = clean(" ".join(current_parts))
        if len(solution) > 15:
            number = current_number or next_number
            answers[number] = solution
            next_number = max(next_number, number + 1)
        current_parts = []
        current_number = None

    for page_number in range(group["answer_pages"][0], group["answer_pages"][1] + 1):
        for block in page_blocks(page_number):
            text = block["text"]
            if not started:
                if is_extended_heading(text):
                    started = True
                    continue
                if page_number == group["answer_pages"][0]:
                    started = True
            if is_heading(text):
                continue
            number, rest = strip_leading_number(text)
            is_problem_marker = number is not None and (
                number == next_number or (current_parts and number == next_number + 1) or (not current_parts and number <= 3)
            )
            if is_problem_marker:
                if current_parts:
                    finalize()
                current_number = number
                if rest:
                    current_parts.append(rest)
            elif "Возможное решение." in text and current_parts and should_start_new_extended(" ".join(current_parts), block, last_block):
                finalize()
                current_parts.append(text)
            else:
                current_parts.append(text)
            last_block = block
    if current_parts:
        finalize()
    return answers


def build_bank():
    bank = {"title": "1000 задач по физике", "source": "Physics1000.pdf", "sections": []}
    summary = []
    for section in SECTIONS:
        section_item = {"id": section["id"], "title": section["title"], "groups": []}
        for group in section["groups"]:
            if group["type"] != "short":
                continue
            tasks = parse_short_group(group) if group["type"] == "short" else parse_extended_group(group)
            answers = parse_short_answers(group) if group["type"] == "short" else parse_extended_answers(group)
            if answers:
                tasks = tasks[:max(answers)]
            for index, task in enumerate(tasks, start=1):
                task["number"] = index
            by_topic = {topic_id: {"id": topic_id, "title": title, "tasks": []} for topic_id, title, _ in group["topics"]}
            for task in tasks:
                answer = answers.get(task["number"], "")
                item = {
                    "id": f"{group['id']}-{task['number']}",
                    "number": task["number"],
                    "page": task["page"],
                    "text": task["text"],
                }
                if group["type"] == "short":
                    item["answer"] = answer
                else:
                    item["solution"] = answer
                if "рис" in task["text"].lower():
                    item["hasFigure"] = True
                    item["image"] = f"physics-problem-pages/page-{task['page']:03}.webp"
                by_topic.setdefault(task["topicId"], {"id": task["topicId"], "title": task["topicId"], "tasks": []})["tasks"].append(item)
            group_item = {
                "id": group["id"],
                "title": group["title"],
                "type": group["type"],
                "topics": [topic for topic in by_topic.values() if topic["tasks"]],
            }
            section_item["groups"].append(group_item)
            summary.append((section["title"], group["title"], len(tasks), sum(1 for task in tasks if answers.get(task["number"]))))
        if section_item["groups"]:
            bank["sections"].append(section_item)
    return bank, summary


def render_figure_pages(bank):
    FIGURE_DIR.mkdir(exist_ok=True)
    pages = {
        task["page"]
        for section in bank["sections"]
        for group in section["groups"]
        for topic in group["topics"]
        for task in topic["tasks"]
        if task.get("image")
    }
    for existing in FIGURE_DIR.glob("page-*.webp"):
        try:
            page_number = int(existing.stem.split("-")[-1])
        except ValueError:
            continue
        if page_number not in pages:
            existing.unlink()
    for page_number in sorted(pages):
        output = FIGURE_DIR / f"page-{page_number:03}.webp"
        if output.exists():
            continue
        pixmap = doc.load_page(page_number).get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        image.save(output, "WEBP", quality=42, method=6)


if __name__ == "__main__":
    bank, summary = build_bank()
    render_figure_pages(bank)
    OUTPUT_PATH.write_text(
        "window.PHYSICS_PROBLEM_BANK = " + json.dumps(bank, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    for row in summary:
        print(row)
    total = sum(len(topic["tasks"]) for section in bank["sections"] for group in section["groups"] for topic in group["topics"])
    print("total tasks", total)
    print("bytes", OUTPUT_PATH.stat().st_size)

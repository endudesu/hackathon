import os
import openai
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__)

# 날짜별 일기 데이터를 저장할 딕셔너리
diaries = {
    "2023-01-01": [
        {
            "content": "새해 첫 일기입니다! 오늘은 친구 '재윤'이와 함께 롯데시네마에 가서 영화 '베테랑'을 보고 왔어. 오랜만에 영화관에 가니 팝콘 냄새도 좋고, 관람 분위기 자체가 너무 즐거웠어."
        }
    ],
    "2023-01-02": [
        {
            "content": "오늘은 친구 '상윤'이와 함께 맛있는 피자를 먹었어! 요즘 상윤이랑 둘 다 바빠서 자주 못 만났는데 오랜만에 만나서 너무 반가웠어. 피자도 정말 맛있었고, 특히 고구마 무스가 듬뿍 들어간 피자가 기억에 남아."
        }
    ],
    "2023-01-03": [
        {
            "content": "오늘은 집에서 쉬면서 하루를 보냈어. 요즘 일이 많아서 조금 피곤했는데, 집에서 푹 쉬면서 밀린 드라마를 정주행했어. '이상한 변호사 우영우'라는 드라마를 보는데, 정말 재밌더라!"
        }
    ],
    "2023-01-04": [
        {
            "content": "파멸의 날, 이날 모두는 사망했다."
        }
    ]
}

# GPT 요청 함수
def gpt_request(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message['content'].strip()

# 관련 단어 생성 함수
def get_related_terms(keyword):
    prompt = f"'{keyword}'와 의미가 유사하거나 연관된 단어를 3~5개 제공해 주세요."
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    related_terms = response.choices[0].message['content'].strip().split(", ")
    return [keyword] + related_terms

# 질문 생성 워커
def question_worker(entry):
    prompt = f"사용자가 작성한 일기 내용에서 사건의 주요 요소가 충분히 설명되지 않은 경우 한 가지 구체적인 질문을 작성해 주세요.: '{entry}'"
    response = gpt_request(prompt)
    return response if response else None

# 감정 공감 워커
def empathy_worker(entry):
    prompt = f"사용자가 작성한 일기에서 감정을 분석하고 적절한 공감을 표현하세요.: '{entry}'"
    response = gpt_request(prompt)
    return response if response else None

# 기억 검색 워커
def memory_search_worker(keyword):
    all_entries = "\n\n".join(
        f"날짜: {date}\n내용: {entry['content']}"
        for date, entries in diaries.items()
        for entry in entries
    )
    prompt = f"다음은 사용자의 일기입니다. 이 일기에서 '{keyword}'와 관련된 내용을 찾아 요약해 주세요:\n\n{all_entries}"
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    summary = response.choices[0].message['content'].strip()
    return summary if summary else "관련된 기록이 없습니다."

# 유사 경험 리마인드 워커
def reminder_worker(entry_content):
    for date, entries in diaries.items():
        for entry in entries:
            if entry_content in entry["content"]:
                prompt = f"사용자가 일기를 작성했을 때, 과거와 연관이 있는 경우 자연스러운 대화를 생성해 주세요."
                response = gpt_request(prompt)
                return response if response else None
    return None

# 질문 중 가장 의미 있는 질문 선택 워커
def superviser_worker(entry1, entry2, entry3):
    prompt = f"입력된 3가지 질문 중 가장 사용자에게 의미가 있을 질문을 하나만 골라서 출력하세요.: '{entry1, entry2, entry3}'"
    response = gpt_request(prompt)
    return response if response else None

@app.route("/")
def index():
    return render_template("index.html")

# 일기 추가 엔드포인트
@app.route("/add_diary", methods=["POST"])
def add_diary():
    data = request.get_json()
    entry_content = data.get("entry")
    date = datetime.now().strftime("%Y-%m-%d")

    # 워커 호출
    question = question_worker(entry_content)
    empathy = empathy_worker(entry_content)
    reminder = reminder_worker(entry_content)
    superviser = superviser_worker(question, empathy, reminder)

    if date not in diaries:
        diaries[date] = []
    diaries[date].append({
        "content": entry_content,
        "superviser": superviser
    })

    return jsonify({"superviser": superviser})

# 일기 목록 가져오기 엔드포인트
@app.route("/get_diaries", methods=["GET"])
def get_diaries():
    return jsonify({"diaries": diaries})

# 기억 검색 엔드포인트
@app.route("/search_memory", methods=["POST"])
def search_memory():
    data = request.get_json()
    keyword = data.get("keyword", "")
    memory = memory_search_worker(keyword)
    return jsonify({"memory": memory if memory else "관련된 기록이 없습니다."})

if __name__ == "__main__":
    app.run(debug=True)

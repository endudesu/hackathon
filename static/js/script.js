const messagesContent = document.getElementById("messages-content");
const pastMessagesContent = document.getElementById("past-messages-content");
const diaryDates = document.getElementById("diaryDates");
const todayDiary = document.getElementById("todayDiary");
const pastDiaries = document.getElementById("pastDiaries");
const searchContainer = document.getElementById("searchContainer");
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const searchInput = document.getElementById("searchKeyword");
let isSearchActive = false; // 검색 활성 상태 추적 변수

// 마우스가 사이드바 위에 있을 때
sidebar.addEventListener("mouseenter", () => {
    sidebar.classList.add("expanded");
    content.classList.add("shifted");
});

// 마우스가 사이드바에서 벗어날 때
sidebar.addEventListener("mouseleave", () => {
    sidebar.classList.remove("expanded");
    content.classList.remove("shifted");
});

// 검색 버튼(토글 버튼) 클릭 시 검색창 표시 또는 검색 실행
document.querySelector('.search-toggle').addEventListener('click', () => {
    if (isSearchActive) {
        searchDiary(); // 검색어가 입력된 상태에서 버튼 클릭 시 검색 수행
    } else {
        searchContainer.classList.toggle('hidden'); // 검색창 표시/숨기기
    }
    isSearchActive = !isSearchActive; // 상태 토글
});

// 홈 버튼 클릭 시 초기 화면으로 이동하는 함수
function goHome() {
    todayDiary.style.display = "none"; // 오늘의 일기 작성 화면 숨기기
    pastDiaries.style.display = "none"; // 과거 일기 화면 숨기기
    loadDiaries(); // 일기 목록 로드하여 초기화
}

// 홈 버튼에 goHome 함수 연결
document.getElementById("homeButton").addEventListener("click", goHome);

// 메시지 추가 함수
function addMessage(content, type, target) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type);
    msgDiv.textContent = content;
    target.appendChild(msgDiv);
    target.scrollTop = target.scrollHeight;
}

// 일기 저장 함수
function saveDiary() {
    const entry = document.getElementById("diaryEntry").value;
    if (!entry.trim()) {
        alert("일기 내용을 입력하세요.");
        return;
    }

    addMessage(entry, "message-personal", messagesContent);
    document.getElementById("diaryEntry").value = ""; // 입력란 초기화
    fetch("/add_diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: entry })
    })
    .then(response => response.json())
    .then(data => {
        if (data.superviser) addMessage(data.superviser, "message-response", messagesContent);
        loadDiaries();
    })
    .catch(error => console.error("Error:", error));
}

// 일기 목록 로드 함수
function loadDiaries() {
    fetch("/get_diaries")
        .then(response => response.json())
        .then(data => {
            diaryDates.innerHTML = ""; // 기존 목록 초기화
            for (const date in data.diaries) {
                const dateItem = document.createElement("li");
                dateItem.textContent = date;
                dateItem.onclick = () => showDiaryDetails(data.diaries[date], true);
                diaryDates.appendChild(dateItem);
            }
        });
}

// 특정 날짜의 일기 표시 함수
function showDiaryDetails(entries, includeAIResponses) {
    todayDiary.style.display = "none";
    pastDiaries.style.display = "block";
    pastMessagesContent.innerHTML = ""; // 기존 메시지 초기화
    entries.forEach(entry => {
        addMessage(entry.content, "message-personal", pastMessagesContent);
        if (includeAIResponses && entry.superviser) {
            addMessage(entry.superviser, "message-response", pastMessagesContent);
        }
    });
}

// 검색 기능
function searchDiary() {
    const keyword = searchInput.value;
    if (!keyword.trim()) {
        alert("검색할 단어를 입력하세요.");
        return;
    }

    fetch("/search_memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword })
    })
    .then(response => response.json())
    .then(data => {
        displaySearchResults(data.memory);
    })
    .catch(error => console.error("Error:", error));
}

// 검색 결과 표시 함수
function displaySearchResults(memory) {
    pastMessagesContent.innerHTML = ""; // 기존 결과 초기화
    if (!memory || memory.length === 0) {
        addMessage("검색어와 관련된 과거 기록이 없습니다.", "message-response", pastMessagesContent);
    } else {
        if (Array.isArray(memory)) {
            memory.forEach(entry => {
                addMessage(`[${entry.date}] ${entry.content}`, "message-response", pastMessagesContent);
            });
        } else {
            addMessage(memory, "message-response", pastMessagesContent);
        }
    }
    todayDiary.style.display = "none";
    pastDiaries.style.display = "block";
}

// 오늘 일기 작성 버튼 클릭 시 이벤트 처리
document.addEventListener("DOMContentLoaded", function() {
    const writeTodayDiaryButton = document.getElementById("writeTodayDiary");
    writeTodayDiaryButton.addEventListener("click", function() {
        todayDiary.style.display = "block"; // 일기 작성 화면 보이기
        pastDiaries.style.display = "none";
        messagesContent.innerHTML = ""; // 기존 메시지 초기화
        document.getElementById("diaryEntry").value = ""; // 입력란 초기화
    });
});

// 초기 일기 목록 로드
window.onload = loadDiaries;

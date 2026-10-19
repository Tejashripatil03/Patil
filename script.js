/*
 * College FAQ Assistant — beginner-friendly rule-based chatbot.
 * This project does not connect to a generative AI model. All factual answers
 * are selected from FAQ_DATA in faq-data.js.
 */

const FALLBACK_ANSWER = "I'm sorry, I couldn't find an answer to that question in my knowledge base. Please contact the relevant college department for accurate information.";
const MATCH_THRESHOLD = 0.22;

const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const clearChatButton = document.getElementById("clear-chat");
const categoryFilter = document.getElementById("category-filter");
const faqList = document.getElementById("faq-list");
const faqCount = document.getElementById("faq-count");
const runTestsButton = document.getElementById("run-tests");
const testResults = document.getElementById("test-results");
const testSummary = document.getElementById("test-summary");

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "am", "do", "does", "did", "can", "could",
  "how", "what", "when", "where", "which", "who", "why", "i", "me", "my",
  "we", "our", "you", "your", "for", "to", "of", "in", "on", "at", "and",
  "or", "please", "tell", "about", "college", "department", "kindly", "much"
]);

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTokens(text) {
  return normalizeText(text)
    .split(" ")
    .filter(token => token && !STOP_WORDS.has(token));
}

function getBigrams(tokens) {
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(tokens[i] + " " + tokens[i + 1]);
  }
  return bigrams;
}

/*
 * Score overlap between the user's words and an FAQ's question.
 * Exact/near-exact questions score highly. Token overlap and bigrams also help
 * with paraphrases such as "When are semester exams conducted?"
 */
function similarityScore(userQuestion, faqQuestion) {
  const userNormalized = normalizeText(userQuestion);
  const faqNormalized = normalizeText(faqQuestion);

  if (!userNormalized || !faqNormalized) return 0;
  if (userNormalized === faqNormalized) return 1;
  if (faqNormalized.includes(userNormalized) || userNormalized.includes(faqNormalized)) return 0.9;

  const userTokens = getTokens(userQuestion);
  const faqTokens = getTokens(faqQuestion);
  if (!userTokens.length || !faqTokens.length) return 0;

  const userSet = new Set(userTokens);
  const faqSet = new Set(faqTokens);
  let shared = 0;
  userSet.forEach(token => { if (faqSet.has(token)) shared++; });

  const overlapByQuestion = shared / faqSet.size;
  const overlapByUser = shared / userSet.size;
  const diceScore = (2 * shared) / (userSet.size + faqSet.size);

  const userBigrams = new Set(getBigrams(userTokens));
  const faqBigrams = new Set(getBigrams(faqTokens));
  let sharedBigrams = 0;
  userBigrams.forEach(pair => { if (faqBigrams.has(pair)) sharedBigrams++; });
  const bigramScore = userBigrams.size && faqBigrams.size
    ? sharedBigrams / Math.max(userBigrams.size, faqBigrams.size)
    : 0;

  return Math.max(
    (0.45 * overlapByQuestion) + (0.25 * overlapByUser) + (0.20 * diceScore) + (0.10 * bigramScore),
    overlapByQuestion * 0.75
  );
}

function findBestFAQ(question) {
  let bestFAQ = null;
  let bestScore = 0;

  FAQ_DATA.forEach(faq => {
    const score = similarityScore(question, faq.question);
    if (score > bestScore) {
      bestScore = score;
      bestFAQ = faq;
    }
  });

  if (bestScore < MATCH_THRESHOLD) {
    return { faq: null, score: bestScore };
  }
  return { faq: bestFAQ, score: bestScore };
}

function getCurrentTime() {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function addMessage(text, sender, options = {}) {
  const article = document.createElement("article");
  article.className = `message ${sender === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = sender === "user" ? "🙂" : "🎓";

  const content = document.createElement("div");
  content.className = "message-content";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  if (options.category) {
    const category = document.createElement("div");
    category.className = "message-time";
    category.textContent = options.category;
    content.appendChild(bubble);
    content.appendChild(category);
  } else {
    content.appendChild(bubble);
  }

  const time = document.createElement("time");
  time.className = "message-time";
  time.dateTime = new Date().toISOString();
  time.textContent = getCurrentTime();
  content.appendChild(time);

  article.append(avatar, content);
  chatMessages.appendChild(article);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return article;
}

function showTypingIndicator() {
  const article = document.createElement("article");
  article.className = "message assistant-message";
  article.id = "typing-indicator";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🎓";
  avatar.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "message-content";
  const bubble = document.createElement("div");
  bubble.className = "bubble typing-bubble";
  bubble.setAttribute("aria-label", "Assistant is typing");
  for (let i = 0; i < 3; i++) {
    bubble.appendChild(document.createElement("span"));
  }
  content.appendChild(bubble);
  article.append(avatar, content);
  chatMessages.appendChild(article);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

function answerQuestion(question, options = {}) {
  const cleanedQuestion = String(question || "").trim();
  if (!cleanedQuestion) {
    if (!options.silent) {
      addMessage("Please type a question first, then select Send.", "assistant");
      userInput.focus();
    }
    return { faq: null, answer: "Please type a question first, then select Send.", score: 0 };
  }

  const match = findBestFAQ(cleanedQuestion);
  return {
    faq: match.faq,
    score: match.score,
    answer: match.faq ? match.faq.answer : FALLBACK_ANSWER
  };
}

function sendQuestion(question) {
  const cleanedQuestion = String(question || "").trim();
  if (!cleanedQuestion) {
    addMessage("Please type a question first, then select Send.", "assistant");
    userInput.focus();
    return;
  }

  addMessage(cleanedQuestion, "user");
  userInput.value = "";
  userInput.focus();
  showTypingIndicator();

  // Small delay gives the demo a natural typing effect.
  window.setTimeout(() => {
    const result = answerQuestion(cleanedQuestion, { silent: true });
    removeTypingIndicator();
    addMessage(result.answer, "assistant", {
      category: result.faq ? `FAQ ${result.faq.id} · ${result.faq.category}` : "No matching FAQ"
    });
  }, 450);
}

function renderFAQList() {
  const selectedCategory = categoryFilter.value;
  const filteredFAQs = selectedCategory === "all"
    ? FAQ_DATA
    : FAQ_DATA.filter(faq => faq.category === selectedCategory);

  faqList.replaceChildren();
  faqCount.textContent = `${filteredFAQs.length} question${filteredFAQs.length === 1 ? "" : "s"}`;

  if (!filteredFAQs.length) {
    const empty = document.createElement("p");
    empty.className = "no-faqs";
    empty.textContent = "No FAQs in this category yet.";
    faqList.appendChild(empty);
    return;
  }

  filteredFAQs.forEach(faq => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "faq-item";
    const category = document.createElement("span");
    category.className = "faq-category";
    category.textContent = faq.category;
    const question = document.createElement("span");
    question.className = "faq-question";
    question.textContent = faq.question;
    button.append(category, question);
    button.addEventListener("click", () => sendQuestion(faq.question));
    faqList.appendChild(button);
  });
}

function clearChat() {
  chatMessages.replaceChildren();
  addMessage(
    "Hello! Welcome to the College FAQ Assistant. Ask me anything about admissions, courses, examinations, fees, or placements.",
    "assistant"
  );
  userInput.value = "";
  userInput.focus();
}

const TEST_CASES = [
  {
    id: "Test 1",
    question: "How can I apply for admission?",
    expected: "Admission application instructions",
    check: result => result.faq && result.faq.id === 1
  },
  {
    id: "Test 2",
    question: "Which courses are available?",
    expected: "Course information",
    check: result => result.faq && result.faq.id === 7
  },
  {
    id: "Test 3",
    question: "When are semester exams conducted?",
    expected: "Examination schedule information",
    check: result => result.faq && result.faq.id === 13
  },
  {
    id: "Test 4",
    question: "Does the college provide placements?",
    expected: "Placement assistance information",
    check: result => result.faq && result.faq.id === 25
  },
  {
    id: "Test 5",
    question: "What is the principal's personal phone number?",
    expected: "Unsupported-question fallback response",
    check: result => !result.faq && result.answer === FALLBACK_ANSWER
  }
];

function runTests() {
  testResults.replaceChildren();
  let passed = 0;

  TEST_CASES.forEach(testCase => {
    const result = answerQuestion(testCase.question, { silent: true });
    const isPass = testCase.check(result);
    if (isPass) passed++;

    const row = document.createElement("tr");
    const values = [
      testCase.id,
      testCase.question,
      testCase.expected,
      result.faq ? `Matched FAQ ${result.faq.id}: ${result.faq.question}` : "Fallback response shown"
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status ${isPass ? "pass" : "fail"}`;
    badge.textContent = isPass ? "PASS" : "FAIL";
    statusCell.appendChild(badge);
    row.appendChild(statusCell);
    testResults.appendChild(row);
  });

  testSummary.textContent = `${passed} of ${TEST_CASES.length} tests passed. ${passed === TEST_CASES.length ? "All checks passed." : "Review failed cases and adjust the matching logic or test expectations."}`;
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendQuestion(userInput.value);
});
userInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
clearChatButton.addEventListener("click", clearChat);
categoryFilter.addEventListener("change", renderFAQList);
runTestsButton.addEventListener("click", runTests);
document.querySelectorAll(".suggestion-chip").forEach(button => {
  button.addEventListener("click", () => sendQuestion(button.dataset.question));
});

renderFAQList();

/* Load this file after s2s-flashcards-addon.js.
   It adds a Quiz tab without changing the existing CMS or Flashcards logic. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    #quiz { max-width:760px; padding:clamp(22px,4vw,38px); border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,.91); box-shadow:var(--shadow); }
    .quiz-head { display:flex; flex-direction:column; align-items:flex-start; gap:16px; margin-bottom:20px; }
    .quiz-head h2 { margin:5px 0 0; font-size:27px; }.quiz-label { color:var(--primary); font-size:11px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; }
    .quiz-count { color:var(--muted); font-size:12px; font-weight:800; white-space:nowrap; }.quiz-score { display:flex; flex-direction:column; gap:9px; margin-bottom:20px; }
    .quiz-score div { flex:1; padding:13px 14px; border:1px solid var(--line); border-radius:14px; background:#fff; }.quiz-score span { display:block; color:var(--muted); font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }.quiz-score b { display:block; margin-top:5px; font-size:22px; letter-spacing:-.05em; }
    .quiz-card { padding:clamp(25px,5vw,46px); border:1px solid var(--line); border-radius:20px; background:#fff; }.quiz-category { color:var(--primary); font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }.quiz-word { margin:15px 0 6px; color:#17214a; font-size:clamp(38px,7vw,64px); font-weight:800; letter-spacing:-.065em; line-height:1; }.quiz-ipa { min-height:21px; color:var(--muted); font-family:"DM Mono",monospace; font-size:13px; }.quiz-prompt { margin:30px 0 16px; color:#43506c; font-size:14px; font-weight:700; }
    .quiz-options { display:grid; gap:9px; }.quiz-option { width:100%; border-color:#dfe5f1; background:#fff; color:#293450; text-align:left; }.quiz-option:hover:not(:disabled) { border-color:#bcc7f6; background:var(--soft); color:var(--primary); }.quiz-option:disabled { cursor:default; transform:none; }.quiz-option.is-correct { border-color:#78c69d; background:#effaf4; color:#167548; }.quiz-option.is-wrong { border-color:#f0aaaa; background:#fff1f1; color:#b42318; }
    .quiz-feedback { min-height:24px; margin:16px 0 0; font-size:13px; font-weight:800; }.quiz-feedback.is-correct { color:#167548; }.quiz-feedback.is-wrong { color:#b42318; }.quiz-next { margin-top:14px; border-color:var(--primary); background:var(--primary); color:#fff; }.quiz-next:hover { background:var(--primary-dark); color:#fff; }
    @media(min-width:561px) { #quiz { border-radius:24px; }.quiz-head { flex-direction:row; justify-content:space-between; align-items:flex-end; }.quiz-score { flex-direction:row; } }
  `;
  document.head.append(style);

  document.querySelector('.tabs').insertAdjacentHTML('beforeend', '<button data-tab="quiz" onclick="openTab(\'quiz\')">Quiz</button>');
  const insertAfter = document.querySelector('#flashcards') || document.querySelector('#add');
  insertAfter.insertAdjacentHTML('afterend', `
    <div id="quiz" class="tab-content">
      <div class="quiz-head"><div><div class="quiz-label">S2S practice mode</div><h2>Quiz</h2></div><div id="quizCount" class="quiz-count">Đang tải…</div></div>
      <div class="quiz-score"><div><span>Đúng</span><b id="quizCorrect">0</b></div><div><span>Đã trả lời</span><b id="quizAnswered">0</b></div></div>
      <section class="quiz-card">
        <div id="quizCategory" class="quiz-category">Vocabulary</div><div id="quizWord" class="quiz-word">—</div><div id="quizIpa" class="quiz-ipa"></div>
        <p class="quiz-prompt">Chọn nghĩa tiếng Việt phù hợp:</p><div id="quizOptions" class="quiz-options"></div><p id="quizFeedback" class="quiz-feedback"></p><button id="quizNext" class="quiz-next" type="button" onclick="quizNext()" hidden>Từ tiếp →</button>
      </section>
    </div>`);

  let quizCards = [];
  let quizIndex = 0;
  let correctAnswers = 0;
  let answeredQuestions = 0;
  let selectedAnswer = false;
  const NEXT_QUESTION_DELAY = 1200;

  function collectQuizCards() {
    let currentCategory = '';
    quizCards = markdownData.split(/\r?\n/).flatMap((line) => {
      if (line.startsWith('## ')) {
        currentCategory = line.slice(3).trim();
        return [];
      }
      if (!line.startsWith('|') || line.includes('English') || /^\|\s*-+/.test(line)) return [];
      const cells = line.split('|').slice(1, -1).map((value) => value.trim());
      return cells.length === 3 && cells[0] && cells[2]
        ? [{ word: cells[0].replace(/\*\*/g, ''), ipa: cells[1], meaning: cells[2], category: currentCategory }]
        : [];
    });
    quizIndex = 0;
    correctAnswers = 0;
    answeredQuestions = 0;
    renderQuiz();
  }

  function shuffled(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function renderQuiz() {
    if (!quizCards.length) return;
    const card = quizCards[quizIndex];
    selectedAnswer = false;
    quizCategory.textContent = card.category || 'Vocabulary';
    quizWord.textContent = card.word;
    quizIpa.textContent = card.ipa;
    quizCount.textContent = `${quizIndex + 1} / ${quizCards.length} câu`;
    quizCorrect.textContent = correctAnswers;
    quizAnswered.textContent = answeredQuestions;
    quizFeedback.textContent = '';
    quizFeedback.className = 'quiz-feedback';
    quizNext.hidden = true;

    const distractors = shuffled(
      [...new Set(quizCards.map((item) => item.meaning).filter((meaning) => meaning !== card.meaning))],
    ).slice(0, 3);
    const options = shuffled([card.meaning, ...distractors]);
    quizOptions.innerHTML = '';

    options.forEach((meaning) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.textContent = meaning;
      button.addEventListener('click', () => answerQuiz(button, meaning === card.meaning, card.meaning));
      quizOptions.append(button);
    });
  }

  function answerQuiz(button, isCorrect, correctMeaning) {
    if (selectedAnswer) return;
    selectedAnswer = true;
    answeredQuestions += 1;
    document.querySelectorAll('.quiz-option').forEach((option) => {
      option.disabled = true;
      if (option.textContent === correctMeaning) option.classList.add('is-correct');
    });
    if (isCorrect) {
      correctAnswers += 1;
      quizFeedback.textContent = '✓ Chính xác!';
      quizFeedback.classList.add('is-correct');
    } else {
      button.classList.add('is-wrong');
      quizFeedback.textContent = `Đáp án đúng: ${correctMeaning}`;
      quizFeedback.classList.add('is-wrong');
    }
    quizCorrect.textContent = correctAnswers;
    quizAnswered.textContent = answeredQuestions;
    quizNext.hidden = false;

    window.setTimeout(() => {
      if (selectedAnswer) window.quizNext();
    }, NEXT_QUESTION_DELAY);
  }

  window.quizNext = () => {
    if (!quizCards.length) return;
    quizIndex = (quizIndex + 1) % quizCards.length;
    renderQuiz();
  };

  const previousRenderDictionary = window.renderDictionary;
  window.renderDictionary = function () {
    previousRenderDictionary();
    collectQuizCards();
  };

  if (markdownData) collectQuizCards();
})();

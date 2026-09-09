/* Add this file after the CMS' existing <script> tag. It adds a Flashcards tab
   without touching the Dictionary or Add Vocabulary behaviours. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    #flashcards { max-width:760px; margin: 0 auto; padding:clamp(22px,4vw,38px); border:1px solid var(--line); border-radius:24px; background:rgba(255,255,255,.91); box-shadow:var(--shadow); }
    .flash-head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-bottom:20px; }
    .flash-head h2 { margin:5px 0 0; font-size:27px; }.flash-label { color:var(--primary); font-size:11px; font-weight:800; letter-spacing:.11em; text-transform:uppercase; }
    .flash-count { color:var(--muted); font-size:12px; font-weight:800; white-space:nowrap; }.flash-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:12px; }
    .flash-stat { padding:14px; border:1px solid var(--line); border-radius:14px; background:#fff; }.flash-stat span { display:block; color:var(--muted); font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }.flash-stat b { display:block; margin-top:5px; font-size:22px; letter-spacing:-.05em; }
    .flash-progress { height:8px; overflow:hidden; margin-bottom:20px; border-radius:99px; background:#e5eaf4; }.flash-progress i { display:block; width:0; height:100%; background:linear-gradient(90deg,#4057d6,#7183f0); transition:width .25s ease; }
    .flash-card { min-height:350px; padding:clamp(25px,5vw,46px); border:1px solid var(--line); border-radius:20px; background:#fff; }.flash-category { color:var(--primary); font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }.flash-word { margin:15px 0 7px; color:#17214a; font-size:clamp(38px,7vw,64px); font-weight:800; letter-spacing:-.065em; line-height:1; }.flash-ipa { min-height:21px; color:var(--muted); font-family:"DM Mono",monospace; font-size:13px; }.flash-meaning { min-height:78px; margin:29px 0 20px; color:#293450; font-size:24px; font-weight:700; line-height:1.35; }.flash-meaning.is-hidden { color:#929bb0; font-size:15px; font-weight:500; }
    .flash-actions { display:flex; flex-wrap:wrap; gap:9px; padding-top:20px; border-top:1px solid var(--line); }.flash-actions button { border-color:#dfe5f1; background:#fff; }.flash-actions button:hover { border-color:#bcc7f6; background:var(--soft); color:var(--primary); }.flash-actions .flash-reveal { border-color:var(--primary); background:var(--primary); color:#fff; }.flash-actions .flash-reveal:hover { background:var(--primary-dark); color:#fff; }.flash-actions .flash-known { border-color:#bce5d0; background:#effaf4; color:#167548; }
    @media(max-width:560px) { .flash-head { align-items:flex-start; flex-direction:column; }.flash-stats { grid-template-columns:1fr; }.flash-actions button { flex:1 1 42%; } }
  `;
  document.head.append(style);

  document.querySelector('.tabs').insertAdjacentHTML('beforeend', '<button data-tab="flashcards" onclick="scrollToTab(\'flashcards\')">Flashcards</button>');
  document.body.querySelector('#add').insertAdjacentHTML('afterend', `
    <div id="flashcards" class="tab-content">
      <div class="flash-head"><div><div class="flash-label">S2S learning mode</div><h2>Flashcards</h2></div><div id="fcCount" class="flash-count">Đang tải…</div></div>
      <div class="flash-stats"><div class="flash-stat"><span>Đã xem</span><b id="fcSeen">0</b></div><div class="flash-stat"><span>Đã nhớ</span><b id="fcKnown">0</b></div><div class="flash-stat"><span>Tổng</span><b id="fcTotal">0</b></div></div>
      <div class="flash-progress"><i id="fcBar"></i></div>
      <section class="flash-card"><div id="fcCategory" class="flash-category">Vocabulary</div><div id="fcWord" class="flash-word">—</div><div id="fcIpa" class="flash-ipa"></div><div id="fcMeaning" class="flash-meaning is-hidden">Đoán nghĩa trước, rồi bấm “Hiện nghĩa”.</div><div class="flash-actions"><button class="flash-reveal" onclick="flashReveal()">Hiện nghĩa</button><button class="flash-known" onclick="flashKnown()">✓ Nhớ rồi</button><button onclick="flashAgain()">↻ Học lại</button><button onclick="flashNext()">Từ tiếp →</button><button onclick="flashShuffle()">↗ Trộn thẻ</button></div></section>
    </div>`);

  let flashcards = [], flashIndex = 0;
  const seenWords = new Set(), knownWords = new Set();
  function collectCards() {
    let currentCategory = '';
    flashcards = markdownData.split(/\r?\n/).flatMap(line => {
      if (line.startsWith('## ')) { currentCategory = line.slice(3).trim(); return []; }
      if (!line.startsWith('|') || line.includes('English') || /^\|\s*-+/.test(line)) return [];
      const cell = line.split('|').slice(1, -1).map(value => value.trim());
      return cell.length === 3 && cell[0] ? [{ word: cell[0].replace(/\*\*/g, ''), ipa: cell[1], meaning: cell[2], category: currentCategory }] : [];
    });
    flashIndex = 0; flashRender();
  }
  function flashRender() {
    if (!flashcards.length) return;
    const card = flashcards[flashIndex];
    fcCategory.textContent = card.category || 'Vocabulary'; fcWord.textContent = card.word; fcIpa.textContent = card.ipa;
    fcMeaning.textContent = 'Đoán nghĩa trước, rồi bấm “Hiện nghĩa”.'; fcMeaning.classList.add('is-hidden');
    seenWords.add(card.word); flashStats();
  }
  function flashStats() { fcSeen.textContent = seenWords.size; fcKnown.textContent = knownWords.size; fcTotal.textContent = flashcards.length; fcCount.textContent = `${flashIndex + 1} / ${flashcards.length} thẻ`; fcBar.style.width = `${flashcards.length ? knownWords.size / flashcards.length * 100 : 0}%`; }
  window.flashReveal = () => { fcMeaning.textContent = flashcards[flashIndex].meaning; fcMeaning.classList.remove('is-hidden'); };
  window.flashNext = () => { if (!flashcards.length) return; flashIndex = (flashIndex + 1) % flashcards.length; flashRender(); };
  window.flashKnown = () => { knownWords.add(flashcards[flashIndex].word); flashNext(); };
  window.flashAgain = () => { knownWords.delete(flashcards[flashIndex].word); flashNext(); };
  window.flashShuffle = () => { flashcards.sort(() => Math.random() - .5); flashIndex = 0; flashRender(); };

  const initialRender = window.renderDictionary;
  window.renderDictionary = function () { initialRender(); collectCards(); };
  if (markdownData) collectCards();
})();

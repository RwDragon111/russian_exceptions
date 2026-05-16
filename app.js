const rules = (window.RULES || []).map((rule) => ({
  ...rule,
  exceptions: uniqueWords(rule.exceptions || []),
  risky: uniqueWords(rule.risky || [])
}));

const playableRules = rules.filter((rule) => rule.exceptions.length > 0 && rule.risky.length > 0);
const exceptionDeck = playableRules.flatMap((rule) =>
  rule.exceptions.map((word) => ({ word, ruleId: rule.id, kind: "exception" }))
);
const riskyDeck = playableRules.flatMap((rule) =>
  rule.risky.map((word) => ({ word, ruleId: rule.id, kind: "risky" }))
);
const allExceptionWords = uniqueWords(rules.flatMap((rule) => rule.exceptions));
const ruleMap = new Map(rules.map((rule) => [rule.id, rule]));
const rulesByTask = groupByTask(rules);
const spellingTasks = (window.SPELLING_TASKS || []).filter(
  (task) => task?.ruleId && task?.masked && task?.answer && Array.isArray(task.options)
);
const spellingDeck = spellingTasks
  .map((task) => {
    const rule = ruleMap.get(task.ruleId);

    if (!rule || rule.exceptions.length === 0 || rule.risky.length === 0) {
      return null;
    }

    const normalizedWord = normalizeWord(task.word);
    const isException = rule.exceptions.some((word) => normalizeWord(word) === normalizedWord);
    const isRisky = rule.risky.some((word) => normalizeWord(word) === normalizedWord);

    if (!isException && !isRisky) {
      return null;
    }

    return {
      ...task,
      kind: isException ? "exception" : "risky"
    };
  })
  .filter(Boolean);
const physicsSections = window.PHYSICS_SECTIONS || [];
const physicsFormulas = physicsSections.flatMap((section) =>
  section.formulas.map((formula) => ({
    ...formula,
    sectionId: section.id,
    sectionTitle: section.title
  }))
);
const physicsProblemBank = window.PHYSICS_PROBLEM_BANK || { sections: [] };
const physicsProblemSectionMap = new Map(
  (physicsProblemBank.sections || []).map((section) => [section.id, section])
);
const physicsProblemGroupMap = new Map(
  (physicsProblemBank.sections || []).flatMap((section) =>
    section.groups.map((group) => [group.id, { ...group, sectionId: section.id, sectionTitle: section.title }])
  )
);
const physicsProblemTopicMap = new Map(
  (physicsProblemBank.sections || []).flatMap((section) =>
    section.groups.flatMap((group) =>
      group.topics.map((topic) => [
        topic.id,
        { ...topic, groupId: group.id, groupTitle: group.title, type: group.type, sectionId: section.id, sectionTitle: section.title }
      ])
    )
  )
);
const physicsProblemTaskMap = new Map(
  [...physicsProblemTopicMap.values()].flatMap((topic) =>
    topic.tasks.map((task) => [task.id, { ...task, topicId: topic.id, topicTitle: topic.title, groupId: topic.groupId, groupTitle: topic.groupTitle, type: topic.type, sectionId: topic.sectionId, sectionTitle: topic.sectionTitle }])
  )
);
const mathTasks = window.MATH_EGE_TASKS || [];
const mathTaskMap = new Map(mathTasks.map((task) => [task.id, task]));
const mathTasksByNumber = mathTasks.reduce((groups, task) => {
  if (!groups.has(task.number)) {
    groups.set(task.number, []);
  }

  groups.get(task.number).push(task);
  return groups;
}, new Map());
const mathNumbers = Array.from({ length: 12 }, (_, index) => index + 1).map((number) => {
  const tasks = mathTasksByNumber.get(number) || [];

  return {
    number,
    title: tasks[0]?.title || `№${number}`,
    count: tasks.length
  };
});

const subjects = [
  { id: "russian", title: "Русский язык", text: "Исключения, правила и ошибкоопасные слова." },
  { id: "physics", title: "Физика", text: "Формулы, таблица и тренажёр по учебнику Яковлева." },
  { id: "chemistry", title: "Химия", text: "Учебник для повторения и подготовки." },
  { id: "math", title: "Математика", text: "Алгебра и геометрия в одном разделе." }
];

const textbooksBySubject = {
  physics: [
    {
      title: "Открыть учебник",
      href: "textbooks/physics-yakovlev.pdf"
    }
  ],
  chemistry: [
    {
      title: "Открыть таблицу Менделеева",
      href: "textbooks/mendeleev-table.pdf"
    },
    {
      title: "Открыть учебник по химии",
      href: "textbooks/chemistry-10-profile-kartsova-levkin.pdf"
    }
  ],
  math: [
    {
      title: "Открыть учебник по алгебре",
      href: "textbooks/math-profile.pdf"
    },
    {
      title: "Открыть учебник по геометрии",
      href: "textbooks/geometry-10-11-atanasyan.pdf"
    }
  ]
};

const customModes = [
  { id: "letter", title: "Вставь букву" },
  { id: "seed", title: "Исключение или нет" },
  { id: "rule", title: "Правило" },
  { id: "exception", title: "Найди исключение" },
  { id: "risky", title: "Опасные слова" }
];
const customModeMap = new Map(customModes.map((mode) => [mode.id, mode]));
const authUsersKey = "ezzlearn-users-v1";
const authCurrentUserKey = "ezzlearn-current-user-v1";

const dom = {
  app: document.getElementById("app"),
  backButton: document.getElementById("back-button"),
  profileButton: document.getElementById("profile-button"),
  themeButton: document.querySelector("[data-global-action='theme']")
};

const query = new URLSearchParams(window.location.search);

const state = {
  route: "home",
  subjectId: null,
  screen: "intro",
  mistakes: 0,
  session: null,
  customSession: null,
  config: {
    mode: "letter",
    count: 10
  },
  physicsSession: null,
  physicsProblemSession: null,
  mathSession: null,
  profileMode: "login",
  profileMessage: null,
  locked: false,
  timer: null
};

applyStoredTheme();
updateProfileButton();
render();

if (query.get("autosolve") === "physics") {
  openPhysics();
  startPhysicsGame();
  window.setTimeout(() => autoSolvePhysicsGame(), 120);
} else if (query.get("autosolve") === "1") {
  openRussian();
  startGame();
  window.setTimeout(() => autoSolveGame(), 120);
}

document.addEventListener("click", (event) => {
  const globalButton = event.target.closest("[data-global-action]");

  if (globalButton) {
    handleGlobalAction(globalButton.dataset.globalAction);
    return;
  }

  const button = event.target.closest("button[data-action]");

  if (!button || state.locked) {
    return;
  }

  const { action, value } = button.dataset;

  if (action === "custom-answer" && state.customSession?.mode === "rule") {
    const rulesList = dom.app.querySelector(".rules-list");
    state.customSession.ruleListScrollTop = rulesList?.scrollTop || 0;
  }

  if (action === "rule-answer" && state.session) {
    const rulesList = dom.app.querySelector(".rules-list");
    state.session.ruleListScrollTop = rulesList?.scrollTop || 0;
  }

  switch (action) {
    case "open-subject":
      if (value === "russian") {
        openRussian();
      } else if (value === "physics") {
        openPhysics();
      } else if (value === "math") {
        openMath();
      } else {
        openPlaceholder(value);
      }
      break;
    case "start-game":
      startGame();
      break;
    case "configure-game":
      openConfigurator();
      break;
    case "config-mode":
      state.config.mode = value;
      state.config.count = clampCount(state.config.count, value);
      render();
      break;
    case "start-custom-practice":
      startCustomPractice();
      break;
    case "back-to-config":
      openConfigurator();
      break;
    case "go-home":
      goHome();
      break;
    case "russian-home":
      openRussian();
      break;
    case "show-exceptions":
      state.route = "russian-exceptions";
      render();
      break;
    case "close-exceptions":
      openRussian();
      break;
    case "spelling-answer":
      handleSpellingAnswer(value);
      break;
    case "seed-answer":
      handleSeedAnswer(value);
      break;
    case "rule-answer":
      handleRuleAnswer(value);
      break;
    case "exception-round-answer":
      handleExceptionRoundAnswer(value);
      break;
    case "toggle-risky":
      toggleRiskySelection(value);
      break;
    case "check-risky":
      checkRiskySelection();
      break;
    case "play-again":
      startGame();
      break;
    case "custom-play-again":
      startCustomPractice();
      break;
    case "custom-answer":
      handleCustomAnswer(value);
      break;
    case "toggle-custom-risky":
      toggleCustomRiskySelection(value);
      break;
    case "check-custom-risky":
      checkCustomRiskySelection();
      break;
    case "physics-start-game":
      startPhysicsGame();
      break;
    case "physics-open-problems":
      openPhysicsProblems();
      break;
    case "physics-problem-section":
      openPhysicsProblemTopics(value);
      break;
    case "physics-problem-group":
      openPhysicsProblemGroup(value);
      break;
    case "physics-problem-topic":
      openPhysicsProblemPractice(value);
      break;
    case "physics-problem-task":
      openPhysicsProblemTask(value);
      break;
    case "physics-problem-show-answer":
      showPhysicsProblemAnswer();
      break;
    case "physics-problem-check":
      checkPhysicsProblemAnswer();
      break;
    case "physics-problem-back-sections":
      openPhysicsProblems();
      break;
    case "physics-show-table":
      state.route = "physics-table";
      render();
      break;
    case "physics-close-table":
      openPhysics();
      break;
    case "physics-answer":
      handlePhysicsAnswer(value);
      break;
    case "physics-play-again":
      startPhysicsGame();
      break;
    case "math-open-game":
      openMathTopics();
      break;
    case "math-task-number":
      openMathPractice(Number(value));
      break;
    case "math-task-select":
      openMathTask(value);
      break;
    case "math-check-answer":
      checkMathAnswer();
      break;
    case "math-next-task":
      nextMathTask();
      break;
    case "math-back-topics":
      openMathTopics();
      break;
    case "profile-mode":
      state.profileMode = value;
      state.profileMessage = null;
      render();
      break;
    case "logout":
      logoutUser();
      break;
    default:
      break;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-auth-form]");

  if (!form) {
    return;
  }

  event.preventDefault();
  await handleAuthForm(form);
});

document.addEventListener("input", (event) => {
  const input = event.target.closest("input[data-action='config-count']");

  if (input) {
    state.config.count = clampCount(input.value);
    const output = dom.app.querySelector("[data-config-count-output]");

    if (output) {
      output.textContent = state.config.count;
    }
  }

  const problemAnswer = event.target.closest("input[data-action='physics-problem-answer']");

  if (problemAnswer && state.physicsProblemSession) {
    state.physicsProblemSession.userAnswer = problemAnswer.value;
    state.physicsProblemSession.feedback = null;
  }

  const mathAnswer = event.target.closest("input[data-action='math-answer']");

  if (mathAnswer && state.mathSession) {
    state.mathSession.userAnswer = mathAnswer.value;
    state.mathSession.feedback = null;
  }
});

function handleGlobalAction(action) {
  if (action === "back") {
    goHome();
    return;
  }

  if (action === "profile") {
    openProfile();
    return;
  }

  if (action === "theme") {
    toggleTheme();
    return;
  }

  if (action === "fullscreen") {
    toggleFullscreen();
  }
}

function goHome() {
  clearPendingTimer();
  state.route = "home";
  state.subjectId = null;
  state.screen = "intro";
  state.session = null;
  state.customSession = null;
  state.physicsSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.mistakes = 0;
  state.locked = false;
  render();
}

function openRussian() {
  clearPendingTimer();
  state.route = "russian";
  state.subjectId = "russian";
  state.screen = "intro";
  state.session = null;
  state.customSession = null;
  state.physicsSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.mistakes = 0;
  state.locked = false;
  render();
}

function openPhysics() {
  clearPendingTimer();
  state.route = "physics";
  state.subjectId = "physics";
  state.screen = "intro";
  state.session = null;
  state.customSession = null;
  state.physicsSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.mistakes = 0;
  state.locked = false;
  render();
}

function openMath() {
  clearPendingTimer();
  state.route = "math";
  state.subjectId = "math";
  state.screen = "intro";
  state.session = null;
  state.customSession = null;
  state.physicsSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.mistakes = 0;
  state.locked = false;
  render();
}

function openProfile() {
  clearPendingTimer();
  state.route = "profile";
  state.subjectId = null;
  state.profileMode = getActiveUser() ? "account" : "login";
  state.profileMessage = null;
  state.locked = false;
  render();
}

function openPlaceholder(subjectId) {
  state.route = "placeholder";
  state.subjectId = subjectId;
  state.physicsProblemSession = null;
  state.mathSession = null;
  render();
}

function startGame() {
  clearPendingTimer();
  state.customSession = null;

  if ((exceptionDeck.length === 0 && riskyDeck.length === 0) || spellingDeck.length === 0) {
    state.route = "russian-game";
    state.screen = "empty";
    render();
    return;
  }

  const spellingTask = sample(spellingDeck);
  const rule = ruleMap.get(spellingTask.ruleId);
  const rounds = buildExceptionRounds(rule);
  const spellingOptions = shuffleWords(spellingTask.options);

  state.route = "russian-game";
  state.screen = "letter-pick";
  state.mistakes = 0;
  state.locked = false;
  state.session = {
    spellingTask,
    spellingOptions,
    spellingChoice: null,
    spellingFeedback: null,
    seedWord: spellingTask.word,
    seedKind: spellingTask.kind,
    seedChoice: null,
    seedFeedback: null,
    ruleId: rule.id,
    ruleName: rule.name,
    wrongRuleIds: new Set(),
    solvedRuleId: null,
    ruleListScrollTop: 0,
    rounds,
    roundIndex: 0,
    roundFeedback: rounds.map(() => ({ wrongChoices: new Set(), solvedChoice: null })),
    finalSelection: buildFinalSelection(rule),
    selectedRisky: new Set(),
    finalFeedback: null
  };

  render();
}

function openConfigurator() {
  clearPendingTimer();
  state.route = "russian-game";
  state.subjectId = "russian";
  state.screen = "config";
  state.session = null;
  state.customSession = null;
  state.physicsSession = null;
  state.locked = false;
  state.config.count = clampCount(state.config.count);
  render();
}

function startCustomPractice() {
  clearPendingTimer();
  const mode = state.config.mode;
  const count = clampCount(state.config.count, mode);
  const tasks = buildCustomTasks(mode, count);

  if (tasks.length === 0) {
    state.route = "russian-game";
    state.screen = "empty";
    state.customSession = null;
    render();
    return;
  }

  state.config.count = count;
  state.route = "russian-game";
  state.subjectId = "russian";
  state.screen = "custom-practice";
  state.session = null;
  state.physicsSession = null;
  state.customSession = {
    mode,
    count,
    index: 0,
    mistakes: 0,
    tasks,
    ruleListScrollTop: 0
  };
  state.locked = false;
  render();
}

function buildCustomTasks(mode, count) {
  if (mode === "letter") {
    return pickMany(spellingDeck, count).map((task) => ({
      ...task,
      options: shuffleWords(task.options),
      wrongChoices: new Set(),
      solvedChoice: null
    }));
  }

  if (mode === "seed") {
    return pickMany([...exceptionDeck, ...riskyDeck], count).map((card) => ({
      ...card,
      answer: card.kind === "exception" ? "exception" : "not-exception",
      wrongChoices: new Set(),
      solvedChoice: null
    }));
  }

  if (mode === "rule") {
    return pickMany([...exceptionDeck, ...riskyDeck], count).map((card) => ({
      ...card,
      answer: card.ruleId,
      wrongChoices: new Set(),
      solvedChoice: null
    }));
  }

  if (mode === "exception") {
    return pickMany(exceptionDeck, count).map((card) => {
      const rule = ruleMap.get(card.ruleId);
      const target = card.word;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        target,
        answer: target,
        options: shuffleWords([...pickMany(rule.risky, Math.min(7, rule.risky.length)), target]),
        wrongChoices: new Set(),
        solvedChoice: null
      };
    });
  }

  if (mode === "risky") {
    return pickMany(playableRules, count).map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      ...buildFinalSelection(rule),
      selected: new Set(),
      feedback: null
    }));
  }

  return [];
}

function pickSeedCard() {
  const useException =
    riskyDeck.length === 0 || (exceptionDeck.length > 0 && Math.random() < 0.5);

  return sample(useException ? exceptionDeck : riskyDeck);
}

function handleSpellingAnswer(answer) {
  const correct = answer === state.session.spellingTask.answer;

  state.session.spellingChoice = answer;
  state.session.spellingFeedback = { correct };

  if (!correct) {
    state.mistakes += 1;
    render();
    return;
  }

  lockAndAdvance(() => {
    state.screen = "seed-check";
  });
}

function handleSeedAnswer(answer) {
  const correct = answer === expectedSeedAnswer();

  state.session.seedChoice = answer;
  state.session.seedFeedback = { correct };

  if (!correct) {
    state.mistakes += 1;
    render();
    return;
  }

  lockAndAdvance(() => {
    state.screen = "rule-pick";
  });
}

function handleRuleAnswer(ruleId) {
  const isCorrect = ruleId === state.session.ruleId;

  if (!isCorrect) {
    state.mistakes += 1;
    state.session.wrongRuleIds.add(ruleId);
    render();
    return;
  }

  state.session.solvedRuleId = ruleId;

  lockAndAdvance(() => {
    state.screen = "exception-rounds";
  });
}

function handleExceptionRoundAnswer(word) {
  const round = currentRound();
  const feedback = state.session.roundFeedback[state.session.roundIndex];
  const correct = round.target === word;

  if (!correct) {
    state.mistakes += 1;
    feedback.wrongChoices.add(word);
    render();
    return;
  }

  feedback.solvedChoice = word;
  const isLastRound = state.session.roundIndex >= state.session.rounds.length - 1;

  lockAndAdvance(() => {
    if (isLastRound) {
      state.screen = "risky-pick";
      return;
    }

    state.session.roundIndex += 1;
  });
}

function toggleRiskySelection(word) {
  const selected = state.session.selectedRisky;

  if (selected.has(word)) {
    selected.delete(word);
  } else {
    selected.add(word);
  }

  state.session.finalFeedback = null;
  render();
}

function checkRiskySelection() {
  const { targets } = state.session.finalSelection;
  const selected = state.session.selectedRisky;
  const targetSet = new Set(targets);
  const wrongSelections = [...selected].filter((word) => !targetSet.has(word));
  const missedTargets = targets.filter((word) => !selected.has(word));

  if (wrongSelections.length > 0 || missedTargets.length > 0) {
    state.mistakes += 1;
    state.session.finalFeedback = {
      wrongSelections: new Set(wrongSelections),
      missedTargets: new Set(missedTargets)
    };
    render();
    return;
  }

  state.session.finalFeedback = null;

  lockAndAdvance(() => {
    state.screen = "finish";
  });
}

function handleCustomAnswer(answer) {
  const task = currentCustomTask();
  const correct = answer === task.answer;

  if (!correct) {
    state.customSession.mistakes += 1;
    task.wrongChoices.add(answer);
    render();
    return;
  }

  task.solvedChoice = answer;
  lockAndAdvance(() => {
    advanceCustomPractice();
  }, 650);
}

function toggleCustomRiskySelection(word) {
  const task = currentCustomTask();

  if (task.selected.has(word)) {
    task.selected.delete(word);
  } else {
    task.selected.add(word);
  }

  task.feedback = null;
  render();
}

function checkCustomRiskySelection() {
  const task = currentCustomTask();
  const targetSet = new Set(task.targets);
  const wrongSelections = [...task.selected].filter((word) => !targetSet.has(word));
  const missedTargets = task.targets.filter((word) => !task.selected.has(word));

  if (wrongSelections.length > 0 || missedTargets.length > 0) {
    state.customSession.mistakes += 1;
    task.feedback = {
      wrongSelections: new Set(wrongSelections),
      missedTargets: new Set(missedTargets)
    };
    render();
    return;
  }

  task.feedback = null;
  lockAndAdvance(() => {
    advanceCustomPractice();
  }, 650);
}

function advanceCustomPractice() {
  if (state.customSession.index >= state.customSession.tasks.length - 1) {
    state.screen = "custom-finish";
    return;
  }

  state.customSession.index += 1;
}

function buildExceptionRounds(rule) {
  const count = Math.min(5, rule.exceptions.length);
  const chosenExceptions = pickMany(rule.exceptions, count);

  return chosenExceptions.map((target) => ({
    target,
    options: shuffleWords([...pickMany(rule.risky, Math.min(7, rule.risky.length)), target])
  }));
}

function buildFinalSelection(rule) {
  const targetCount = Math.min(8, rule.risky.length);
  const targets = pickMany(rule.risky, targetCount);
  const localDistractors = rule.exceptions.filter((word) => !targets.includes(word));
  const globalDistractors = allExceptionWords.filter(
    (word) => !targets.includes(word) && !localDistractors.includes(word)
  );
  const distractorPool = uniqueWords([...localDistractors, ...globalDistractors]);
  const desiredOptionCount = Math.min(20, targetCount + distractorPool.length);
  const distractors = pickMany(distractorPool, Math.max(0, desiredOptionCount - targetCount));

  return {
    targets,
    options: shuffleWords([...targets, ...distractors])
  };
}

function currentRule() {
  return ruleMap.get(state.session.ruleId);
}

function currentRound() {
  return state.session.rounds[state.session.roundIndex];
}

function currentCustomTask() {
  return state.customSession.tasks[state.customSession.index];
}

function expectedSeedAnswer() {
  return state.session.seedKind === "exception" ? "exception" : "not-exception";
}

function render() {
  updateBackButton();

  if (state.route === "home") {
    renderHome();
    return;
  }

  if (state.route === "russian") {
    renderRussianIntro();
    return;
  }

  if (state.route === "russian-exceptions") {
    renderExceptionsTable();
    return;
  }

  if (state.route === "physics") {
    renderPhysicsIntro();
    return;
  }

  if (state.route === "physics-table") {
    renderPhysicsTable();
    return;
  }

  if (state.route === "physics-game") {
    renderPhysicsGame();
    return;
  }

  if (state.route === "physics-finish") {
    renderPhysicsFinish();
    return;
  }

  if (state.route === "physics-problems") {
    renderPhysicsProblemSections();
    return;
  }

  if (state.route === "physics-problem-topics") {
    renderPhysicsProblemTopics();
    return;
  }

  if (state.route === "physics-problem-practice") {
    renderPhysicsProblemPractice();
    return;
  }

  if (state.route === "math") {
    renderMathIntro();
    return;
  }

  if (state.route === "math-topics") {
    renderMathTopics();
    return;
  }

  if (state.route === "math-practice") {
    renderMathPractice();
    return;
  }

  if (state.route === "profile") {
    renderProfile();
    return;
  }

  if (state.route === "placeholder") {
    renderPlaceholder();
    return;
  }

  renderRussianGame();
}

function renderHome() {
  dom.app.innerHTML = `
    <section class="hero-panel">
      <div>
        <p class="kicker">Материалы по предметам</p>
        <h1 class="main-title home-title">Выбери предмет</h1>
      </div>
      <div class="subject-grid">
        ${subjects.map(renderSubjectCard).join("")}
      </div>
    </section>
  `;
}

function renderSubjectCard(subject) {
  return `
    <button class="subject-card" data-action="open-subject" data-value="${escapeHtml(subject.id)}">
      <strong>${escapeHtml(subject.title)}</strong>
      <span>${escapeHtml(subject.text)}</span>
    </button>
  `;
}

function renderProfile() {
  const activeUser = getActiveUser();

  dom.app.innerHTML = `
    <section class="game-panel profile-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Профиль</p>
            <h1 class="main-title">${activeUser ? escapeHtml(activeUser.username) : "Вход в аккаунт"}</h1>
            <p class="screen-text">Профиль хранится в этом браузере и помогает отмечать решённые задания.</p>
          </div>
        </div>

        ${renderProfileMessage()}
        ${activeUser ? renderAccountProfile(activeUser) : renderAuthForms()}
      </div>
    </section>
  `;
}

function renderAuthForms() {
  const isRegister = state.profileMode === "register";

  return `
    <div class="profile-tabs">
      <button class="action-button ${isRegister ? "secondary" : "primary"}" data-action="profile-mode" data-value="login">Войти</button>
      <button class="action-button ${isRegister ? "primary" : "secondary"}" data-action="profile-mode" data-value="register">Создать аккаунт</button>
    </div>

    ${isRegister ? renderRegisterForm() : renderLoginForm()}
  `;
}

function renderLoginForm() {
  return `
    <form class="auth-form" data-auth-form="login" autocomplete="on">
      <label>
        <span>Логин</span>
        <input type="text" name="username" autocomplete="username" required>
      </label>
      <label>
        <span>Пароль</span>
        <input type="password" name="password" autocomplete="current-password" required>
      </label>
      <button class="action-button primary" type="submit">Войти</button>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form class="auth-form" data-auth-form="register" autocomplete="on">
      <label>
        <span>Логин</span>
        <input type="text" name="username" autocomplete="username" required>
      </label>
      <label>
        <span>Пароль</span>
        <input type="password" name="password" autocomplete="new-password" required>
      </label>
      <label>
        <span>Повтори пароль</span>
        <input type="password" name="repeat-password" autocomplete="new-password" required>
      </label>
      <button class="action-button primary" type="submit">Создать аккаунт</button>
    </form>
  `;
}

function renderAccountProfile(user) {
  const mathSolved = getSolvedEntries("math");
  const physicsSolved = getSolvedEntries("physics");

  return `
    <div class="profile-grid">
      <article class="profile-card">
        <p class="kicker">Статистика</p>
        <div class="profile-stat-row">
          <strong>${mathSolved.length}</strong>
          <span>математика</span>
        </div>
        <div class="profile-stat-row">
          <strong>${physicsSolved.length}</strong>
          <span>физика</span>
        </div>
      </article>

      <article class="profile-card">
        <p class="kicker">Смена пароля</p>
        <form class="auth-form compact" data-auth-form="change-password" autocomplete="on">
          <label>
            <span>Старый пароль</span>
            <input type="password" name="current-password" autocomplete="current-password" required>
          </label>
          <label>
            <span>Новый пароль</span>
            <input type="password" name="new-password" autocomplete="new-password" required>
          </label>
          <label>
            <span>Повтори новый пароль</span>
            <input type="password" name="repeat-password" autocomplete="new-password" required>
          </label>
          <button class="action-button primary" type="submit">Поменять пароль</button>
        </form>
      </article>
    </div>

    <div class="profile-grid">
      ${renderSolvedList("Математика", mathSolved, "math")}
      ${renderSolvedList("Физика", physicsSolved, "physics")}
    </div>

    <div class="action-row">
      <button class="action-button secondary" data-action="logout">Выйти</button>
    </div>
  `;
}

function renderSolvedList(title, items, subject) {
  return `
    <article class="profile-card solved-list-card">
      <p class="kicker">${escapeHtml(title)}</p>
      <h2 class="profile-card-title">${formatTaskCount(items.length)}</h2>
      ${items.length
        ? `
          <div class="solved-list">
            ${items.slice(0, 18).map((item) => `
              <div class="solved-list-item">
                <strong>${escapeHtml(formatSolvedTitle(item, subject))}</strong>
                <span>${escapeHtml(formatSolvedDate(item.solvedAt))}</span>
              </div>
            `).join("")}
          </div>
        `
        : `<p class="mini-meta">Пока здесь пусто. Реши задание правильно, и оно появится в списке.</p>`}
    </article>
  `;
}

function renderProfileMessage() {
  if (!state.profileMessage) {
    return "";
  }

  return `<p class="profile-message ${state.profileMessage.type}">${escapeHtml(state.profileMessage.text)}</p>`;
}

function formatSolvedTitle(item, subject) {
  if (subject === "math") {
    return `Задание ${item.number}, задача ${item.displayNumber}`;
  }

  return item.title || `Задача ${item.displayNumber || item.number}`;
}

function formatSolvedDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderRussianIntro() {
  dom.app.innerHTML = `
    <section class="hero-panel russian-start">
      <div>
        <p class="kicker">Русский язык</p>
        <h1 class="main-title">Исключения</h1>
      </div>
      <div class="start-actions">
        <button class="action-button primary" data-action="start-game">Начать игру</button>
        <button class="action-button secondary" data-action="configure-game">Настроить игру</button>
      </div>
    </section>

    <section class="hero-panel show-table-panel">
      <button class="action-button secondary" data-action="show-exceptions">Показать все исключения</button>
    </section>
  `;
}

function startPhysicsGame() {
  clearPendingTimer();

  const rounds = pickMany(physicsFormulas, Math.min(10, physicsFormulas.length)).map(buildPhysicsRound);
  state.route = "physics-game";
  state.subjectId = "physics";
  state.screen = "physics-game";
  state.session = null;
  state.customSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.physicsSession = {
    rounds,
    index: 0,
    mistakes: 0
  };
  state.locked = false;
  render();
}

function openPhysicsProblems() {
  clearPendingTimer();
  state.route = "physics-problems";
  state.subjectId = "physics";
  state.screen = "physics-problems";
  state.physicsSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.locked = false;
  render();
}

function openPhysicsProblemTopics(sectionId) {
  const section = physicsProblemSectionMap.get(sectionId);

  if (!section) {
    openPhysicsProblems();
    return;
  }

  state.route = "physics-problem-topics";
  state.subjectId = "physics";
  state.screen = "physics-problem-topics";
  state.physicsProblemSession = {
    sectionId,
    groupId: null,
    topicId: null,
    taskId: null,
    showSolution: false,
    userAnswer: "",
    feedback: null
  };
  render();
}

function openPhysicsProblemGroup(groupId) {
  const group = physicsProblemGroupMap.get(groupId);

  if (!group) {
    openPhysicsProblems();
    return;
  }

  if (group.topics.length === 1) {
    openPhysicsProblemPractice(group.topics[0].id);
    return;
  }

  state.route = "physics-problem-topics";
  state.subjectId = "physics";
  state.screen = "physics-problem-topics";
  state.physicsProblemSession = {
    sectionId: group.sectionId,
    groupId,
    topicId: null,
    taskId: null,
    showSolution: false,
    userAnswer: "",
    feedback: null
  };
  render();
}

function openPhysicsProblemPractice(topicId) {
  const topic = physicsProblemTopicMap.get(topicId);

  if (!topic) {
    openPhysicsProblems();
    return;
  }

  state.route = "physics-problem-practice";
  state.subjectId = "physics";
  state.screen = "physics-problem-practice";
  state.physicsProblemSession = {
    sectionId: topic.sectionId,
    groupId: topic.groupId,
    topicId,
    taskId: topic.tasks[0]?.id || null,
    showSolution: false,
    userAnswer: "",
    feedback: null
  };
  render();
}

function openPhysicsProblemTask(taskId) {
  const task = physicsProblemTaskMap.get(taskId);

  if (!task) {
    return;
  }

  state.physicsProblemSession = {
    sectionId: task.sectionId,
    groupId: task.groupId,
    topicId: task.topicId,
    taskId,
    showSolution: false,
    userAnswer: "",
    feedback: null
  };
  render();
}

function showPhysicsProblemAnswer() {
  const task = currentPhysicsProblemTask();

  if (!task) {
    return;
  }

  state.physicsProblemSession.showSolution = true;
  state.physicsProblemSession.feedback = null;
  render();
}

function checkPhysicsProblemAnswer() {
  const task = currentPhysicsProblemTask();

  if (!task) {
    return;
  }

  const userAnswer = normalizePhysicsAnswer(state.physicsProblemSession.userAnswer || "");
  const correctAnswer = normalizePhysicsAnswer(task.answer || "");
  const userNumber = extractPhysicsNumber(state.physicsProblemSession.userAnswer || "");
  const correctNumber = extractPhysicsNumber(task.answer || "");

  if (!correctAnswer) {
    state.physicsProblemSession.feedback = "Ответ для этой задачи не распознался автоматически. Можно решить и сверить по сборнику.";
  } else if (userAnswer && (userAnswer === correctAnswer || (userNumber !== null && correctNumber !== null && userNumber === correctNumber))) {
    state.physicsProblemSession.feedback = "Правильно.";
    recordSolvedTask("physics", {
      id: task.id,
      number: task.number,
      displayNumber: task.number,
      title: `${task.topicTitle || "Физика"} · задача ${task.number}`
    });
  } else {
    state.physicsProblemSession.feedback = `Пока не совпало. Правильный ответ: ${task.answer}`;
  }
  render();
}

function openMathTopics() {
  clearPendingTimer();
  state.route = "math-topics";
  state.subjectId = "math";
  state.screen = "math-topics";
  state.session = null;
  state.customSession = null;
  state.physicsSession = null;
  state.physicsProblemSession = null;
  state.mathSession = null;
  state.locked = false;
  render();
}

function openMathPractice(number) {
  const tasks = mathTasksByNumber.get(number) || [];

  if (tasks.length === 0) {
    openMathTopics();
    return;
  }

  state.route = "math-practice";
  state.subjectId = "math";
  state.screen = "math-practice";
  state.mathSession = {
    number,
    taskId: tasks[0].id,
    userAnswer: "",
    feedback: null,
    solved: 0,
    mistakes: 0,
    seenIds: new Set()
  };
  state.mathSession.seenIds.add(state.mathSession.taskId);
  render();
}

function openMathTask(taskId) {
  const task = mathTaskMap.get(taskId);

  if (!task) {
    return;
  }

  const session = state.mathSession || {
    solved: 0,
    mistakes: 0,
    seenIds: new Set()
  };

  state.route = "math-practice";
  state.subjectId = "math";
  state.screen = "math-practice";
  state.mathSession = {
    ...session,
    number: task.number,
    taskId,
    userAnswer: "",
    feedback: null,
    seenIds: session.seenIds || new Set()
  };
  state.mathSession.seenIds.add(taskId);
  render();
}

function nextMathTask() {
  const session = state.mathSession;

  if (!session) {
    openMathTopics();
    return;
  }

  const tasks = mathTasksByNumber.get(session.number) || [];
  const available = tasks.filter((task) => !session.seenIds.has(task.id));
  const nextTask = sample(available.length ? available : tasks);

  if (!nextTask) {
    openMathTopics();
    return;
  }

  if (available.length === 0) {
    session.seenIds.clear();
  }

  session.taskId = nextTask.id;
  session.userAnswer = "";
  session.feedback = null;
  session.seenIds.add(nextTask.id);
  render();
}

function checkMathAnswer() {
  const task = currentMathTask();
  const session = state.mathSession;

  if (!task || !session) {
    return;
  }

  if (isMathAnswerCorrect(session.userAnswer, task.answer)) {
    session.feedback = { type: "success", text: "Правильно." };
    session.solved += 1;
    recordSolvedTask("math", {
      id: task.id,
      number: task.number,
      displayNumber: getMathTaskDisplayNumber(task),
      title: task.title
    });
  } else {
    session.feedback = { type: "danger", text: `Пока не совпало. Правильный ответ: ${task.answer}` };
    session.mistakes += 1;
  }

  render();
}

async function handleAuthForm(form) {
  const formData = new FormData(form);
  const formType = form.dataset.authForm;

  if (formType === "login") {
    await loginUser(formData);
    return;
  }

  if (formType === "register") {
    await registerUser(formData);
    return;
  }

  if (formType === "change-password") {
    await changeUserPassword(formData);
  }
}

async function loginUser(formData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const userKey = normalizeUsernameKey(username);
  const users = loadUsers();
  const user = users[userKey];

  if (!user || user.passwordHash !== await hashPassword(userKey, password)) {
    setProfileMessage("danger", "Логин или пароль не подошли.");
    return;
  }

  localStorage.setItem(authCurrentUserKey, userKey);
  state.profileMode = "account";
  setProfileMessage("success", "Ты вошёл в профиль.");
  updateProfileButton();
  render();
}

async function registerUser(formData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const repeatPassword = String(formData.get("repeat-password") || "");
  const userKey = normalizeUsernameKey(username);
  const users = loadUsers();

  if (userKey.length < 3) {
    setProfileMessage("danger", "Логин должен быть не короче 3 символов.");
    return;
  }

  if (password.length < 4) {
    setProfileMessage("danger", "Пароль должен быть не короче 4 символов.");
    return;
  }

  if (password !== repeatPassword) {
    setProfileMessage("danger", "Пароли не совпали.");
    return;
  }

  if (users[userKey]) {
    setProfileMessage("danger", "Такой логин уже есть в этом браузере.");
    return;
  }

  users[userKey] = {
    username,
    passwordHash: await hashPassword(userKey, password),
    createdAt: new Date().toISOString(),
    stats: createEmptyStats()
  };
  saveUsers(users);
  localStorage.setItem(authCurrentUserKey, userKey);
  state.profileMode = "account";
  setProfileMessage("success", "Профиль создан.");
  updateProfileButton();
  render();
}

async function changeUserPassword(formData) {
  const activeUser = getActiveUser();

  if (!activeUser) {
    openProfile();
    return;
  }

  const currentPassword = String(formData.get("current-password") || "");
  const newPassword = String(formData.get("new-password") || "");
  const repeatPassword = String(formData.get("repeat-password") || "");

  if (activeUser.passwordHash !== await hashPassword(activeUser.key, currentPassword)) {
    setProfileMessage("danger", "Старый пароль не подошёл.");
    return;
  }

  if (newPassword.length < 4) {
    setProfileMessage("danger", "Новый пароль должен быть не короче 4 символов.");
    return;
  }

  if (newPassword !== repeatPassword) {
    setProfileMessage("danger", "Новые пароли не совпали.");
    return;
  }

  activeUser.passwordHash = await hashPassword(activeUser.key, newPassword);
  saveActiveUser(activeUser);
  setProfileMessage("success", "Пароль обновлён.");
}

function logoutUser() {
  localStorage.removeItem(authCurrentUserKey);
  state.profileMode = "login";
  setProfileMessage("success", "Ты вышел из профиля.");
  updateProfileButton();
  render();
}

function setProfileMessage(type, text) {
  state.profileMessage = { type, text };
  render();
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(authUsersKey)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(authUsersKey, JSON.stringify(users));
}

function getActiveUser() {
  const userKey = localStorage.getItem(authCurrentUserKey);

  if (!userKey) {
    return null;
  }

  const user = loadUsers()[userKey];

  if (!user) {
    localStorage.removeItem(authCurrentUserKey);
    return null;
  }

  user.key = userKey;
  user.stats = normalizeUserStats(user.stats);
  return user;
}

function saveActiveUser(user) {
  const users = loadUsers();
  const userKey = user.key || normalizeUsernameKey(user.username);
  const { key, ...storedUser } = user;

  storedUser.stats = normalizeUserStats(storedUser.stats);
  users[userKey] = storedUser;
  saveUsers(users);
}

function normalizeUserStats(stats) {
  return {
    math: { ...(stats?.math || {}) },
    physics: { ...(stats?.physics || {}) }
  };
}

function createEmptyStats() {
  return {
    math: {},
    physics: {}
  };
}

function normalizeUsernameKey(username) {
  return String(username || "").trim().toLowerCase();
}

async function hashPassword(userKey, password) {
  const value = `ezzlearn:${userKey}:${password}`;

  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }

  return `fallback-${hash}`;
}

function recordSolvedTask(subject, task) {
  const activeUser = getActiveUser();

  if (!activeUser || !task?.id) {
    return;
  }

  const stats = normalizeUserStats(activeUser.stats);
  const bucket = stats[subject] || {};

  bucket[task.id] = {
    id: task.id,
    number: task.number || null,
    displayNumber: task.displayNumber || task.number || null,
    title: task.title || "Задание",
    solvedAt: new Date().toISOString()
  };
  stats[subject] = bucket;
  activeUser.stats = stats;
  saveActiveUser(activeUser);
  updateProfileButton();
}

function isTaskSolved(subject, taskId) {
  const activeUser = getActiveUser();
  return Boolean(activeUser?.stats?.[subject]?.[taskId]);
}

function getSolvedEntries(subject) {
  const activeUser = getActiveUser();
  return Object.values(activeUser?.stats?.[subject] || {}).sort((a, b) =>
    String(b.solvedAt || "").localeCompare(String(a.solvedAt || ""))
  );
}

function buildPhysicsRound(entry) {
  const direction = Math.random() < 0.5 ? "name-to-formula" : "formula-to-name";
  const distractors = pickMany(
    physicsFormulas.filter((item) => item.id !== entry.id),
    Math.min(3, physicsFormulas.length - 1)
  );

  return {
    entry,
    direction,
    choices: shuffleWords([entry, ...distractors]),
    wrongIds: new Set(),
    solvedId: null
  };
}

function handlePhysicsAnswer(answerId) {
  const round = currentPhysicsRound();
  const isCorrect = answerId === round.entry.id;

  if (!isCorrect) {
    round.wrongIds.add(answerId);
    state.physicsSession.mistakes += 1;
    render();
    return;
  }

  round.solvedId = answerId;
  lockAndAdvance(() => {
    if (state.physicsSession.index >= state.physicsSession.rounds.length - 1) {
      state.route = "physics-finish";
      state.screen = "physics-finish";
      return;
    }

    state.physicsSession.index += 1;
  }, 650);
}

function currentPhysicsRound() {
  return state.physicsSession.rounds[state.physicsSession.index];
}

function currentPhysicsProblemSection() {
  return physicsProblemSectionMap.get(state.physicsProblemSession?.sectionId);
}

function currentPhysicsProblemTopic() {
  return physicsProblemTopicMap.get(state.physicsProblemSession?.topicId);
}

function currentPhysicsProblemGroup() {
  return physicsProblemGroupMap.get(state.physicsProblemSession?.groupId);
}

function currentPhysicsProblemTask() {
  return physicsProblemTaskMap.get(state.physicsProblemSession?.taskId);
}

function currentMathTask() {
  return mathTaskMap.get(state.mathSession?.taskId);
}

function getMathTaskDisplayNumber(task) {
  const tasks = mathTasksByNumber.get(task?.number) || [];
  const index = tasks.findIndex((item) => item.id === task?.id);
  return index >= 0 ? index + 1 : "";
}

function normalizePhysicsAnswer(value) {
  return normalizeWord(fixPhysicsOcrDigits(value))
    .replace(/ё/g, "е")
    .replace(/\s+/g, "")
    .replace(/[.,]0+(?=\D|$)/g, "")
    .replace(/[^0-9a-zа-я+\-*/=,%°]/gi, "");
}

function extractPhysicsNumber(value) {
  const prepared = fixPhysicsOcrDigits(value)
    .replace(/(\d)\s+(?=\d)/g, "$1")
    .replace(",", ".");
  const match = prepared.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function fixPhysicsOcrDigits(value) {
  return String(value)
    .replace(/[Юю]/g, "10")
    .replace(/[Зз](?=\s*[сc]\b)/g, "3")
    .replace(/[Оо]/g, "0");
}

function isMathAnswerCorrect(userValue, correctValue) {
  const userAnswer = normalizeMathAnswer(userValue);
  const correctAnswers = splitMathAnswers(correctValue).map(normalizeMathAnswer).filter(Boolean);

  if (!userAnswer || correctAnswers.length === 0) {
    return false;
  }

  if (correctAnswers.includes(userAnswer)) {
    return true;
  }

  const userNumber = mathAnswerToNumber(userAnswer);

  return correctAnswers.some((answer) => {
    const correctNumber = mathAnswerToNumber(answer);
    return userNumber !== null && correctNumber !== null && Math.abs(userNumber - correctNumber) < 1e-9;
  });
}

function splitMathAnswers(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .split(/\s*(?:;|\bили\b)\s*/i);
}

function normalizeMathAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .replace(/[()]/g, "");
}

function mathAnswerToNumber(value) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    return null;
  }

  return Number(value);
}

function renderPhysicsIntro() {
  dom.app.innerHTML = `
    <section class="hero-panel russian-start">
      <div>
        <p class="kicker">Физика ЕГЭ · учебник Яковлева</p>
        <h1 class="main-title">Формулы по физике</h1>
      </div>
      <div class="start-actions">
        <button class="action-button primary" data-action="physics-start-game">Начать игру</button>
        ${renderTextbookLinks("physics")}
      </div>
    </section>

    <section class="hero-panel show-table-panel">
      <button class="action-button secondary" data-action="physics-open-problems">Решать задачи</button>
    </section>

    <section class="hero-panel show-table-panel">
      <button class="action-button secondary" data-action="physics-show-table">Посмотреть таблицу</button>
    </section>
  `;
}

function renderPhysicsTable() {
  dom.app.innerHTML = `
    <section class="table-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Физика ЕГЭ</p>
            <h1 class="main-title">Таблица формул</h1>
            <p class="mini-meta">Разделы взяты по структуре учебника Яковлева, формулы собраны как быстрый набор для повторения.</p>
          </div>
          <button class="close-button" type="button" data-action="physics-close-table" aria-label="Закрыть таблицу">×</button>
        </div>

        <div class="formula-table-wrap">
          <table class="formula-table">
            <thead>
              <tr>
                <th>Раздел</th>
                <th>Название</th>
                <th>Формула</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              ${physicsSections.map(renderPhysicsSectionRows).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderPhysicsSectionRows(section) {
  return section.formulas
    .map((formula, index) => `
      <tr>
        <td class="section-cell">${index === 0 ? renderPhysicsSectionLabel(section) : ""}</td>
        <td>${escapeHtml(formula.name)}</td>
        <td class="formula-cell">${renderFormula(formula.formula)}</td>
        <td>${escapeHtml(formula.note)}</td>
      </tr>
    `)
    .join("");
}

function renderPhysicsSectionLabel(section) {
  return `
    <strong>${escapeHtml(section.title)}</strong>
    <span>${escapeHtml(section.source)}</span>
  `;
}

function renderPhysicsGame() {
  const round = currentPhysicsRound();
  const question = round.direction === "name-to-formula"
    ? {
        title: "Какая формула подходит?",
        label: escapeHtml(round.entry.name),
        helper: "Выбери формулу для этого закона или величины.",
        kind: "text"
      }
    : {
        title: "Что означает эта формула?",
        label: renderFormula(round.entry.formula),
        helper: "Выбери название закона, величины или явления.",
        kind: "formula"
      };

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderPhysicsProgress()}
        <div class="screen-head">
          <div>
            <p class="stage-badge">Раунд ${state.physicsSession.index + 1} из ${state.physicsSession.rounds.length}</p>
            <h1 class="screen-title">${question.title}</h1>
            <p class="mini-meta">${question.helper}</p>
          </div>
          <div class="mistake-counter">Ошибок: ${state.physicsSession.mistakes}</div>
        </div>

        <div class="question-card ${question.kind === "formula" ? "formula-question" : ""}">
          ${question.label}
        </div>

        <div class="choice-grid physics-options">
          ${round.choices.map((choice) => renderPhysicsChoice(choice, round)).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPhysicsChoice(choice, round) {
  const isCorrect = round.solvedId === choice.id;
  const isWrong = round.wrongIds.has(choice.id);
  const label = round.direction === "name-to-formula"
    ? `<span class="formula-choice">${renderFormula(choice.formula)}</span>`
    : escapeHtml(choice.name);
  const stateClass = isCorrect ? "correct" : isWrong ? "wrong" : "";

  return `
    <button class="option-button ${stateClass}" data-action="physics-answer" data-value="${escapeHtml(choice.id)}" ${state.locked ? "disabled" : ""}>
      ${label}
    </button>
  `;
}

function renderPhysicsFinish() {
  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        <div>
          <p class="kicker">Физика ЕГЭ</p>
          <h1 class="finish-score">Раунд завершён</h1>
          <p class="finish-subtitle">Ты прошёл ${state.physicsSession.rounds.length} заданий на соответствие формул. Ошибок: ${state.physicsSession.mistakes}.</p>
        </div>

        <div class="summary-grid">
          ${state.physicsSession.rounds.map((round, index) => `
            <div class="summary-item">
              <strong>${index + 1}. ${escapeHtml(round.entry.name)}</strong>
              <span class="summary-formula">${renderFormula(round.entry.formula)}</span>
              <small>${escapeHtml(round.entry.sectionTitle)}</small>
            </div>
          `).join("")}
        </div>

        <div class="action-row">
          <button class="action-button primary" data-action="physics-play-again">Играть ещё раз</button>
          <button class="action-button secondary" data-action="physics-show-table">Посмотреть таблицу</button>
        </div>
      </div>
    </section>
  `;
}

function renderPhysicsProblemSections() {
  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Физика · 1000 задач</p>
            <h1 class="main-title">Выбери раздел</h1>
            <p class="screen-text">Выбирай раздел, тип задач и номер. Условие откроется прямо на сайте.</p>
          </div>
          <a class="action-button secondary textbook-link" href="textbooks/physics-1000-tasks.pdf" target="_blank" rel="noopener">Открыть задачник</a>
        </div>

        <div class="problem-section-grid">
          ${(physicsProblemBank.sections || [])
            .map((section) => `
              <button class="problem-card" data-action="physics-problem-section" data-value="${escapeHtml(section.id)}">
                <span>${escapeHtml(section.title)}</span>
                <small>${countPhysicsSectionTasks(section)} задач</small>
              </button>
            `)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPhysicsProblemTopics() {
  const section = currentPhysicsProblemSection();
  const group = currentPhysicsProblemGroup();

  if (!section) {
    renderPhysicsProblemSections();
    return;
  }

  const items = group ? group.topics : section.groups;
  const title = group ? group.title : section.title;
  const action = group ? "physics-problem-topic" : "physics-problem-group";
  const backButton = group
    ? `<button class="action-button secondary" data-action="physics-problem-section" data-value="${escapeHtml(section.id)}">К типам задач</button>`
    : `<button class="action-button secondary" data-action="physics-open-problems">К разделам</button>`;

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Физика · 1000 задач</p>
            <h1 class="main-title">${escapeHtml(title)}</h1>
            <p class="screen-text">${group ? "Выбери тему задач." : "Выбери тип задач."}</p>
          </div>
        </div>

        <div class="problem-section-grid">
          ${items
            .map((item) => `
              <button class="problem-card ${item.type === "extended" ? "extended" : ""}" data-action="${action}" data-value="${escapeHtml(item.id)}">
                <span>${escapeHtml(item.title)}</span>
                <small>${countPhysicsItemTasks(item)} задач</small>
              </button>
            `)
            .join("")}
        </div>

        <div class="action-row">
          ${backButton}
        </div>
      </div>
    </section>
  `;
}

function renderPhysicsProblemPractice() {
  const topic = currentPhysicsProblemTopic();
  const task = currentPhysicsProblemTask();

  if (!topic) {
    renderPhysicsProblemSections();
    return;
  }

  dom.app.innerHTML = `
    <section class="game-panel problem-view-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">${escapeHtml(topic.sectionTitle)} · ${escapeHtml(topic.groupTitle)}</p>
            <h1 class="screen-title">${escapeHtml(topic.title)}</h1>
          </div>
          <div class="mistake-counter">Краткий ответ</div>
        </div>

        <div class="problem-number-grid">
          ${topic.tasks.map((item) => `
            <button class="problem-number ${task?.id === item.id ? "active" : ""} ${isTaskSolved("physics", item.id) ? "solved" : ""}" data-action="physics-problem-task" data-value="${escapeHtml(item.id)}">
              ${item.number}
            </button>
          `).join("")}
        </div>

        ${task ? renderPhysicsProblemTaskCard(task) : ""}

        <div class="action-row">
          <button class="action-button secondary" data-action="physics-problem-back-sections">К разделам</button>
        </div>
      </div>
    </section>
  `;
}

function renderPhysicsProblemTaskCard(task) {
  return `
    <article class="problem-task-card">
      <div class="problem-task-head">
        <span class="stage-badge">Задача ${task.number}</span>
        <span class="mini-meta">страница ${task.page}</span>
      </div>
      <div class="problem-task-text">${renderProblemText(task.text)}</div>
      ${task.image ? `<img class="problem-figure" src="${escapeHtml(task.image)}" alt="Рисунок к задаче ${task.number}" loading="lazy">` : ""}
      ${task.hasFigure ? `<p class="figure-note">Если рисунок на странице относится к другой задаче, ориентируйся на номер выбранной задачи.</p>` : ""}
      ${renderPhysicsProblemAnswerBox(task)}
    </article>
  `;
}

function renderPhysicsProblemAnswerBox(task) {
  const feedback = state.physicsProblemSession.feedback;

  return `
    <div class="problem-answer-panel">
      <label class="problem-answer-label" for="physics-problem-answer">Твой краткий ответ</label>
      <div class="problem-answer-row">
        <input
          id="physics-problem-answer"
          class="problem-answer-input"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Например: 42"
          value="${escapeHtml(state.physicsProblemSession.userAnswer || "")}"
          data-action="physics-problem-answer"
        >
        <button class="action-button primary" data-action="physics-problem-check">Проверить</button>
      </div>
      ${feedback ? `<p class="feedback-note">${escapeHtml(feedback)}</p>` : ""}
    </div>
  `;
}

function renderMathIntro() {
  dom.app.innerHTML = `
    <section class="hero-panel russian-start">
      <div>
        <p class="kicker">Математика ЕГЭ</p>
        <h1 class="main-title">Первая часть</h1>
      </div>
      <div class="start-actions">
        <button class="action-button primary" data-action="math-open-game">Решать задания</button>
        ${renderTextbookLinks("math")}
      </div>
    </section>
  `;
}

function renderMathTopics() {
  const total = mathTasks.length;

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Математика ЕГЭ · первая часть</p>
            <h1 class="main-title">Выбери номер задания</h1>
            <p class="screen-text">${formatTaskCount(total)} из разделов банка ФИПИ.</p>
          </div>
        </div>

        <div class="problem-section-grid math-topic-grid">
          ${mathNumbers
            .map((item) => `
              <button class="problem-card" data-action="math-task-number" data-value="${item.number}" ${item.count ? "" : "disabled"}>
                <span>${escapeHtml(item.title)}</span>
                <small>${formatTaskCount(item.count)}</small>
              </button>
            `)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMathPractice() {
  const task = currentMathTask();
  const session = state.mathSession;
  const tasks = mathTasksByNumber.get(session?.number) || [];

  if (!task || !session) {
    renderMathTopics();
    return;
  }

  dom.app.innerHTML = `
    <section class="game-panel problem-view-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Математика ЕГЭ · задание ${task.number}</p>
            <h1 class="screen-title">${escapeHtml(task.title)}</h1>
          </div>
          <div class="mistake-counter">Ошибок: ${session.mistakes}</div>
        </div>

        <div class="problem-number-grid math-number-grid">
          ${tasks.map((item, index) => `
            <button class="problem-number ${task.id === item.id ? "active" : ""} ${isTaskSolved("math", item.id) ? "solved" : ""}" data-action="math-task-select" data-value="${escapeHtml(item.id)}">
              ${index + 1}
            </button>
          `).join("")}
        </div>

        <article class="problem-task-card math-task-card">
          <div class="problem-task-head">
            <span class="stage-badge">Задача ${getMathTaskDisplayNumber(task)}</span>
            <span class="mini-meta">${escapeHtml(task.source || "Банк ФИПИ")}</span>
          </div>
          <div class="problem-task-text math-task-text">${task.html}</div>
          ${renderMathAnswerBox(task)}
        </article>

        <div class="action-row">
          <button class="action-button secondary" data-action="math-back-topics">К номерам</button>
          <button class="action-button secondary" data-action="math-next-task">Другая задача</button>
        </div>
      </div>
    </section>
  `;
}

function renderMathAnswerBox(task) {
  const feedback = state.mathSession.feedback;
  const feedbackClass = feedback?.type === "danger" ? "danger" : feedback?.type === "success" ? "success" : "";

  return `
    <div class="problem-answer-panel">
      <label class="problem-answer-label" for="math-answer">Твой ответ</label>
      <div class="problem-answer-row">
        <input
          id="math-answer"
          class="problem-answer-input"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Например: 42"
          value="${escapeHtml(state.mathSession.userAnswer || "")}"
          data-action="math-answer"
        >
        <button class="action-button primary" data-action="math-check-answer">Проверить</button>
      </div>
      ${feedback ? `<p class="feedback-note ${feedbackClass}">${escapeHtml(feedback.text)}</p>` : ""}
    </div>
  `;
}

function renderProblemText(text) {
  return escapeHtml(text)
    .split(/\n+/)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function countPhysicsSectionTasks(section) {
  return section.groups.reduce((sum, group) => sum + countPhysicsItemTasks(group), 0);
}

function countPhysicsItemTasks(item) {
  if (item.tasks) {
    return item.tasks.length;
  }

  return item.topics.reduce((sum, topic) => sum + topic.tasks.length, 0);
}

function formatTaskCount(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  const word = lastTwo >= 11 && lastTwo <= 14
    ? "заданий"
    : last === 1
      ? "задание"
      : last >= 2 && last <= 4
        ? "задания"
        : "заданий";

  return `${count} ${word}`;
}

function renderPhysicsProgress() {
  const total = state.physicsSession.rounds.length;
  const current = state.physicsSession.index + 1;
  const percent = Math.round((state.physicsSession.index / total) * 100);

  return `
    <div class="progress-shell" aria-label="Прогресс игры">
      <div class="progress-label">
        <span>${current} / ${total}</span>
        <span>${percent}%</span>
      </div>
      <div class="progress-bar">
        <span style="width: ${percent}%"></span>
      </div>
    </div>
  `;
}

function renderPlaceholder() {
  const subject = subjects.find((item) => item.id === state.subjectId);
  const hasTextbooks = (textbooksBySubject[state.subjectId] || []).length > 0;

  dom.app.innerHTML = `
    <section class="placeholder-panel">
      <p class="kicker">${escapeHtml(subject?.title || "Предмет")}</p>
      <h1 class="main-title">${hasTextbooks ? "Учебники" : "Раздел скоро появится"}</h1>
      <p class="lead">${
        hasTextbooks
          ? "Пока здесь можно открыть учебник прямо с сайта. Тренажёры и таблицы добавим позже."
          : "Сейчас готов раздел русского языка и физики."
      }</p>
      ${hasTextbooks ? `<div class="textbook-actions">${renderTextbookLinks(state.subjectId)}</div>` : ""}
    </section>
  `;
}

function renderTextbookLinks(subjectId) {
  const textbooks = textbooksBySubject[subjectId] || [];

  return textbooks
    .map(
      (book) => `
        <a class="action-button secondary textbook-link" href="${escapeHtml(book.href)}" target="_blank" rel="noopener">
          ${escapeHtml(book.title)}
        </a>
      `
    )
    .join("");
}

function renderExceptionsTable() {
  dom.app.innerHTML = `
    <section class="table-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Русский язык</p>
            <h1 class="main-title">Все исключения</h1>
          </div>
          <button class="close-button" type="button" data-action="close-exceptions" aria-label="Закрыть таблицу">×</button>
        </div>
        <div class="exceptions-table-wrap">
          <table class="exceptions-table">
            <thead>
              <tr>
                <th>Задание</th>
                <th>Правило</th>
                <th>Исключения</th>
                <th>Ошибкоопасные слова</th>
              </tr>
            </thead>
            <tbody>
              ${rules.map(renderRuleRow).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderRuleRow(rule) {
  return `
    <tr>
      <td>${escapeHtml(rule.task)}</td>
      <td>${escapeHtml(rule.name)}</td>
      <td>${escapeHtml(rule.exceptions.length ? rule.exceptions.join(", ") : "нет")}</td>
      <td>${escapeHtml(rule.risky.length ? rule.risky.join(", ") : "нет")}</td>
    </tr>
  `;
}

function renderRussianGame() {
  switch (state.screen) {
    case "empty":
      renderEmpty();
      break;
    case "config":
      renderConfigurator();
      break;
    case "custom-practice":
      renderCustomPractice();
      break;
    case "custom-finish":
      renderCustomFinish();
      break;
    case "letter-pick":
      renderLetterPick();
      break;
    case "seed-check":
      renderSeedCheck();
      break;
    case "rule-pick":
      renderRulePick();
      break;
    case "exception-rounds":
      renderExceptionRounds();
      break;
    case "risky-pick":
      renderRiskyPick();
      break;
    case "finish":
      renderFinish();
      break;
    default:
      renderRussianIntro();
      break;
  }
}

function renderConfigurator() {
  const activeMode = customModeMap.get(state.config.mode) || customModes[0];
  const maxCount = getCustomModeMax(activeMode.id);
  const currentCount = clampCount(state.config.count, activeMode.id);
  state.config.count = currentCount;

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <p class="kicker">Русский язык</p>
            <h1 class="main-title">Настроить игру</h1>
            <p class="screen-text">Выбери тип заданий и количество. Игра даст их подряд в одном режиме.</p>
          </div>
        </div>

        <div class="config-grid">
          ${customModes
            .map((mode) => `
              <button
                class="config-mode ${mode.id === state.config.mode ? "active" : ""}"
                data-action="config-mode"
                data-value="${escapeHtml(mode.id)}"
              >
                <strong>${escapeHtml(mode.title)}</strong>
              </button>
            `)
            .join("")}
        </div>

        <div class="config-panel">
          <div>
            <p class="kicker-like">Выбрано</p>
            <h3>${escapeHtml(activeMode.title)}</h3>
          </div>
          <label class="range-label" for="config-count">
            <span>Количество заданий</span>
            <strong data-config-count-output>${currentCount}</strong>
          </label>
          <input
            id="config-count"
            class="range-input"
            type="range"
            min="${maxCount > 0 ? 1 : 0}"
            max="${maxCount}"
            step="1"
            value="${currentCount}"
            data-action="config-count"
          >
        </div>

        <div class="action-row">
          <button class="action-button primary" data-action="start-custom-practice" ${maxCount === 0 ? "disabled" : ""}>Начать тренировку</button>
          <button class="action-button secondary" data-action="russian-home">Назад</button>
        </div>
      </div>
    </section>
  `;
}

function renderCustomPractice() {
  switch (state.customSession.mode) {
    case "letter":
      renderCustomLetter();
      break;
    case "seed":
      renderCustomSeed();
      break;
    case "rule":
      renderCustomRule();
      break;
    case "exception":
      renderCustomException();
      break;
    case "risky":
      renderCustomRisky();
      break;
    default:
      renderConfigurator();
      break;
  }
}

function renderCustomHeader(title, subtitle = "") {
  return `
    ${renderCustomProgress()}
    <div class="screen-head">
      <div>
        <div class="stage-badge">${escapeHtml(customModeMap.get(state.customSession.mode)?.title || "Тренировка")}</div>
        <h2 class="screen-title">${escapeHtml(title)}</h2>
        ${subtitle ? `<p class="mini-meta">${escapeHtml(subtitle)}</p>` : ""}
      </div>
      <div class="mistake-counter">Ошибок: ${state.customSession.mistakes}</div>
    </div>
  `;
}

function renderCustomProgress() {
  const current = state.customSession.index + 1;
  const total = state.customSession.tasks.length;

  return `
    <div class="custom-progress">
      <span>Задание ${current} из ${total}</span>
      <span>${Math.round(((current - 1) / total) * 100)}%</span>
    </div>
  `;
}

function renderCustomLetter() {
  const task = currentCustomTask();
  const rule = ruleMap.get(task.ruleId);

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderCustomHeader("Вставь пропущенную букву", rule?.name || "")}

        <div class="word-display masked-word">${renderMaskedWord(task.masked)}</div>

        <div class="choice-grid letter-options">
          ${task.options
            .map((option) =>
              renderChoiceButton({
                action: "custom-answer",
                value: option,
                label: option,
                stateClass: getCustomChoiceState(task, option),
                compact: true,
                disabled: state.locked,
                extraClass: "letter-button"
              })
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderCustomSeed() {
  const task = currentCustomTask();

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderCustomHeader("Это исключение или не исключение?")}

        <div class="word-display">${escapeHtml(task.word)}</div>

        <div class="choice-grid two-up">
          ${renderChoiceButton({
            action: "custom-answer",
            value: "exception",
            label: "Исключение",
            stateClass: getCustomChoiceState(task, "exception"),
            disabled: state.locked
          })}
          ${renderChoiceButton({
            action: "custom-answer",
            value: "not-exception",
            label: "Не исключение",
            stateClass: getCustomChoiceState(task, "not-exception"),
            disabled: state.locked
          })}
        </div>
      </div>
    </section>
  `;
}

function renderCustomRule() {
  const task = currentCustomTask();
  const solvedId = task.solvedChoice;
  const wrongIds = task.wrongChoices;

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderCustomHeader("Выбери правило")}

        <div class="split-layout">
          <div class="prompt-panel">
            <span class="word-tag">Текущее слово</span>
            <div class="word-display">${escapeHtml(task.word)}</div>
          </div>

          <div class="rules-panel">
            <div class="rules-list">
              ${Object.entries(rulesByTask)
                .map(
                  ([taskName, taskRules]) => `
                    <div class="rules-group">
                      <h3 class="rules-group-title">${escapeHtml(taskName)}</h3>
                      ${taskRules
                        .map((rule) => {
                          const stateClass =
                            solvedId === rule.id ? "correct" : wrongIds.has(rule.id) ? "wrong" : "";

                          return `
                            <button
                              class="rule-button ${stateClass}"
                              data-action="custom-answer"
                              data-value="${escapeHtml(rule.id)}"
                              ${state.locked ? "disabled" : ""}
                            >
                              ${escapeHtml(rule.name)}
                            </button>
                          `;
                        })
                        .join("")}
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  const rulesList = dom.app.querySelector(".rules-list");
  if (rulesList) {
    rulesList.scrollTop = state.customSession.ruleListScrollTop || 0;
  }
}

function renderCustomException() {
  const task = currentCustomTask();

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderCustomHeader("Найди исключение", task.ruleName)}

        <div class="choice-grid word-options">
          ${task.options
            .map((word) =>
              renderChoiceButton({
                action: "custom-answer",
                value: word,
                label: word,
                stateClass: getCustomChoiceState(task, word),
                compact: true,
                disabled: state.locked
              })
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderCustomRisky() {
  const task = currentCustomTask();

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderCustomHeader(`Отметь ${task.targets.length} из ${task.options.length}`, `Найди ошибкоопасные слова к правилу «${task.ruleName}»`)}

        <div class="summary-panel">
          <div class="action-row">
            <span class="selection-counter">Выбрано: ${task.selected.size}</span>
          </div>
        </div>

        <div class="choice-grid word-options">
          ${task.options
            .map((word) =>
              renderChoiceButton({
                action: "toggle-custom-risky",
                value: word,
                label: word,
                stateClass: getCustomRiskyButtonState(task, word),
                compact: true,
                pressed: task.selected.has(word),
                disabled: state.locked
              })
            )
            .join("")}
        </div>

        <div class="action-row">
          <button class="action-button primary" data-action="check-custom-risky" ${state.locked ? "disabled" : ""}>
            Проверить
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderCustomFinish() {
  const mode = customModeMap.get(state.customSession.mode);

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        <div class="screen-head">
          <div>
            <div class="stage-badge">Тренировка завершена</div>
            <h2 class="finish-score">${escapeHtml(mode?.title || "Режим")}</h2>
            <p class="finish-subtitle">
              Выполнено заданий: ${state.customSession.tasks.length}. Ошибок: ${state.customSession.mistakes}.
            </p>
          </div>
        </div>

        <div class="action-row">
          <button class="action-button primary" data-action="custom-play-again">Повторить этот режим</button>
          <button class="action-button secondary" data-action="back-to-config">Настроить заново</button>
          <button class="action-button secondary" data-action="go-home">На главный экран</button>
        </div>
      </div>
    </section>
  `;
}

function renderLetterPick() {
  const task = state.session.spellingTask;
  const rule = ruleMap.get(task.ruleId);

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderProgress(0)}
        <div class="screen-head">
          <div>
            <div class="stage-badge">Шаг 1 из 5</div>
            <h2 class="screen-title">Вставь пропущенную букву</h2>
            <p class="mini-meta">${escapeHtml(rule?.name || "Орфограмма")}</p>
          </div>
          <div class="mistake-counter">Ошибок: ${state.mistakes}</div>
        </div>

        <div class="word-display masked-word">${renderMaskedWord(task.masked)}</div>

        <div class="choice-grid letter-options">
          ${state.session.spellingOptions
            .map((option) =>
              renderChoiceButton({
                action: "spelling-answer",
                value: option,
                label: option,
                stateClass: getSpellingChoiceState(option),
                compact: true,
                disabled: state.locked,
                extraClass: "letter-button"
              })
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderEmpty() {
  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="empty-state">Не удалось собрать игровой набор.</div>
    </section>
  `;
}

function renderSeedCheck() {
  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderProgress(1)}
        <div class="screen-head">
          <div>
            <div class="stage-badge">Шаг 2 из 5</div>
            <h2 class="screen-title">Это исключение или не исключение?</h2>
          </div>
          <div class="mistake-counter">Ошибок: ${state.mistakes}</div>
        </div>

        <div class="word-display">${escapeHtml(state.session.seedWord)}</div>

        <div class="choice-grid two-up">
          ${renderChoiceButton({
            action: "seed-answer",
            value: "exception",
            label: "Исключение",
            stateClass: getSeedChoiceState("exception"),
            disabled: state.locked
          })}
          ${renderChoiceButton({
            action: "seed-answer",
            value: "not-exception",
            label: "Не исключение",
            stateClass: getSeedChoiceState("not-exception"),
            disabled: state.locked
          })}
        </div>
      </div>
    </section>
  `;
}

function renderRulePick() {
  const wrongIds = state.session.wrongRuleIds;
  const solvedId = state.session.solvedRuleId;

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderProgress(2)}
        <div class="screen-head">
          <div>
            <div class="stage-badge">Шаг 3 из 5</div>
            <h2 class="screen-title">Выбери правило</h2>
          </div>
          <div class="mistake-counter">Ошибок: ${state.mistakes}</div>
        </div>

        <div class="split-layout">
          <div class="prompt-panel">
            <span class="word-tag">Текущее слово</span>
            <div class="word-display">${escapeHtml(state.session.seedWord)}</div>
          </div>

          <div class="rules-panel">
            <div class="rules-list">
              ${Object.entries(rulesByTask)
                .map(
                  ([task, taskRules]) => `
                    <div class="rules-group">
                      <h3 class="rules-group-title">${escapeHtml(task)}</h3>
                      ${taskRules
                        .map((rule) => {
                          const stateClass =
                            solvedId === rule.id ? "correct" : wrongIds.has(rule.id) ? "wrong" : "";

                          return `
                            <button
                              class="rule-button ${stateClass}"
                              data-action="rule-answer"
                              data-value="${escapeHtml(rule.id)}"
                              ${state.locked ? "disabled" : ""}
                            >
                              ${escapeHtml(rule.name)}
                            </button>
                          `;
                        })
                        .join("")}
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  const rulesList = dom.app.querySelector(".rules-list");
  if (rulesList) {
    rulesList.scrollTop = state.session.ruleListScrollTop || 0;
  }
}

function renderExceptionRounds() {
  const round = currentRound();
  const roundCount = state.session.rounds.length;
  const feedback = state.session.roundFeedback[state.session.roundIndex];

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderProgress(3)}
        <div class="screen-head">
          <div>
            <div class="stage-badge">Шаг 4 из 5</div>
            <h2 class="screen-title">Найди исключение</h2>
            <p class="mini-meta">Раунд ${state.session.roundIndex + 1} из ${roundCount} · ${escapeHtml(state.session.ruleName)}</p>
          </div>
          <div class="mistake-counter">Ошибок: ${state.mistakes}</div>
        </div>

        <div class="choice-grid word-options">
          ${round.options
            .map((word) =>
              renderChoiceButton({
                action: "exception-round-answer",
                value: word,
                label: word,
                stateClass:
                  feedback.solvedChoice === word ? "correct" : feedback.wrongChoices.has(word) ? "wrong" : "",
                compact: true,
                disabled: state.locked
              })
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderRiskyPick() {
  const { options, targets } = state.session.finalSelection;
  const selected = state.session.selectedRisky;
  const feedback = state.session.finalFeedback;

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderProgress(4)}
        <div class="screen-head">
          <div>
            <div class="stage-badge">Шаг 5 из 5</div>
            <h2 class="screen-title">Отметь ${targets.length} из ${options.length}</h2>
            <p class="mini-meta">Найди ошибкоопасные слова к правилу «${escapeHtml(state.session.ruleName)}»</p>
          </div>
          <div class="mistake-counter">Ошибок: ${state.mistakes}</div>
        </div>

        <div class="summary-panel">
          <div class="action-row">
            <span class="selection-counter">Выбрано: ${selected.size}</span>
          </div>
        </div>

        <div class="choice-grid word-options">
          ${options
            .map((word) =>
              renderChoiceButton({
                action: "toggle-risky",
                value: word,
                label: word,
                stateClass: getRiskyButtonState(word, selected, feedback),
                compact: true,
                pressed: selected.has(word),
                disabled: state.locked
              })
            )
            .join("")}
        </div>

        <div class="action-row">
          <button class="action-button primary" data-action="check-risky" ${state.locked ? "disabled" : ""}>
            Проверить
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderFinish() {
  const rule = currentRule();

  dom.app.innerHTML = `
    <section class="game-panel">
      <div class="screen">
        ${renderProgress(5)}
        <div class="screen-head">
          <div>
            <div class="stage-badge">Финиш</div>
            <h2 class="finish-score">Раунд завершён</h2>
            <p class="finish-subtitle">Ты прошёл весь маршрут: пропущенная буква, стартовое слово, правило, исключения и финальный выбор слов.</p>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <strong>Слово с буквой</strong>
            ${escapeHtml(state.session.spellingTask.word)}
          </div>
          <div class="summary-item">
            <strong>Стартовое слово</strong>
            ${escapeHtml(state.session.seedWord)}
          </div>
          <div class="summary-item">
            <strong>Тип слова</strong>
            ${state.session.seedKind === "exception" ? "Исключение" : "Ошибкоопасное слово"}
          </div>
          <div class="summary-item">
            <strong>Правило</strong>
            ${escapeHtml(rule.name)}
          </div>
          <div class="summary-item">
            <strong>Ошибок</strong>
            ${state.mistakes}
          </div>
        </div>

        <div class="action-row">
          <button class="action-button primary" data-action="play-again">Сыграть ещё раз</button>
        </div>
      </div>
    </section>
  `;
}

function renderProgress(stepIndex) {
  const labels = [
    "1. Вставь букву",
    "2. Исключение или нет",
    "3. Правило",
    "4. Найди исключение",
    "5. Опасные слова"
  ];

  return `
    <div class="progress-track">
      ${labels
        .map((label, index) => {
          const className = index < stepIndex ? "done" : index === stepIndex ? "current" : "";
          return `<div class="progress-step ${className}">${escapeHtml(label)}</div>`;
        })
        .join("")}
    </div>
  `;
}

function renderChoiceButton({
  action,
  value,
  label,
  stateClass = "",
  compact = false,
  pressed = false,
  disabled = false,
  extraClass = ""
}) {
  return `
    <button
      class="option-button ${compact ? "compact" : ""} ${extraClass} ${stateClass}"
      data-action="${escapeHtml(action)}"
      data-value="${escapeHtml(value)}"
      aria-pressed="${pressed ? "true" : "false"}"
      ${disabled ? "disabled" : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderMaskedWord(masked) {
  return String(masked)
    .split("_")
    .map(escapeHtml)
    .join('<span class="letter-gap" aria-label="пропущенная буква"></span>');
}

function getSpellingChoiceState(choice) {
  if (!state.session.spellingFeedback || state.session.spellingChoice !== choice) {
    return "";
  }

  return state.session.spellingFeedback.correct ? "correct" : "wrong";
}

function getCustomChoiceState(task, choice) {
  if (task.solvedChoice === choice) {
    return "correct";
  }

  if (task.wrongChoices?.has(choice)) {
    return "wrong";
  }

  return "";
}

function getCustomRiskyButtonState(task, word) {
  if (task.feedback) {
    if (task.feedback.wrongSelections.has(word)) {
      return "wrong";
    }

    if (task.feedback.missedTargets.has(word)) {
      return "missed";
    }
  }

  if (task.selected.has(word)) {
    return "selected";
  }

  return "";
}

function getSeedChoiceState(choice) {
  if (!state.session.seedFeedback || state.session.seedChoice !== choice) {
    return "";
  }

  return state.session.seedFeedback.correct ? "correct" : "wrong";
}

function getRiskyButtonState(word, selected, feedback) {
  if (feedback) {
    if (feedback.wrongSelections.has(word)) {
      return "wrong";
    }

    if (feedback.missedTargets.has(word)) {
      return "missed";
    }
  }

  if (selected.has(word)) {
    return "selected";
  }

  return "";
}

function updateBackButton() {
  dom.backButton.classList.toggle("visible", state.route !== "home");
}

function updateProfileButton() {
  if (!dom.profileButton) {
    return;
  }

  const activeUser = getActiveUser();
  const avatar = dom.profileButton.querySelector(".profile-avatar");
  const name = dom.profileButton.querySelector(".profile-name");

  if (activeUser) {
    const label = activeUser.username || "Профиль";
    avatar.textContent = label.slice(0, 1).toUpperCase();
    name.textContent = label;
    dom.profileButton.classList.add("is-active");
    return;
  }

  avatar.textContent = "Я";
  name.textContent = "Войти";
  dom.profileButton.classList.remove("is-active");
}

function applyStoredTheme() {
  const theme = localStorage.getItem("study-site-theme") || "light";
  document.body.classList.toggle("dark", theme === "dark");
  updateThemeButton();
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("study-site-theme", isDark ? "dark" : "light");
  updateThemeButton();
}

function updateThemeButton() {
  if (!dom.themeButton) {
    return;
  }

  dom.themeButton.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
    return;
  }

  document.exitFullscreen?.();
}

function renderFormula(value) {
  return `<span class="formula-html">${renderFormulaParts(String(value))}</span>`;
}

function renderFormulaParts(value) {
  const radioactivePower = "2⁻ᵗ/ᵀ";
  const radioactiveIndex = value.indexOf(radioactivePower);

  if (radioactiveIndex !== -1) {
    const before = value.slice(0, radioactiveIndex);
    const after = value.slice(radioactiveIndex + radioactivePower.length);

    return `${renderFormulaParts(before)}2<span class="power">−${renderFraction("t", "T")}</span>${renderFormulaParts(after)}`;
  }

  const slashIndex = value.indexOf("/");

  if (slashIndex === -1) {
    return escapeHtml(value);
  }

  const left = findLeftOperand(value, slashIndex);
  const right = findRightOperand(value, slashIndex);

  if (!left || !right) {
    return escapeHtml(value);
  }

  const before = value.slice(0, left.start);
  const numerator = value.slice(left.start, left.end).trim();
  const denominator = value.slice(right.start, right.end).trim();
  const after = value.slice(right.end);

  return `${renderFormulaParts(before)}${renderFraction(
    renderFormulaParts(numerator),
    renderFormulaParts(denominator)
  )}${renderFormulaParts(after)}`;
}

function renderFraction(numerator, denominator) {
  return `
    <span class="fraction">
      <span class="fraction-part fraction-top">${numerator}</span>
      <span class="fraction-part fraction-bottom">${denominator}</span>
    </span>
  `;
}

function findLeftOperand(value, slashIndex) {
  let end = slashIndex;

  while (end > 0 && value[end - 1] === " ") {
    end -= 1;
  }

  if (end <= 0) {
    return null;
  }

  if (value[end - 1] === ")") {
    const start = findMatchingOpenParen(value, end - 1);
    return start === -1 ? null : { start, end };
  }

  let start = end - 1;

  while (start >= 0 && !isFormulaBoundary(value[start])) {
    start -= 1;
  }

  return { start: start + 1, end };
}

function findRightOperand(value, slashIndex) {
  let start = slashIndex + 1;

  while (start < value.length && value[start] === " ") {
    start += 1;
  }

  if (start >= value.length) {
    return null;
  }

  if (value[start] === "(") {
    const end = findMatchingCloseParen(value, start);
    return end === -1 ? null : { start, end: end + 1 };
  }

  if (value[start] === "√" && value[start + 1] === "(") {
    const end = findMatchingCloseParen(value, start + 1);
    return end === -1 ? null : { start, end: end + 1 };
  }

  let end = start;

  while (end < value.length && !isFormulaBoundary(value[end])) {
    end += 1;
  }

  return { start, end };
}

function isFormulaBoundary(char) {
  return char === " " || char === "=" || char === "+" || char === "−" || char === "-" || char === "·" || char === "," || char === "(" || char === ")";
}

function findMatchingOpenParen(value, closeIndex) {
  let depth = 0;

  for (let index = closeIndex; index >= 0; index -= 1) {
    if (value[index] === ")") {
      depth += 1;
    }

    if (value[index] === "(") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function findMatchingCloseParen(value, openIndex) {
  let depth = 0;

  for (let index = openIndex; index < value.length; index += 1) {
    if (value[index] === "(") {
      depth += 1;
    }

    if (value[index] === ")") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function autoSolveGame() {
  runAutoSolveStep();
}

function autoSolvePhysicsGame() {
  runAutoSolvePhysicsStep();
}

function runAutoSolvePhysicsStep() {
  if (state.locked) {
    window.setTimeout(runAutoSolvePhysicsStep, 180);
    return;
  }

  if (state.route !== "physics-game") {
    return;
  }

  handlePhysicsAnswer(currentPhysicsRound().entry.id);
  window.setTimeout(runAutoSolvePhysicsStep, 180);
}

function runAutoSolveStep() {
  if (state.locked) {
    window.setTimeout(runAutoSolveStep, 180);
    return;
  }

  switch (state.screen) {
    case "letter-pick":
      handleSpellingAnswer(state.session.spellingTask.answer);
      window.setTimeout(runAutoSolveStep, 180);
      break;
    case "seed-check":
      handleSeedAnswer(expectedSeedAnswer());
      window.setTimeout(runAutoSolveStep, 180);
      break;
    case "rule-pick":
      handleRuleAnswer(state.session.ruleId);
      window.setTimeout(runAutoSolveStep, 180);
      break;
    case "exception-rounds":
      handleExceptionRoundAnswer(currentRound().target);
      window.setTimeout(runAutoSolveStep, 180);
      break;
    case "risky-pick":
      state.session.selectedRisky = new Set(state.session.finalSelection.targets);
      render();
      checkRiskySelection();
      window.setTimeout(runAutoSolveStep, 180);
      break;
    case "custom-practice":
      autoSolveCustomStep();
      window.setTimeout(runAutoSolveStep, 180);
      break;
    default:
      break;
  }
}

function autoSolveCustomStep() {
  const task = currentCustomTask();

  if (state.customSession.mode === "risky") {
    task.selected = new Set(task.targets);
    render();
    checkCustomRiskySelection();
    return;
  }

  handleCustomAnswer(task.answer);
}

function lockAndAdvance(callback, delay = 850) {
  clearPendingTimer();
  state.locked = true;
  render();

  state.timer = window.setTimeout(() => {
    state.locked = false;
    callback();
    render();
  }, delay);
}

function clearPendingTimer() {
  if (state.timer) {
    window.clearTimeout(state.timer);
    state.timer = null;
  }
}

function uniqueWords(words) {
  const seen = new Set();

  return words
    .map((word) => String(word || "").trim())
    .filter((word) => word.length > 0)
    .filter((word) => {
      const normalized = word.toLowerCase();

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function shuffleWords(words) {
  const copy = [...words];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function pickMany(words, count) {
  return shuffleWords(words).slice(0, count);
}

function getCustomModeMax(mode) {
  if (mode === "letter") {
    return spellingDeck.length;
  }

  if (mode === "seed" || mode === "rule") {
    return exceptionDeck.length + riskyDeck.length;
  }

  if (mode === "exception") {
    return exceptionDeck.length;
  }

  if (mode === "risky") {
    return playableRules.length;
  }

  return 0;
}

function clampCount(value, mode = state.config.mode) {
  const maxCount = getCustomModeMax(mode);

  if (maxCount <= 0) {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return Math.min(10, maxCount);
  }

  return Math.min(maxCount, Math.max(1, Math.round(number)));
}

function sample(words) {
  return words[Math.floor(Math.random() * words.length)];
}

function groupByTask(list) {
  return list.reduce((accumulator, rule) => {
    if (!accumulator[rule.task]) {
      accumulator[rule.task] = [];
    }

    accumulator[rule.task].push(rule);
    return accumulator;
  }, {});
}

function normalizeWord(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

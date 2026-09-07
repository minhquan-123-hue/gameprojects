const assert = require('node:assert/strict');
const test = require('node:test');

const { parseQuizContent } = require('../src/data/quizContentLoader.js');
const { QuestionSelector } = require('../src/data/questionSelector.js');
const { Endgame, RESULT_TITLES } = require('../src/js/endgame.js');

function contentFor(questionBlock) {
    return `images/\ncharacters/\n- test.png:\nimage: ../assets/images/test.png\ncharacter: test\n${questionBlock}`;
}

function validQuestion(answer = 'right answer') {
    return [
        '1. question: Which answer is correct?',
        'a. wrong one b. right answer c. another one d. last one',
        `answer: ${answer}`
    ].join('\n');
}

test('content: accepts a valid question', () => {
    const result = parseQuizContent(contentFor(validQuestion()));

    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].category, 'characters');
    assert.equal(result.entries[0].questions.length, 1);
    assert.equal(result.entries[0].questions[0].correctIndex, 1);
    assert.equal(result.validationErrors.length, 0);
});

test('content: skips a question with malformed answers', () => {
    const result = parseQuizContent(contentFor([
        '1. question: Missing option?',
        'a. only option',
        'answer: only option'
    ].join('\n')));

    assert.equal(result.entries.length, 0);
    assert.equal(result.validationErrors.length, 2);
    assert.match(result.validationErrors[0], /thiếu đủ 4 đáp án/);
    assert.match(result.validationErrors[1], /không có question hợp lệ/);
});

test('content: skips a question with an unknown answer', () => {
    const result = parseQuizContent(contentFor(validQuestion('not an option')));

    assert.equal(result.entries.length, 0);
    assert.equal(result.validationErrors.length, 2);
    assert.match(result.validationErrors[0], /Không xác định được đáp án đúng/);
    assert.match(result.validationErrors[1], /không có question hợp lệ/);
});

test('content: skips a character with no valid question', () => {
    const result = parseQuizContent(
        'images/\ncharacters/\n- empty.png:\nimage: ../assets/images/empty.png\ncharacter: empty\n'
    );

    assert.equal(result.entries.length, 0);
    assert.equal(result.validationErrors.length, 1);
    assert.match(result.validationErrors[0], /không có question hợp lệ/);
});

function entry(category, character, questionCount = 2) {
    return {
        category,
        character,
        image: `${character}.png`,
        questions: Array.from({ length: questionCount }, (_, index) => ({
            question: `${character}-${index}`,
            answers: ['a', 'b', 'c', 'd'],
            correctIndex: 0
        }))
    };
}

test('selector: follows category quota and avoids duplicate characters per round', () => {
    const selector = new QuestionSelector([
        entry('characters', 'one'),
        entry('characters', 'two'),
        entry('characters', 'three'),
        entry('characters', 'four'),
        entry('illness', 'one'),
        entry('illness', 'five')
    ], { characters: 3, illness: 1 }, () => 0);

    const round = selector.createRound();
    assert.equal(round.length, 4);
    assert.equal(new Set(round.map(question => question.character)).size, 4);
});

test('selector: replenishes an exhausted category pool', () => {
    const selector = new QuestionSelector([
        entry('illness', 'hiv', 1),
        entry('illness', 'syphilis', 1)
    ], { illness: 1 }, () => 0);

    const firstRound = selector.createRound();
    const secondRound = selector.createRound();
    const thirdRound = selector.createRound();

    assert.equal(firstRound[0].character, 'hiv');
    assert.equal(secondRound[0].character, 'syphilis');
    assert.equal(thirdRound[0].character, 'hiv');
});

test('scoring: correct answers add one and wrong answers add nothing', () => {
    global.GAME_CONFIG = { questionsPerCategory: {} };
    global.QuestionSelector = class {};
    global.Endgame = Endgame;
    global.RESULT_TITLES = RESULT_TITLES;
    global.audioManager = { playCorrect() {}, playWrong() {} };
    const { Quiz } = require('../src/js/quiz.js');
    const ui = {
        bindQuizInteractions() {},
        renderAnswer() {},
        renderScore() {}
    };
    const quiz = new Quiz([], RESULT_TITLES, ui);
    quiz.selectedQuestions = [
        { question: 'first', answers: ['a', 'b', 'c', 'd'], correctIndex: 1 },
        { question: 'second', answers: ['a', 'b', 'c', 'd'], correctIndex: 2 },
        { question: 'third', answers: ['a', 'b', 'c', 'd'], correctIndex: 0 }
    ];

    quiz.handleAnswer(1);
    assert.equal(quiz.score, 1);

    quiz.currentQuestion = 1;
    quiz.answered = false;
    quiz.handleAnswer(0);
    assert.equal(quiz.score, 1);
});

test('gameplay: completes a seven-question round after the final answer', () => {
    global.GAME_CONFIG = { questionsPerCategory: { round: 7 } };
    global.QuestionSelector = class {
        createRound() {
            return Array.from({ length: 7 }, (_, index) => ({
                question: `question-${index}`,
                answers: ['a', 'b', 'c', 'd'],
                correctIndex: 0,
                image: `image-${index}.png`,
                character: `character-${index}`
            }));
        }
    };
    global.audioManager = {
        playCorrect() {},
        playWrong() {},
        playNextQuestion() {},
        playFinalRound() {}
    };
    const { Quiz } = require('../src/js/quiz.js');
    const ui = {
        bindQuizInteractions() {},
        renderQuestion() {},
        renderAnswer() {},
        renderScore() {}
    };
    let ended = false;
    global.game = { endGame: () => { ended = true; } };
    global.endgame = { showResults() {} };
    const quiz = new Quiz([], RESULT_TITLES, ui);

    quiz.startGame();
    assert.equal(quiz.totalQuestions, 7);

    for (let index = 0; index < 7; index++) {
        quiz.handleAnswer(0);
        if (index < 6) quiz.nextQuestion();
    }

    assert.equal(quiz.score, 7);
    assert.equal(ended, true);
});

test('result scoring: scores 0-2 share the first result and 5-7 use the highest result', () => {
    const endgame = new Endgame(RESULT_TITLES, {});

    assert.equal(endgame.getResultData(0), RESULT_TITLES[0]);
    assert.equal(endgame.getResultData(1), RESULT_TITLES[0]);
    assert.equal(endgame.getResultData(2), RESULT_TITLES[0]);
    assert.equal(endgame.getResultData(3), RESULT_TITLES[3]);
    assert.equal(endgame.getResultData(4), RESULT_TITLES[4]);
    assert.equal(endgame.getResultData(5), RESULT_TITLES[5]);
    assert.equal(endgame.getResultData(6), RESULT_TITLES[5]);
    assert.equal(endgame.getResultData(7), RESULT_TITLES[5]);
});

class FakeElement {
    constructor() {
        this.listeners = {};
        this.classList = {
            values: new Set(),
            add: (...classes) => classes.forEach(className => this.classList.values.add(className)),
            remove: (...classes) => classes.forEach(className => this.classList.values.delete(className)),
            toggle: (className, force) => {
                if (force === undefined ? !this.classList.values.has(className) : force) {
                    this.classList.values.add(className);
                } else {
                    this.classList.values.delete(className);
                }
            },
            has: className => this.classList.values.has(className)
        };
        this.style = {};
    }

    addEventListener(event, handler) {
        this.listeners[event] = handler;
    }

    click() {
        this.listeners.click?.();
    }
}

function createFakeDocument() {
    const ids = [
        'menuScreen', 'introductionScreen', 'quizScreen', 'resultScreen',
        'btnStart', 'btnIntroduction', 'btnIntroductionClose', 'btnReplay',
        'characterImage', 'questionText', 'btnNext',
        'dickScore', 'pussyScore', 'masterScore',
        'resultTitle', 'resultMessage', 'resultScore',
        'resultDickScore', 'resultPussyScore', 'resultMasterScore'
    ];
    const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
    const answerBoxes = Array.from({ length: 4 }, () => new FakeElement());
    const selectors = {
        '.answer-box': answerBoxes,
        '.progress-text': [new FakeElement()],
        '.progress-fill': [new FakeElement()]
    };

    return {
        elements,
        addEventListener() {},
        getElementById: id => elements[id],
        querySelector: selector => selectors[selector]?.[0],
        querySelectorAll: selector => selectors[selector] || []
    };
}

test('navigation: supports Menu, Introduction, Quiz, Result and back to Menu', () => {
    global.document = createFakeDocument();
    const { GameUI } = require('../src/js/gameUI.js');
    const ui = new GameUI();
    const transitions = [];

    ui.bindNavigation({
        onStart: () => transitions.push('quiz'),
        onIntroduction: () => transitions.push('introduction'),
        onIntroductionClose: () => transitions.push('menu'),
        onReplay: () => transitions.push('menu')
    });

    document.getElementById('btnIntroduction').click();
    document.getElementById('btnStart').click();
    document.getElementById('btnReplay').click();
    document.getElementById('btnIntroductionClose').click();

    assert.deepEqual(transitions, ['introduction', 'quiz', 'menu', 'menu']);

    ui.showScreen('quiz');
    assert.equal(document.getElementById('quizScreen').classList.has('active'), true);
    assert.equal(document.getElementById('menuScreen').classList.has('active'), false);
    assert.equal(document.getElementById('introductionScreen').classList.has('active'), false);
    assert.equal(document.getElementById('resultScreen').classList.has('active'), false);
});

test('navigation: Game accepts only known screens', () => {
    global.document = createFakeDocument();
    const { Game } = require('../src/js/main.js');
    const rendered = [];
    const game = Object.create(Game.prototype);
    game.currentScreen = 'menu';
    game.renderScreen = () => rendered.push(game.currentScreen);

    game.switchScreen('introduction');
    game.switchScreen('quiz');
    game.switchScreen('result');
    game.switchScreen('menu');
    game.switchScreen('unknown');

    assert.deepEqual(rendered, ['introduction', 'quiz', 'result', 'menu']);
    assert.equal(game.currentScreen, 'menu');
});
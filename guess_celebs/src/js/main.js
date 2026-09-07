/**
 * main.js
 * File chính điều phối toàn bộ game
 *
 * Cấu trúc:
 * - Quản lý trạng thái game (menu, introduction, quiz, result)
 * - Điều hướng giữa các màn hình
 * - Khởi tạo quiz khi cần
 */

const SCREEN_NAMES = ['menu', 'introduction', 'quiz', 'result'];

class Game {
    constructor() {
        this.currentScreen = 'menu';
        this.gameState = {};
        this.ui = new GameUI();
        this.init();
    }

    init() {
        console.log('Game đã khởi tạo');
        if (audioManager === null) audioManager = new AudioManager();
        this.setupNavigation();
        this.renderScreen();
    }

    setupNavigation() {
        this.ui.bindNavigation({
            onStart: () => this.switchScreen('quiz'),
            onIntroduction: () => this.switchScreen('introduction'),
            onIntroductionClose: () => this.switchScreen('menu'),
            onReplay: () => this.replayGame()
        });
    }

    switchScreen(screenName) {
        if (!SCREEN_NAMES.includes(screenName)) {
            console.error(`Màn hình không hợp lệ: '${screenName}'`);
            return;
        }

        console.log(`Chuyển từ '${this.currentScreen}' sang '${screenName}'`);
        this.currentScreen = screenName;
        this.renderScreen();
    }

    renderScreen() {
        this.ui.showScreen(this.currentScreen);

        document.body.classList.remove(...SCREEN_NAMES.map(name => `screen-${name}`));
        document.body.classList.add(`screen-${this.currentScreen}`);

        if (this.currentScreen === 'quiz') {
            try {
                if (quiz === null) quiz = new Quiz(QUIZ_DATA, RESULT_TITLES, this.ui);
                quiz.startGame();
            } catch (error) {
                console.error('Không thể khởi tạo round quiz.', error);
                this.currentScreen = 'menu';
                this.ui.showScreen('menu');
                document.body.classList.remove('screen-quiz');
                document.body.classList.add('screen-menu');
            }
        }
    }

    replayGame() {
        if (quiz) quiz.resetState();
        if (endgame) endgame.reset();
        this.switchScreen('menu');
    }

    startGame() { this.switchScreen('quiz'); }
    endGame() { this.switchScreen('result'); }
}

let game;
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadQuizDataFromContent();
        console.log('Quiz content loaded successfully.');
        game = new Game();
    } catch (error) {
        console.error('Quiz content failed to load. Game startup aborted.', error);
    }
});

if (typeof module !== 'undefined') {
    module.exports = { Game, SCREEN_NAMES };
}

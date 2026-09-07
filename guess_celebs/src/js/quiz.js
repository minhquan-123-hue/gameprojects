/**
 * quiz.js
 * Xử lý logic quiz game
 *
 * Chức năng:
 * - Tạo round theo quota từng category
 * - Quản lý flow quiz (hiển thị câu hỏi, xử lý câu trả lời)
 * - Tính điểm
 * - Hiển thị kết quả
 */

class Quiz {
    constructor(quizData, resultTitles, ui) {
        this.quizData = quizData;
        this.resultTitles = resultTitles;
        this.ui = ui;
        this.selectedQuestions = [];
        this.questionSelector = new QuestionSelector(
            quizData,
            GAME_CONFIG.questionsPerCategory
        );
        this.totalQuestions = this.getRoundQuestionCount();
        this.currentQuestion = 0;
        this.score = 0;
        this.answered = false;
        this.init();
    }

    /**
     * Khởi tạo quiz (chỉ setup, không load câu hỏi)
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Thiết lập event listeners
     */
    setupEventListeners() {
        this.ui.bindQuizInteractions({
            onAnswer: index => this.handleAnswer(index),
            onNext: () => this.nextQuestion()
        });
    }

    /**
     * Tạo một lượt chơi mới theo quota từng category.
     */
    createRound() {
        const selectedQuestions = this.questionSelector.createRound();
        const expectedQuestionCount = this.getRoundQuestionCount();

        if (selectedQuestions.length !== expectedQuestionCount) {
            throw new Error(
                `Round không hợp lệ: cần ${expectedQuestionCount} câu nhưng nhận được ${selectedQuestions.length}.`
            );
        }

        this.selectedQuestions = selectedQuestions;
        this.totalQuestions = this.selectedQuestions.length;
    }

    /**
     * Tải câu hỏi hiện tại
     */
    loadQuestion(index) {
        if (index >= this.selectedQuestions.length) {
            this.endQuiz();
            return;
        }

        const question = this.selectedQuestions[index];
        this.currentQuestion = index;
        this.answered = false;

        this.ui.renderQuestion(question, question, this.currentQuestion, this.totalQuestions);
    }

    /**
     * Xử lý câu trả lời
     */
    handleAnswer(selectedIndex) {
        if (this.answered) return;

        this.answered = true;
        const question = this.selectedQuestions[this.currentQuestion];

        // Kiểm tra đáp án
        if (selectedIndex === question.correctIndex) {
            this.score++;
            // Play correct sound
            if (typeof audioManager !== 'undefined' && audioManager) {
                audioManager.playCorrect();
            }
        } else {
            // Play wrong sound
            if (typeof audioManager !== 'undefined' && audioManager) {
                audioManager.playWrong();
            }
        }

        this.ui.renderAnswer(selectedIndex, question.correctIndex);
        this.ui.renderScore(this.score);

        if (this.currentQuestion === this.selectedQuestions.length - 1) {
            this.endQuiz();
        }
    }

    /**
     * Chuyển sang câu hỏi tiếp theo
     */
    nextQuestion() {
        if (this.currentQuestion >= this.selectedQuestions.length - 1) {
            this.endQuiz();
            return;
        }

        this.loadQuestion(this.currentQuestion + 1);
    }

    /**
     * Kết thúc quiz - gọi endgame để hiển thị kết quả
     * Trách nhiệm: Chuyển điểm cho endgame, endgame sẽ xử lý hiển thị
     */
    endQuiz() {
        if (typeof endgame === 'undefined' || endgame === null) {
            endgame = new Endgame(RESULT_TITLES, this.ui);
        }
        endgame.showResults(this.score, this.totalQuestions);
        if (typeof game !== 'undefined' && game) {
            game.endGame();
        }
    }

    /**
     * Reset state để chơi lại từ đầu
     * Hàm này chỉ reset dữ liệu, KHÔNG load câu hỏi
     * Loading câu hỏi đầu sẽ xảy ra khi startGame() được gọi
     */
    resetState() {
        this.selectedQuestions = [];
        this.questionSelector = new QuestionSelector(
            this.quizData,
            GAME_CONFIG.questionsPerCategory
        );
        this.totalQuestions = this.getRoundQuestionCount();
        this.currentQuestion = 0;
        this.score = 0;
        this.answered = false;
        this.ui.renderScore(this.score);
        console.log('Quiz state đã được reset');
    }

    /**
     * Bắt đầu game (load câu hỏi đầu tiên)
     * Được gọi khi chuyển sang quiz screen
     * setupEventListeners() đã được gọi trong init()
     */
    startGame() {
        console.log(`Game started - creating a new ${this.getRoundQuestionCount()}-question round`);
        this.createRound();
        this.score = 0;
        this.ui.renderScore(this.score);
        this.loadQuestion(0);
    }

    getRoundQuestionCount() {
        return Object.values(GAME_CONFIG.questionsPerCategory)
            .reduce((total, count) => total + count, 0);
    }
}

// Khởi tạo quiz khi cần thiết (được gọi từ main.js khi chuyển sang quiz screen)
let quiz = null;

if (typeof module !== 'undefined') {
    module.exports = { Quiz };
}

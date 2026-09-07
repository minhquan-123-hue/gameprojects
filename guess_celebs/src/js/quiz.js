/**
 * quiz.js
 * Xử lý logic quiz game
 *
 * Chức năng:
 * - Mỗi lượt chọn số nhân vật theo GAME_CONFIG không trùng
 * - Mỗi nhân vật chọn ngẫu nhiên 1 trong 2 câu hỏi
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
        this.scores = {
            dick: 0,
            pussy: 0,
            master: 0
        };
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
        this.selectedQuestions = this.questionSelector.createRound();
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
            this.addScore();
            // Play correct sound
            if (audioManager) {
                audioManager.playCorrect();
            }
        } else {
            // Play wrong sound
            if (audioManager) {
                audioManager.playWrong();
            }
        }

        this.ui.renderAnswer(selectedIndex, question.correctIndex);
        this.ui.renderScores(this.scores);
    }

    /**
     * Thêm điểm dựa trên vòng
     */
    addScore() {
        const round = this.currentQuestion + 1;
        if (round % 3 === 1) {
            this.scores.dick++;
        } else if (round % 3 === 2) {
            this.scores.pussy++;
        } else {
            this.scores.master++;
        }
    }

    /**
     * Chuyển sang câu hỏi tiếp theo
     */
    nextQuestion() {
        // Play Mon Wave sound khi chuyển câu
        if (audioManager) {
            audioManager.playNextQuestion();
        }
        this.loadQuestion(this.currentQuestion + 1);
    }

    /**
     * Kết thúc quiz - gọi endgame để hiển thị kết quả
     * Trách nhiệm: Chuyển điểm cho endgame, endgame sẽ xử lý hiển thị
     */
    endQuiz() {
        if (endgame === null) {
            endgame = new Endgame(RESULT_TITLES, this.ui);
        }
        endgame.showResults(this.scores, this.totalQuestions);
        game.endGame();
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
        this.scores = { dick: 0, pussy: 0, master: 0 };
        this.answered = false;
        this.ui.renderScores(this.scores);
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
        this.ui.renderScores(this.scores);
        this.loadQuestion(0);
    }

    getRoundQuestionCount() {
        return Object.values(GAME_CONFIG.questionsPerCategory)
            .reduce((total, count) => total + count, 0);
    }
}

// Khởi tạo quiz khi cần thiết (được gọi từ main.js khi chuyển sang quiz screen)
let quiz = null;

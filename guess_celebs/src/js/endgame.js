/**
 * endgame.js
 * Quản lý màn hình kết thúc game
 *
 * Trách nhiệm riêng biệt:
 * - Hiển thị kết quả dựa trên điểm số
 * - Quản lý result screen
 * - Không can thiệp vào logic quiz
 */

const RESULT_TITLES = {
    0: {
        title: '💀',
        message: 'Cậu nhỏ xuất nhanh , 1 tháng được tầm quả lọ'
    },
    1: {
        title: '🍆',
        message: 'Cậu bé khổ dâm, thích nhịn xuất nhưng hay mộng tinh'
    },
    2: {
        title: '🗿',
        message: 'Dâm tặc nửa vời, bắn toàn vào điện thoại'
    },
    3: {
        title: '🥵',
        message: 'Dái lắm lông , xuất tinh vào quần sịp xong đi ngủ'
    },
    4: {
        title: '🤡',
        message: 'Ăn Ba tô cơm, xúc bình xăng con 5 lần một tuần'
    },
    5: {
        title: '👑',
        message: 'Vua sục cặc của lớp'
    }
};

const RESULT_SCORE_BANDS = [
    { maxScore: 2, resultKey: 0 },
    { maxScore: 3, resultKey: 3 },
    { maxScore: 4, resultKey: 4 },
    { maxScore: 7, resultKey: 5 }
];

class Endgame {
    constructor(resultTitles, ui) {
        this.resultTitles = resultTitles;
        this.ui = ui;
    }

    getResultData(score) {
        const band = RESULT_SCORE_BANDS.find(({ maxScore }) => score <= maxScore);
        const resultKey = band ? band.resultKey : RESULT_SCORE_BANDS.at(-1).resultKey;
        return this.resultTitles[resultKey];
    }

    /**
     * Hiển thị kết quả game
     */
    showResults(score, totalQuestions) {
        const resultData = this.getResultData(score);

        this.ui.renderResult(resultData, score, totalQuestions);

        if (audioManager) {
            audioManager.playFinalRound();
        }
    }

    reset() {
    }
}

let endgame = null;

if (typeof module !== 'undefined') {
    module.exports = { Endgame, RESULT_TITLES, RESULT_SCORE_BANDS };
}

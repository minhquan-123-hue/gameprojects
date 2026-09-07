class GameUI {
    constructor() {
        this.screens = {
            menu: document.getElementById('menuScreen'),
            introduction: document.getElementById('introductionScreen'),
            quiz: document.getElementById('quizScreen'),
            result: document.getElementById('resultScreen')
        };
        this.answerBoxes = [...document.querySelectorAll('.answer-box')];
        this.progressText = document.querySelector('.progress-text');
        this.progressFill = document.querySelector('.progress-fill');
        this.characterImage = document.getElementById('characterImage');
        this.questionText = document.getElementById('questionText');
        this.btnNext = document.getElementById('btnNext');
    }

    bindNavigation(handlers) {
        document.getElementById('btnStart')?.addEventListener('click', handlers.onStart);
        document.getElementById('btnIntroduction')?.addEventListener('click', handlers.onIntroduction);
        document.getElementById('btnIntroductionClose')?.addEventListener('click', handlers.onIntroductionClose);
        document.getElementById('btnReplay')?.addEventListener('click', handlers.onReplay);
    }

    bindQuizInteractions(handlers) {
        this.answerBoxes.forEach((box, index) => {
            box.addEventListener('click', () => handlers.onAnswer(index));
        });
        this.btnNext?.addEventListener('click', handlers.onNext);
    }

    showScreen(screenName) {
        Object.entries(this.screens).forEach(([name, screen]) => {
            screen?.classList.toggle('active', name === screenName);
        });
    }

    renderQuestion(character, question, currentQuestion, totalQuestions) {
        const progress = ((currentQuestion + 1) / totalQuestions) * 100;
        const labels = ['A', 'B', 'C', 'D'];

        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `Câu ${currentQuestion + 1}/${totalQuestions}`;
        this.characterImage.src = character.image;
        this.characterImage.alt = character.character;
        this.questionText.textContent = question.question;

        this.answerBoxes.forEach((box, index) => {
            box.innerHTML = `<span class="answer-label">${labels[index]}</span> ${question.answers[index]}`;
            box.classList.remove('correct', 'incorrect', 'disabled');
            box.style.pointerEvents = 'auto';
        });
        this.btnNext.classList.remove('show');
    }

    renderAnswer(selectedIndex, correctIndex) {
        this.answerBoxes.forEach(box => {
            box.classList.add('disabled');
            box.style.pointerEvents = 'none';
        });

        if (selectedIndex === correctIndex) {
            this.answerBoxes[selectedIndex].classList.add('correct');
        } else {
            this.answerBoxes[selectedIndex].classList.add('incorrect');
            this.answerBoxes[correctIndex].classList.add('correct');
        }

        this.btnNext.classList.add('show');
    }

    renderScore(score) {
        document.getElementById('masterScore').textContent = score;
    }

    renderResult(resultData, score, totalQuestions) {
        document.getElementById('resultTitle').textContent = resultData.title;
        document.getElementById('resultMessage').textContent = resultData.message;
        document.getElementById('resultScore').textContent = `Điểm: ${score}/${totalQuestions}`;
        document.getElementById('resultMasterScore').textContent = score;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { GameUI };
}
/**
 * quizContentLoader.js
 *
 * Data layer: đọc question-content.md và biến nó thành runtime quiz data.
 * Đây là lớp duy nhất chịu trách nhiệm ingest/validate quiz content.
 *
 * Policy:
 * - Parse và validate từng question độc lập.
 * - Question lỗi sẽ bị bỏ qua, không làm crash toàn bộ game.
 * - Entry vẫn được giữ nếu còn ít nhất 1 question hợp lệ.
 */

const QUIZ_CONTENT_PATH = '../content/question-content.md';

function normalizeQuizText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\u2018\u2019\u201c\u201d`"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshteinDistance(a, b) {
    const rows = b.length + 1;
    const cols = a.length + 1;
    const matrix = Array.from({ length: rows }, (_, row) => {
        const values = new Array(cols);
        values[0] = row;
        return values;
    });

    for (let col = 0; col < cols; col++) matrix[0][col] = col;

    for (let row = 1; row < rows; row++) {
        for (let col = 1; col < cols; col++) {
            const cost = b[row - 1] === a[col - 1] ? 0 : 1;
            matrix[row][col] = Math.min(
                matrix[row - 1][col] + 1,
                matrix[row][col - 1] + 1,
                matrix[row - 1][col - 1] + cost
            );
        }
    }

    return matrix[rows - 1][cols - 1];
}

function findCorrectIndex(answer, options) {
    const normalizedAnswer = normalizeQuizText(answer);
    const normalizedOptions = options.map(normalizeQuizText);

    const exactIndex = normalizedOptions.indexOf(normalizedAnswer);
    if (exactIndex !== -1) return exactIndex;

    const candidates = normalizedOptions
        .map((option, index) => ({
            index,
            distance: levenshteinDistance(normalizedAnswer, option)
        }))
        .sort((a, b) => a.distance - b.distance);

    const best = candidates[0];
    const secondBest = candidates[1];
    const maxDistance = Math.max(1, Math.floor(normalizedAnswer.length * 0.18));

    if (
        best &&
        best.distance <= maxDistance &&
        (!secondBest || best.distance < secondBest.distance)
    ) {
        console.warn(
            `Quiz answer typo normalized: "${answer}" → "${options[best.index]}"`
        );
        return best.index;
    }

    throw new Error(
        `Không xác định được đáp án đúng: "${answer}". Options: ${options.join(' | ')}`
    );
}

function parseAnswerOptions(line) {
    const matches = [...line.matchAll(/(?:^|\s)([a-d])\.\s*/gi)];

    if (
        matches.length !== 4 ||
        matches.map(match => match[1].toLowerCase()).join('') !== 'abcd'
    ) {
        return null;
    }

    return matches.map((match, index) => {
        const start = match.index + match[0].length;
        const end = index < matches.length - 1
            ? matches[index + 1].index
            : line.length;
        return line.slice(start, end).trim();
    });
}

function parseQuizContent(markdown) {
    const entries = [];
    const validationErrors = [];
    const lines = markdown.split(/\r?\n/);
    let currentEntry = null;
    let currentQuestion = null;
    let currentCategory = null;

    const recordQuestionError = (reason) => {
        const questionText = currentQuestion?.question || '(không có nội dung question)';
        const entryName = currentEntry?.filename || '(không xác định hình)';
        const message = `[${entryName}] ${reason}: ${questionText.slice(0, 100)}`;
        validationErrors.push(message);
        console.warn(`Quiz content skipped: ${message}`);
    };

    const finishQuestion = () => {
        if (!currentQuestion) return;

        if (!currentQuestion.answers || currentQuestion.answers.length !== 4) {
            recordQuestionError('thiếu đủ 4 đáp án');
            currentQuestion = null;
            return;
        }

        if (!currentQuestion.answer) {
            recordQuestionError('thiếu answer');
            currentQuestion = null;
            return;
        }

        try {
            currentEntry.questions.push({
                question: currentQuestion.question,
                answers: currentQuestion.answers,
                correctIndex: findCorrectIndex(
                    currentQuestion.answer,
                    currentQuestion.answers
                )
            });
        } catch (error) {
            recordQuestionError(error.message);
        }

        currentQuestion = null;
    };

    const finishEntry = () => {
        finishQuestion();
        if (!currentEntry) return;

        if (!currentEntry.image) {
            validationErrors.push(`[${currentEntry.filename}] thiếu image`);
            console.warn(`Quiz content skipped entry: [${currentEntry.filename}] thiếu image`);
            currentEntry = null;
            return;
        }

        if (!currentEntry.character) {
            validationErrors.push(`[${currentEntry.filename}] thiếu character`);
            console.warn(`Quiz content skipped entry: [${currentEntry.filename}] thiếu character`);
            currentEntry = null;
            return;
        }

        if (!currentEntry.category) {
            validationErrors.push(`[${currentEntry.filename}] thiếu category`);
            console.warn(`Quiz content skipped entry: [${currentEntry.filename}] thiếu category`);
            currentEntry = null;
            return;
        }

        if (currentEntry.questions.length === 0) {
            validationErrors.push(`[${currentEntry.filename}] không có question hợp lệ`);
            console.warn(`Quiz content skipped entry: [${currentEntry.filename}] không có question hợp lệ`);
            currentEntry = null;
            return;
        }

        entries.push({
            category: currentEntry.category,
            character: currentEntry.character,
            image: currentEntry.image,
            questions: currentEntry.questions
        });
        currentEntry = null;
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const categoryMatch = line.match(/^([a-z0-9_-]+)\/$/i);
        if (categoryMatch && categoryMatch[1].toLowerCase() !== 'images') {
            currentCategory = categoryMatch[1].toLowerCase();
            continue;
        }

        const imageMatch = line.match(/^-\s*([^\s]+\.png)\s*:\s*$/i);
        if (imageMatch) {
            finishEntry();
            currentEntry = {
                filename: imageMatch[1],
                image: null,
                character: null,
                category: currentCategory,
                questions: []
            };
            continue;
        }

        if (!currentEntry) continue;

        const imagePathMatch = line.match(/^image:\s*(.+)$/i);
        if (imagePathMatch) {
            currentEntry.image = imagePathMatch[1].trim();
            continue;
        }

        const characterMatch = line.match(/^character:\s*(.+)$/i);
        if (characterMatch) {
            currentEntry.character = characterMatch[1].trim();
            continue;
        }

        const questionMatch = line.match(/^\d+\.\s*question:\s*(.*)$/i);
        if (questionMatch) {
            finishQuestion();
            currentQuestion = {
                question: questionMatch[1].trim(),
                answers: null,
                answer: null
            };
            continue;
        }

        if (!currentQuestion) continue;

        const options = parseAnswerOptions(line);
        if (options) {
            currentQuestion.answers = options;
            continue;
        }

        const answerMatch = line.match(/^answer:\s*(.*)$/i);
        if (answerMatch) {
            currentQuestion.answer = answerMatch[1].trim();
        }
    }

    finishEntry();

    return {
        entries,
        validationErrors
    };
}

async function loadQuizDataFromContent() {
    const response = await fetch(QUIZ_CONTENT_PATH, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error(
            `Không thể tải ${QUIZ_CONTENT_PATH}: HTTP ${response.status}`
        );
    }

    const { entries, validationErrors } = parseQuizContent(await response.text());
    const totalQuestions = entries.reduce(
        (total, entry) => total + entry.questions.length,
        0
    );

    if (entries.length === 0 || totalQuestions === 0) {
        throw new Error('Không có dữ liệu quiz hợp lệ để khởi tạo game.');
    }

    window.QUIZ_DATA = entries;
    window.QUIZ_CONTENT_ERRORS = validationErrors;

    console.log(
        `Quiz content validated: ${entries.length} nhân vật, ${totalQuestions} câu hỏi hợp lệ.`
    );

    if (validationErrors.length > 0) {
        console.warn(
            `Quiz content có ${validationErrors.length} lỗi và đã bỏ qua các phần không hợp lệ.`
        );
    }

    return entries;
}

if (typeof module !== 'undefined') {
    module.exports = { parseQuizContent };
}

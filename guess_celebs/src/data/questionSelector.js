class QuestionSelector {
    constructor(entries, questionsPerCategory, random = Math.random) {
        this.entriesByCategory = new Map();
        this.questionsPerCategory = questionsPerCategory;
        this.random = random;
        this.usedQuestionIds = new Map();

        entries.forEach(entry => {
            if (!this.entriesByCategory.has(entry.category)) {
                this.entriesByCategory.set(entry.category, []);
                this.usedQuestionIds.set(entry.category, new Set());
            }
            this.entriesByCategory.get(entry.category).push(entry);
        });
    }

    createRound() {
        const round = [];
        const selectedCharacters = new Set();

        Object.entries(this.questionsPerCategory).forEach(([category, count]) => {
            round.push(...this.selectCategory(category, count, selectedCharacters));
        });

        return this.shuffle(round);
    }

    selectCategory(category, count, selectedCharacters) {
        if (count <= 0) return [];

        const entries = this.entriesByCategory.get(category) || [];
        const characterCount = new Set(entries.map(entry => entry.character)).size;
        if (characterCount < count) {
            throw new Error(
                `Category "${category}" cần ít nhất ${count} character khác nhau, hiện chỉ có ${characterCount}.`
            );
        }

        const usedQuestionIds = this.usedQuestionIds.get(category) || new Set();
        let candidates = this.getCandidates(entries, usedQuestionIds, selectedCharacters);

        if (candidates.length < count) {
            usedQuestionIds.clear();
            candidates = this.getCandidates(entries, usedQuestionIds, selectedCharacters);
        }

        if (candidates.length < count) {
            throw new Error(
                `Category "${category}" không đủ question hợp lệ để tạo round.`
            );
        }

        const categoryCharacters = new Set();
        const selected = [];
        while (selected.length < count) {
            const available = candidates.filter(entry => !categoryCharacters.has(entry.character));
            const entry = this.randomItem(available);
            const availableQuestions = entry.questions.filter(
                question => !usedQuestionIds.has(this.getQuestionId(category, entry, question))
            );
            const question = this.randomItem(availableQuestions);
            const questionId = this.getQuestionId(category, entry, question);

            categoryCharacters.add(entry.character);
            selectedCharacters.add(entry.character);
            usedQuestionIds.add(questionId);
            selected.push({
                category,
                character: entry.character,
                image: entry.image,
                ...question
            });
        }

        return selected;
    }

    getCandidates(entries, usedQuestionIds, selectedCharacters) {
        return entries.filter(entry =>
            !selectedCharacters.has(entry.character) &&
            entry.questions.some(question =>
                !usedQuestionIds.has(this.getQuestionId(entry.category, entry, question))
            )
        );
    }

    getQuestionId(category, entry, question) {
        return `${category}:${entry.character}:${entry.image}:${entry.questions.indexOf(question)}`;
    }

    randomItem(items) {
        return items[Math.floor(this.random() * items.length)];
    }

    shuffle(items) {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(this.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { QuestionSelector };
}
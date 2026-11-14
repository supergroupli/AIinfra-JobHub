"""Build a versioned question bank from the actual bilingual course quizzes."""
import hashlib
import json
from pathlib import Path


def question_bank(courses):
    bank = {"version": 1, "courses": [], "questions": []}
    seen = set()
    for course in sorted(courses, key=lambda c: c['number']):
        bank['courses'].append({"id": course['id'], "title": course['title']})
        for day in course['steps']:
            for index, quiz in enumerate(day.get('quiz', []), 1):
                ident = f"{course['id']}-day-{day['day']}-q-{index}"
                if ident in seen:
                    raise ValueError('Duplicate practice ID: ' + ident)
                seen.add(ident)
                for key in ('question', 'explanation'):
                    if not isinstance(quiz.get(key), dict) or any(not isinstance(quiz[key].get(lang), str) or not quiz[key][lang].strip() for lang in ('zh', 'en')):
                        raise ValueError('Missing bilingual question content: ' + ident)
                options = quiz.get('options')
                if not isinstance(options, list) or not 2 <= len(options) <= 8 or any(not isinstance(option, dict) or any(not isinstance(option.get(lang), str) or not option[lang].strip() for lang in ('zh', 'en')) for option in options):
                    raise ValueError('Invalid question options: ' + ident)
                if type(quiz.get('answer')) is not int or not 0 <= quiz['answer'] < len(options):
                    raise ValueError('Invalid question answer: ' + ident)
                payload = {"title": day['title'], **{key: quiz[key] for key in ('question', 'options', 'answer', 'explanation')}}
                fingerprint = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
                bank['questions'].append({"id": ident, "fingerprint": fingerprint, "course": course['id'], "day": day['day'], "number": index, **payload})
    return bank


def build_practice(courses, out):
    bank = question_bank(courses)
    folder = Path(out) / 'practice'
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'questions.json').write_text(json.dumps(bank, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return bank

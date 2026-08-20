#!/usr/bin/env python3
"""Converts a College Board digital SAT question bank dump into the
JSON files this app fetches at runtime (public/data/math.json,
public/data/reading.json).

Input: a JSON dump of the Bluebook question bank, keyed by uid, in the
format produced by https://github.com/mdn522/sat-question-bank
(data/cb-digital-questions.json). Only the modern "mcq" schema is kept
-- legacy "ibn" items are dropped because they render their math as
embedded bitmap images instead of MathML, which bloats the bundle for
a mobile app.

Usage:
    python3 scripts/build-question-bank.py path/to/cb-digital-questions.json
"""
import json
import os
import sys


def convert(source_path: str, out_dir: str) -> None:
    with open(source_path) as f:
        data = json.load(f)

    math_questions = []
    reading_questions = []

    for uid, entry in data.items():
        content = entry.get('content', {})
        if content.get('type') != 'mcq':
            continue

        options = content.get('answerOptions') or []
        keys = content.get('keys') or []
        if not options or not keys:
            continue

        option_ids = [o.get('id') for o in options]
        try:
            correct_index = option_ids.index(keys[0])
        except ValueError:
            continue

        question = {
            'id': entry.get('questionId') or uid,
            'section': 'math' if entry.get('module') == 'math' else 'reading',
            'skill': entry.get('primary_class_cd_desc') or entry.get('skill_desc') or 'General',
            'difficulty': entry.get('difficulty'),
            'passageHtml': content.get('stimulus'),
            'promptHtml': content.get('stem'),
            'choices': [o.get('content', '') for o in options],
            'correctIndex': correct_index,
            'explanationHtml': content.get('rationale'),
        }

        if question['section'] == 'math':
            math_questions.append(question)
        else:
            reading_questions.append(question)

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'math.json'), 'w') as f:
        json.dump(math_questions, f, separators=(',', ':'))
    with open(os.path.join(out_dir, 'reading.json'), 'w') as f:
        json.dump(reading_questions, f, separators=(',', ':'))

    print(f'math: {len(math_questions)} questions')
    print(f'reading: {len(reading_questions)} questions')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    convert(sys.argv[1], os.path.join(script_dir, '..', 'public', 'data'))

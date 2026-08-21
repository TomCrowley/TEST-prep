#!/usr/bin/env python3
"""Converts a College Board digital question bank dump into the JSON
files this app fetches at runtime (public/data/math.json,
public/data/reading.json, or an --out-prefix'd pair for a second
question bank alongside those).

Input: a JSON dump keyed by uid, in the format produced by
https://github.com/mdn522/sat-question-bank (data/cb-digital-questions.json)
for SAT, or scripts/fetch-psat-questions.py for PSAT -- both use the
same {uid: {questionId, module, primary_class_cd_desc, skill_desc,
difficulty, content: {type, stem, stimulus, answerOptions, keys,
rationale}}} shape. Only the modern "mcq" schema is kept -- legacy
"ibn" items are dropped because they render their math as embedded
bitmap images instead of MathML, which bloats the bundle for a mobile
app, and "spr" (grid-in) items are dropped because the app has no
free-response answer UI.

Usage:
    python3 scripts/build-question-bank.py path/to/cb-digital-questions.json
    python3 scripts/build-question-bank.py data/psat-100-raw.json --id-prefix psat- --out-prefix psat-
"""
import argparse
import json
import os


def convert(source_path: str, out_dir: str, id_prefix: str, out_prefix: str) -> None:
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
            'id': id_prefix + (entry.get('questionId') or uid),
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
    with open(os.path.join(out_dir, f'{out_prefix}math.json'), 'w') as f:
        json.dump(math_questions, f, separators=(',', ':'))
    with open(os.path.join(out_dir, f'{out_prefix}reading.json'), 'w') as f:
        json.dump(reading_questions, f, separators=(',', ':'))

    print(f'math: {len(math_questions)} questions')
    print(f'reading: {len(reading_questions)} questions')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('source', help='path to the question bank dump JSON')
    parser.add_argument('--id-prefix', default='', help='prefix applied to every question id, to keep two banks\' ids from colliding')
    parser.add_argument('--out-prefix', default='', help='prefix applied to the output filenames (math.json/reading.json)')
    args = parser.parse_args()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    convert(args.source, os.path.join(script_dir, '..', 'public', 'data'), args.id_prefix, args.out_prefix)

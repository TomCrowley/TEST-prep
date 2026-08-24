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


def load_existing_tldrs(path: str) -> dict:
    # Re-running this script (e.g. to refresh the question bank) shouldn't
    # throw away the tldr field scripts/summarize-explanations.py paid an
    # LLM to generate -- carry it forward for any question id that still
    # exists, keyed by id so it survives even if the source list reorders.
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return {q['id']: q.get('tldr') for q in json.load(f)}


def convert(source_path: str, out_dir: str, id_prefix: str, out_prefix: str) -> None:
    with open(source_path) as f:
        data = json.load(f)

    math_path = os.path.join(out_dir, f'{out_prefix}math.json')
    reading_path = os.path.join(out_dir, f'{out_prefix}reading.json')
    existing_tldrs = {**load_existing_tldrs(math_path), **load_existing_tldrs(reading_path)}

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

        question_id = id_prefix + (entry.get('questionId') or uid)
        question = {
            'id': question_id,
            'section': 'math' if entry.get('module') == 'math' else 'reading',
            'skill': entry.get('primary_class_cd_desc') or entry.get('skill_desc') or 'General',
            'difficulty': entry.get('difficulty'),
            'passageHtml': content.get('stimulus'),
            'promptHtml': content.get('stem'),
            'choices': [o.get('content', '') for o in options],
            'correctIndex': correct_index,
            'explanationHtml': content.get('rationale'),
            'tldr': existing_tldrs.get(question_id),
        }

        if question['section'] == 'math':
            math_questions.append(question)
        else:
            reading_questions.append(question)

    os.makedirs(out_dir, exist_ok=True)
    with open(math_path, 'w') as f:
        json.dump(math_questions, f, separators=(',', ':'))
    with open(reading_path, 'w') as f:
        json.dump(reading_questions, f, separators=(',', ':'))

    carried = sum(1 for q in math_questions + reading_questions if q['tldr'] is not None)
    print(f'math: {len(math_questions)} questions')
    print(f'reading: {len(reading_questions)} questions')
    print(f'tldr carried over from existing files: {carried}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('source', help='path to the question bank dump JSON')
    parser.add_argument('--id-prefix', default='', help='prefix applied to every question id, to keep two banks\' ids from colliding')
    parser.add_argument('--out-prefix', default='', help='prefix applied to the output filenames (math.json/reading.json)')
    args = parser.parse_args()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    convert(args.source, os.path.join(script_dir, '..', 'public', 'data'), args.id_prefix, args.out_prefix)

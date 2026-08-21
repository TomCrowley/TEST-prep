#!/usr/bin/env python3
"""Farms PSAT questions from the College Board question bank API and dumps
them in the same shape as https://github.com/mdn522/sat-question-bank's
cb-digital-questions.json, so scripts/build-question-bank.py's existing
parsing logic works unmodified against PSAT data too.

The API (found via devtools against
https://satsuiteeducatorquestionbank.collegeboard.org, no login required):

  POST https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions
    body: {"asmtEventId": <int>, "test": 1|2, "domain": "<comma-separated codes>"}
    -> array of {external_id, questionId, primary_class_cd_desc, skill_desc,
                  difficulty, ibn, ...} for every matching question, no
                  server-side pagination.

  POST https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question
    body: {"external_id": "<uuid>"}
    -> {stem, stimulus, answerOptions, keys, correct_answer, rationale, type}

asmtEventId: 99 = SAT, 100 = PSAT/NMSQT & PSAT 10, 102 = PSAT 8/9
test: 1 = Reading and Writing, 2 = Math
Reading and Writing domains: INI, CAS, EOI, SEC
Math domains: H, P, Q, S

About 23% of Math questions are legacy items with external_id: null (an ibn
code instead) -- these can't be fetched via get-question and are skipped.
Reading and Writing has none of these. Math also has a mix of "mcq" and
"spr" (grid-in) question types; Reading and Writing is all "mcq".

Usage:
    python3 scripts/fetch-psat-questions.py [--asmt 100] [--out data/psat-question-bank-raw.json] [--workers 8]
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

API_BASE = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital'

SECTIONS = [
    ('reading', 1, 'INI,CAS,EOI,SEC'),
    ('math', 2, 'H,P,Q,S'),
]


def post_json(path: str, body: dict, retries: int = 3):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(
        f'{API_BASE}/{path}',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                return json.loads(res.read().decode('utf-8'))
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep(0.5 * (attempt + 1))
    raise last_err


def fetch_question_list(asmt_event_id: int, test: int, domain: str) -> list:
    return post_json('get-questions', {'asmtEventId': asmt_event_id, 'test': test, 'domain': domain})


def fetch_question_detail(external_id: str) -> dict:
    return post_json('get-question', {'external_id': external_id})


def farm(asmt_event_id: int, workers: int) -> dict:
    result = {}
    stats = {'listed': 0, 'skipped_no_external_id': 0, 'fetched': 0, 'failed': 0, 'mcq': 0, 'spr': 0, 'other_type': 0}

    for module, test, domain in SECTIONS:
        print(f'[{module}] listing questions (asmtEventId={asmt_event_id}, test={test}, domain={domain})...', flush=True)
        listing = fetch_question_list(asmt_event_id, test, domain)
        stats['listed'] += len(listing)

        eligible = [item for item in listing if item.get('external_id')]
        stats['skipped_no_external_id'] += len(listing) - len(eligible)
        print(f'[{module}] {len(listing)} listed, {len(eligible)} have external_id (fetchable)', flush=True)

        def fetch_one(item):
            detail = fetch_question_detail(item['external_id'])
            return item, detail

        done = 0
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(fetch_one, item): item for item in eligible}
            for future in as_completed(futures):
                item = futures[future]
                try:
                    item, detail = future.result()
                except Exception as e:
                    stats['failed'] += 1
                    print(f'  ! failed {item.get("external_id")}: {e}', flush=True)
                    continue

                qtype = detail.get('type')
                if qtype == 'mcq':
                    stats['mcq'] += 1
                elif qtype == 'spr':
                    stats['spr'] += 1
                else:
                    stats['other_type'] += 1

                result[item['external_id']] = {
                    'questionId': item.get('questionId'),
                    'module': module,
                    'primary_class_cd_desc': item.get('primary_class_cd_desc'),
                    'skill_desc': item.get('skill_desc'),
                    'difficulty': item.get('difficulty'),
                    'program': item.get('program'),
                    'content': {
                        'type': detail.get('type'),
                        'stem': detail.get('stem'),
                        'stimulus': detail.get('stimulus'),
                        'answerOptions': detail.get('answerOptions'),
                        'keys': detail.get('keys'),
                        'correct_answer': detail.get('correct_answer'),
                        'rationale': detail.get('rationale'),
                    },
                }
                stats['fetched'] += 1
                done += 1
                if done % 100 == 0:
                    print(f'[{module}] {done}/{len(eligible)} fetched', flush=True)

        print(f'[{module}] done: {done}/{len(eligible)} fetched', flush=True)

    print('---')
    print(json.dumps(stats, indent=2))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asmt', type=int, default=100, help='asmtEventId (default 100 = PSAT/NMSQT & PSAT 10)')
    parser.add_argument('--out', default=None, help='output path (default data/psat-<asmt>-raw.json)')
    parser.add_argument('--workers', type=int, default=8, help='concurrent get-question requests')
    args = parser.parse_args()

    out_path = args.out or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'data', f'psat-{args.asmt}-raw.json'
    )
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

    start = time.time()
    result = farm(args.asmt, args.workers)
    elapsed = time.time() - start

    with open(out_path, 'w') as f:
        json.dump(result, f, separators=(',', ':'))

    print(f'wrote {len(result)} questions to {out_path} in {elapsed:.1f}s')


if __name__ == '__main__':
    main()

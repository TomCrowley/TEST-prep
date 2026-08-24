#!/usr/bin/env python3
"""Generates a one-sentence TL;DR for every question's explanationHtml in
public/data/*.json, using the Claude API directly over HTTPS (stdlib only,
no SDK needed -- matches the rest of this repo's scripts). Writes the
result into each question's `tldr` field, in place.

Resumable: only processes questions where `tldr` is currently null, and
saves incrementally, so a killed/interrupted run can just be restarted.
scripts/build-question-bank.py also carries `tldr` forward across future
question-bank refreshes, so this pass doesn't need to be repeated for
questions that already have one.

Requires ANTHROPIC_API_KEY in the environment.

Usage:
    python3 scripts/summarize-explanations.py
    python3 scripts/summarize-explanations.py --files math.json,reading.json --workers 15
"""
import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = 'https://api.anthropic.com/v1/messages'
MODEL = 'claude-haiku-4-5-20251001'
DEFAULT_FILES = ['math.json', 'reading.json', 'psat-math.json', 'psat-reading.json']
SAVE_EVERY = 50

SYSTEM_PROMPT = (
    "You write one-sentence TL;DRs for SAT/PSAT answer explanations. Given "
    "the full explanation (which states the correct answer and why each "
    "choice is right or wrong), output ONE short sentence -- at most 20 "
    "words -- giving the core reason the correct answer is correct. "
    "Do not name the choice letter (e.g. \"Choice B\"); state the reasoning "
    "itself. No preamble, no \"TL;DR:\" prefix, no mention of the wrong "
    "choices, no markdown, no HTML. Plain text only."
)


def strip_html(s: str) -> str:
    # MathML's alttext attribute already holds a clean spoken-form (e.g.
    # alttext="f left parenthesis x right parenthesis equals 72") -- use
    # that instead of the raw <math> markup, which strips to tag soup.
    s = re.sub(r'<math alttext="([^"]*)">.*?</math>', lambda m: html.unescape(m.group(1)), s, flags=re.DOTALL)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()


def call_api(explanation_text: str, api_key: str, retries: int = 5) -> str:
    body = json.dumps({
        'model': MODEL,
        'max_tokens': 100,
        'system': SYSTEM_PROMPT,
        'messages': [{'role': 'user', 'content': explanation_text[:4000]}],
    }).encode('utf-8')
    req = urllib.request.Request(
        API_URL, data=body, method='POST',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
        },
    )
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode('utf-8'))
                return data['content'][0]['text'].strip()
        except urllib.error.HTTPError as e:
            body_text = e.read().decode('utf-8', errors='replace')
            if e.code == 429 or e.code >= 500:
                last_err = RuntimeError(f'{e.code}: {body_text}')
                time.sleep(min(2 ** attempt, 20))
                continue
            raise RuntimeError(f'API error {e.code}: {body_text}') from e
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep(min(2 ** attempt, 20))
    raise last_err


def process_file(path: str, api_key: str, workers: int) -> None:
    with open(path, encoding='utf-8') as f:
        questions = json.load(f)

    todo = [q for q in questions if not q.get('tldr')]
    print(f'[{path}] {len(questions)} total, {len(todo)} need a tldr', flush=True)
    if not todo:
        return

    def worker(q):
        text = strip_html(q['explanationHtml'])
        return call_api(text, api_key)

    done = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(worker, q): q for q in todo}
        for future in as_completed(futures):
            q = futures[future]
            try:
                q['tldr'] = future.result()
            except Exception as e:
                failed += 1
                print(f'  ! failed {q["id"]}: {e}', flush=True)
                continue
            done += 1
            if done % SAVE_EVERY == 0:
                print(f'[{path}] {done}/{len(todo)} done ({failed} failed so far)', flush=True)
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(questions, f, separators=(',', ':'))

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, separators=(',', ':'))
    print(f'[{path}] done: {done}/{len(todo)} succeeded, {failed} failed', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--files', default=','.join(DEFAULT_FILES))
    parser.add_argument('--workers', type=int, default=12)
    args = parser.parse_args()

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print('ANTHROPIC_API_KEY not set', file=sys.stderr)
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, '..', 'public', 'data')

    start = time.time()
    for fname in args.files.split(','):
        process_file(os.path.join(data_dir, fname), api_key, args.workers)
    print(f'total time: {time.time() - start:.1f}s')


if __name__ == '__main__':
    main()

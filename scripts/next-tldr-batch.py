#!/usr/bin/env python3
"""Prints the next N questions (across all public/data/*.json files) that
don't have a tldr yet, as compact JSON: {"batch": [{"id", "text"}, ...],
"remaining_before_this_batch": N}.

Companion to apply-tldr-batch.py: this is the "no API key" version of the
TLDR pass -- Claude reads this script's output directly in conversation,
writes a tldr for each item itself (it's already an LLM, no need to call
one over HTTP), and apply-tldr-batch.py merges the result back in. Fully
resumable since progress is saved to the actual data files after every
batch, not held in memory.

Usage:
    python3 scripts/next-tldr-batch.py --n 80
"""
import argparse
import html
import json
import os
import re

FILES = ['math.json', 'reading.json', 'psat-math.json', 'psat-reading.json']

# Below this word count, a generated TLDR ends up nearly restating the
# explanation's own first sentence instead of compressing it -- e.g. a
# 58-word explanation "Choice C is correct. Dividing both sides ... yields
# 5x=3." doesn't need a summary above it saying the same thing again.
# Affects ~5.2% of explanations overall, but 13.1% of PSAT math specifically.
# Always skipped -- never included in a batch.
MIN_WORDS_FOR_TLDR = 80
# At or above this, always generate a TLDR -- long enough that compression
# is unambiguously useful. Between MIN_WORDS_FOR_TLDR and this is a judgment
# zone: still included in the batch (flagged "judgment": true) so Claude can
# decide per-item whether a TLDR actually adds anything, rather than a
# blanket rule either way.
ALWAYS_WORDS_FOR_TLDR = 100


def strip_html(s: str) -> str:
    s = re.sub(r'<math alttext="([^"]*)">.*?</math>', lambda m: html.unescape(m.group(1)), s, flags=re.DOTALL)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--n', type=int, default=80)
    args = parser.parse_args()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, '..', 'public', 'data')

    batch = []
    remaining_total = 0
    skipped_too_short = 0
    for fname in FILES:
        path = os.path.join(data_dir, fname)
        with open(path, encoding='utf-8') as f:
            questions = json.load(f)
        for q in questions:
            # None/missing = not yet reviewed. "" = reviewed, judged not
            # worth a TLDR (still falsy in the UI, so it renders the same
            # as null, but distinct here so it isn't re-offered forever).
            if q.get('tldr') is not None:
                continue
            text = strip_html(q['explanationHtml'])
            word_count = len(text.split())
            if word_count < MIN_WORDS_FOR_TLDR:
                skipped_too_short += 1
                continue
            remaining_total += 1
            if len(batch) < args.n:
                item = {'id': q['id'], 'text': text[:2000]}
                if word_count < ALWAYS_WORDS_FOR_TLDR:
                    item['judgment'] = True
                batch.append(item)

    print(json.dumps({
        'batch': batch,
        'remaining_before_this_batch': remaining_total,
        'skipped_too_short_for_tldr': skipped_too_short,
    }))


if __name__ == '__main__':
    main()

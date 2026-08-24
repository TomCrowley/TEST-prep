#!/usr/bin/env python3
"""Applies a {id: tldr} JSON mapping to the matching questions across
public/data/*.json, saving each modified file. Companion to
next-tldr-batch.py for the inline (no API key) TLDR-generation loop.

Usage:
    python3 scripts/apply-tldr-batch.py --file batch.json
    echo '{"abc123": "..."}' | python3 scripts/apply-tldr-batch.py
"""
import argparse
import json
import os
import sys

FILES = ['math.json', 'reading.json', 'psat-math.json', 'psat-reading.json']


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--file', help='path to a JSON file of {id: tldr}; reads stdin if omitted')
    args = parser.parse_args()
    with (open(args.file, encoding='utf-8') if args.file else sys.stdin) as f:
        mapping = json.load(f)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, '..', 'public', 'data')

    applied = 0
    for fname in FILES:
        path = os.path.join(data_dir, fname)
        with open(path, encoding='utf-8') as f:
            questions = json.load(f)
        changed = False
        for q in questions:
            if q['id'] in mapping:
                q['tldr'] = mapping[q['id']]
                changed = True
                applied += 1
        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(questions, f, separators=(',', ':'))

    unmatched = len(mapping) - applied
    print(f'applied {applied}/{len(mapping)}' + (f', {unmatched} id(s) not found' if unmatched else ''))


if __name__ == '__main__':
    main()

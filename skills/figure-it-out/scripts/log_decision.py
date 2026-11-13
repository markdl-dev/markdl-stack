#!/usr/bin/env python3
"""Append one sanitized decision to a single-writer audit TSV."""

import argparse
import csv
import io
from datetime import datetime, timezone
from pathlib import Path


HEADER = ['ts', 'run', 'phase', 'unit', 'decision', 'why', 'evidence', 'result']
RESULTS = ['VERIFIED', 'NOT VERIFIED', 'INCONCLUSIVE', 'OPEN', 'REVERTED']


def clean(value):
    value = value.replace('\t', ' ').replace('\r', ' ').replace('\n', ' ').strip()
    if value.startswith(('=', '+', '-', '@')):
        value = "'" + value
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    for name in ['run', 'phase', 'unit', 'decision', 'why', 'evidence']:
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--result', choices=RESULTS, required=True)
    args = parser.parse_args()
    values = [clean(getattr(args, name)) for name in HEADER[1:]]
    if any(not value for value in values):
        parser.error('Every decision field must contain a value')
    path = args.log.expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+', encoding='utf-8', newline='') as output:
        output.seek(0)
        existing = output.read()
        try:
            rows = list(csv.reader(io.StringIO(existing), delimiter='\t', strict=True))
        except csv.Error as error:
            parser.error(f'Existing log is malformed: {path}: {error}')
        if rows and rows[0] != HEADER:
            parser.error(f'Existing log has a different schema: {path}')
        if any(len(row) != len(HEADER) for row in rows[1:]):
            parser.error(f'Existing log has an incomplete or malformed row: {path}')
        output.seek(0, 2)
        if existing and not existing.endswith('\n'):
            output.write('\n')
        writer = csv.writer(output, delimiter='\t', lineterminator='\n')
        if not rows:
            writer.writerow(HEADER)
        timestamp = datetime.now(timezone.utc).isoformat(timespec='seconds')
        writer.writerow([timestamp, *values])
    print(path)


if __name__ == '__main__':
    main()

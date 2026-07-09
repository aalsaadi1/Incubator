#!/usr/bin/env python3
"""Compact an OBJ for inline embedding: keep only v/f, round coords, strip vt/vn refs."""
import sys

src, dst = sys.argv[1], sys.argv[2]
out = []
with open(src) as f:
    for line in f:
        if line.startswith('v '):
            p = line.split()
            out.append('v ' + ' '.join(f'{float(c):.4f}'.rstrip('0').rstrip('.') for c in p[1:4]))
        elif line.startswith('f '):
            toks = line.split()[1:]
            out.append('f ' + ' '.join(t.split('/')[0] for t in toks))
with open(dst, 'w') as f:
    f.write('\n'.join(out))
print(f'{len(out)} lines written')

"""Second pass: give a slide a density class when its bullets will not fit.

The theme deliberately has no auto-shrink — a slide that overflows is normally
a slide that wants splitting. These decks are archival transcriptions of
PowerPoint, though, so the original slide breaks are the record and we fit the
type to them instead.
"""
import glob, io, re, sys

# usable body height in px on the 980x551 canvas, after padding and the heading
BODY_PX   = 436
# px consumed by one top-level bullet at each density
ROW_PX    = {'':           30.0, 'dense': 27.0, 'x-dense': 23.0}
# characters that fit on one line at each density, full width.
# Calibrated for the theme's Palatino stack, which is appreciably wider per
# character than a UI sans — lines wrap about 8% sooner than they would in one.
COLS_FULL = {'':           87,   'dense': 96,   'x-dense': 108}


def cost(lines, width_frac, density):
    cols = max(18, int(COLS_FULL[density] * width_frac))
    rows = 0
    for l in lines:
        indent = (len(l) - len(l.lstrip(' '))) // 2
        text = l.strip()[2:]
        shrink = 0.92 ** min(indent, 3)          # nested bullets are smaller
        rows += (1 + len(text) // cols) * shrink
    return rows * ROW_PX[density]


def bullets(block):
    return [l for l in block.split('\n') if l.strip().startswith('- ')]


def measure(body, density):
    """Worst column decides, because columns are side by side."""
    if '::left::' in body and '::right::' in body:
        left  = body.split('::left::', 1)[1].split('::right::', 1)[0]
        right = body.split('::right::', 1)[1]
        return max(cost(bullets(left), 0.47, density),
                   cost(bullets(right), 0.47, density))
    if 'wc-cols' in body:
        return cost(bullets(body), 0.47, density)
    return cost(bullets(body), 1.0, density)


def pick(body):
    for d in ('', 'dense', 'x-dense'):
        if measure(body, d) <= BODY_PX:
            return d
    return 'x-dense'


def split_slides(text):
    """Return [(frontmatter_lines, body_text)] in order."""
    lines = text.split('\n')
    out, i = [], 0
    assert lines[0] == '---'
    j = lines.index('---', 1)
    fm, i = lines[1:j], j + 1
    body = []
    while i < len(lines):
        if lines[i] == '---':
            out.append((fm, '\n'.join(body)))
            nxt = None
            for m in range(i + 1, min(i + 12, len(lines))):
                if lines[m] == '---':
                    nxt = m
                    break
            cand = lines[i + 1:nxt] if nxt is not None else []
            isfm = bool(cand) and all(re.match(r'^[a-zA-Z_][\w-]*\s*:', l) for l in cand)
            if isfm:
                fm, i = cand, nxt + 1
            else:
                fm, i = [], i + 1
            body = []
        else:
            body.append(lines[i])
            i += 1
    out.append((fm, '\n'.join(body)))
    return out


def rebuild(slides):
    chunks = []
    for fm, body in slides:
        chunks.append('---\n' + '\n'.join(fm) + '\n---\n' if fm else '---\n')
        chunks.append(body.strip('\n') + '\n')
    s = '\n'.join(chunks)
    return re.sub(r'\n{3,}', '\n\n', s).lstrip('\n')


changed = 0
for f in sorted(glob.glob(sys.argv[1])):
    slides = split_slides(io.open(f, encoding='utf-8').read())
    hits = []
    for idx, (fm, body) in enumerate(slides):
        if idx == 0 or any(l.startswith('class:') for l in fm):
            continue
        d = pick(body)
        if d:
            fm.append(f'class: {d}')
            t = re.search(r'(?m)^## (.+)$', body)
            hits.append((idx, d, t.group(1)[:46] if t else ''))
    if hits:
        io.open(f, 'w', encoding='utf-8').write(rebuild(slides))
        changed += 1
        for idx, d, t in hits:
            print(f'{f.split("/")[2]}  slide {idx:>2}  {d:<8} {t}')
print(f'\n{changed} decks touched')

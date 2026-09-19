"""Convert Google-Slides-exported .pptx weekly decks into Slidev markdown.

    python3 pptx_to_slidev.py <dir-of-pptx> <repo-root>

Written to import an archive of weekly meeting decks exported from Google
Slides. It maps
a title placeholder to `##`, nested bullet levels to nested markdown lists,
side-by-side text boxes to the `two-cols` layout, and pictures to `<figure>`
blocks grouped into visual columns, with stray text boxes attached as captions
to whichever picture they sit above. Speaker notes become presenter notes.

The DECKS table at the top maps each source filename to its date and the person
the meeting was with; extend it (or replace it) to import another batch.

Text extracted from PowerPoint is escaped before it reaches markdown: none of
it is meant as markdown, and these decks are full of literal "<Aside>" which
Vue would otherwise try to resolve as a component.
"""
import zipfile, re, os, sys, shutil, html
from xml.etree import ElementTree as ET

NS={'a':'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p':'http://schemas.openxmlformats.org/presentationml/2006/main',
    'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
EMU=914400.0
SLIDE_W=10.0

# Where converted decks are written, relative to the repo root given on argv.
OUT_PREFIX = 'meetings'   # Google Slides 16:9 export is 10" x 5.625"

# filename -> (iso date, human date, who the meeting was with)
DECKS = {
    # Map each source .pptx to the folder date, the date as you want it shown,
    # and (optionally) who the meeting was with. Replace these with your own.
    #
    #   '<filename>.pptx': ('<YYYY-MM-DD>', '<human date>', '<with>' or None),
    '30 march 26.pptx':        ('2026-03-30', '30 March 2026', None),
    '6 april 2026.pptx':       ('2026-04-06', '6 April 2026',  'Alex'),
}
# decks whose real subject is not "weekly update"
TITLES = {
    # Decks whose subject is not "Weekly Update". Keyed by folder date.
    '2026-04-06': 'Lit Review',
}

MD_ESC = str.maketrans({'*': r'\*', '_': r'\_', '`': r'\`',
                        '[': r'\[', ']': r'\]'})

def short_url(u, limit=52):
    bare=re.sub(r'^https?://(www\.)?','',u).rstrip('/')
    if len(bare)<=limit: return bare
    host, _, rest = bare.partition('/')
    tail=rest.rsplit('/',1)[-1]
    if len(tail) > limit-len(host)-4:
        tail=tail[:limit-len(host)-7]+'…'
    return f'{host}/…/{tail}'


def safe(t):
    """PowerPoint text is plain prose: nothing in it is meant as markdown, and
    an angle bracket (these notes are full of '<Aside>') would otherwise be
    parsed by Vue as a component tag."""
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return t.translate(MD_ESC)


def runs_of(para):
    """Text of one <a:p>, preserving hyperlinks as markdown links."""
    out=[]
    for r in para:
        tag=r.tag.split('}')[1]
        if tag=='r':
            t=r.find('{%s}t'%NS['a'])
            txt=t.text or '' if t is not None else ''
            rPr=r.find('{%s}rPr'%NS['a'])
            href=None
            if rPr is not None:
                hl=rPr.find('{%s}hlinkClick'%NS['a'])
                if hl is not None:
                    href=hl.get('_href')
            out.append((txt,href))
        elif tag=='br':
            out.append(('\n',None))
        elif tag=='fld':
            t=r.find('{%s}t'%NS['a'])
            if t is not None and t.text: out.append((t.text,None))
    return out

def paras_of(sp, rels):
    res=[]
    for para in sp.iter('{%s}p'%NS['a']):
        # resolve hyperlink rIds first
        for hl in para.iter('{%s}hlinkClick'%NS['a']):
            rid=hl.get('{%s}id'%NS['r'])
            if rid and rid in rels: hl.set('_href', rels[rid])
        pPr=para.find('{%s}pPr'%NS['a'])
        lvl=int(pPr.get('lvl')) if (pPr is not None and pPr.get('lvl')) else 0
        parts=runs_of(para)
        if not parts: continue
        # merge adjacent runs sharing a link target
        txt=''
        cur=None; buf=''
        def emit(b, href):
            b = b.strip() if href else b
            if not b: return ''
            if not href: return safe(b)
            # Google Slides stores a bare URL as its own link text. Printed in
            # full it is unreadable and wraps over three lines, so show a short
            # label and keep the real target in the href.
            label = safe(b) if b != href else safe(short_url(href))
            return f'[{label}]({href})'
        for t,h in parts:
            if h!=cur:
                txt += emit(buf, cur)
                cur=h; buf=t
            else:
                buf+=t
        txt += emit(buf, cur)
        txt=re.sub(r'[ \t]+',' ',txt)
        txt=re.sub(r'\s*\n\s*','<br>',txt).strip()  # after safe(): a real tag
        txt=re.sub(r'^(?:<br>)+|(?:<br>)+$','',txt)
        if txt: res.append((lvl,txt))
    return res

def geom(sp):
    x=sp.find('.//{%s}xfrm'%NS['a'])
    if x is None: return None
    off=x.find('{%s}off'%NS['a']); ext=x.find('{%s}ext'%NS['a'])
    if off is None or ext is None: return None
    return (int(off.get('x'))/EMU, int(off.get('y'))/EMU,
            int(ext.get('cx'))/EMU, int(ext.get('cy'))/EMU)

def parse(path):
    z=zipfile.ZipFile(path); names=z.namelist()
    prels={rel.get('Id'):rel.get('Target')
           for rel in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))}
    pres=ET.fromstring(z.read('ppt/presentation.xml'))
    order=[]
    for sid in pres.iter('{%s}sldId'%NS['p']):
        t=prels.get(sid.get('{%s}id'%NS['r']))
        if t: order.append('ppt/'+t.replace('../',''))
    slides=[]
    for sl in order:
        rp=sl.replace('slides/','slides/_rels/')+'.rels'
        rels={}
        if rp in names:
            for rel in ET.fromstring(z.read(rp)):
                rels[rel.get('Id')]=rel.get('Target')
        root=ET.fromstring(z.read(sl))
        tree=root.find('.//{%s}cSld/{%s}spTree'%(NS['p'],NS['p']))
        title=None; bodies=[]; pics=[]; labels=[]; groups=0; is_cover_ph=False
        for sp in list(tree):
            tag=sp.tag.split('}')[1]
            if tag not in ('sp','pic','graphicFrame','grpSp'): continue
            g=geom(sp)
            if tag=='pic':
                blip=sp.find('.//{%s}blip'%NS['a'])
                rid=blip.get('{%s}embed'%NS['r']) if blip is not None else None
                tgt=rels.get(rid)
                if tgt: pics.append(dict(media=os.path.basename(tgt), g=g))
                continue
            if tag=='grpSp':
                groups+=1; continue
            if tag!='sp': continue
            ph=sp.find('.//{%s}ph'%NS['p'])
            phtype=ph.get('type') if ph is not None else None
            ps=paras_of(sp,rels)
            if not ps: continue
            if phtype in ('title','ctrTitle') and title is None:
                title=' '.join(t for _,t in ps)
                is_cover_ph = (phtype=='ctrTitle')
                continue
            # a short single-line box is a label on a figure, not a body
            if len(ps)==1 and g and g[3] < 0.6 and len(ps[0][1]) < 40:
                labels.append(dict(text=ps[0][1], g=g)); continue
            bodies.append(dict(paras=ps, g=g))
        notes=''
        npath=None
        for rid,t in rels.items():
            if 'notesSlide' in (t or ''): npath='ppt/'+t.replace('../','')
        if npath and npath in names:
            nroot=ET.fromstring(z.read(npath))
            acc=[]
            for sp in nroot.iter('{%s}sp'%NS['p']):
                ph=sp.find('.//{%s}ph'%NS['p'])
                if ph is not None and ph.get('type')=='body':
                    acc += [t for _,t in paras_of(sp,{})]
            notes='\n'.join(acc)
        slides.append(dict(title=title,bodies=bodies,pics=pics,labels=labels,
                           notes=notes,groups=groups,cover_ph=is_cover_ph))
    return z, slides

# ---------------------------------------------------------------- rendering

HEADERS = re.compile(r'^(last week(?:\(s\))?|this week(?:\(end\))?(?: */ *future)?|'
                     r'next weeks?|this week \(next 2 weeks\)|future|todo|'
                     r'goal|progress|knowns|unknowns|grey area|needs|bugs?|'
                     r'emphasize|tasks|questions)\s*:?\s*$', re.I)

def bullets(paras, base=0):
    out=[]
    for lvl,txt in paras:
        out.append('  '*max(0,lvl-base) + '- ' + txt)
    return out

def render_body(b):
    """A body shape becomes an optional ### header plus a bullet list."""
    ps=b['paras']
    head=None
    if ps and ps[0][0]==0 and HEADERS.match(ps[0][1]):
        head=ps[0][1].rstrip(': ').strip()
        ps=ps[1:]
    if not ps:
        return head, []
    base=min(l for l,_ in ps)
    return head, bullets(ps, base)

def esc_attr(s): return html.escape(s, quote=True)

def convert(src, outdir, iso, human, who):
    z, slides = parse(src)
    os.makedirs(os.path.join(outdir,'assets'), exist_ok=True)
    used=set()
    for s in slides:
        for p in s['pics']: used.add(p['media'])
    for m in sorted(used):
        data=z.read('ppt/media/'+m)
        open(os.path.join(outdir,'assets',m),'wb').write(data)

    deck_title = TITLES.get(iso, 'Weekly Update')
    out=[]
    # Quote every free-text value: a title like "Jacobian Regularization:
    # Preliminary Results" contains a second ": " and is not valid YAML bare.
    def q(v):
        return '"' + str(v).replace('\\', '\\\\').replace('"', '\\"') + '"'
    fm=['---',
        'theme: ./common/weekly_collab',
        f'title: {q(f"{deck_title} | {human}")}',
        'transition: fade',
        'layout: cover',
        f'date: {q(human)}']
    if who: fm.append(f'with: {q(who)}')
    fm.append('---')
    out.append('\n'.join(fm))
    cover=[f'\n# {deck_title}\n']
    out.append('\n'.join(cover))

    for si, s in enumerate(slides):
        # The deck's own title slide became the cover already.
        if si==0 and s.get('cover_ph') and not s['bodies'] and not s['pics']:
            continue
        title=s['title']
        bodies=s['bodies']; pics=s['pics']; labels=s['labels']
        notes=s['notes']; groups=s.get('groups',0)

        # -- classify -----------------------------------------------------
        left  = [b for b in bodies if b['g'] and b['g'][0] < SLIDE_W*0.45
                                   and b['g'][2] < SLIDE_W*0.6]
        right = [b for b in bodies if b['g'] and b['g'][0] >= SLIDE_W*0.45]
        two_col = len(bodies)==2 and len(left)==1 and len(right)==1
        figure_only = not bodies and pics
        side_figure = len(bodies)==1 and pics and bodies[0]['g'] \
                      and bodies[0]['g'][2] < SLIDE_W*0.62
        statement = not bodies and not pics

        head=[]
        if statement:
            head.append('---\nlayout: section\n---\n')
            head.append(f'## {title}\n' if title else '')
            out.append('\n'.join(head))
            if notes: out.append(fmt_notes(notes))
            continue

        if two_col:
            head.append('---\nlayout: two-cols\n---\n')
        elif figure_only:
            head.append('---\nlayout: figure\n---\n')
        else:
            head.append('---\n')

        chunk=list(head)
        if title: chunk.append(f'## {title}\n')

        if two_col:
            for marker, col in (('::left::', left[0]), ('::right::', right[0])):
                h, bs = render_body(col)
                chunk.append(marker + '\n')
                if h: chunk.append(f'### {h}\n')
                if bs: chunk.append('\n'.join(bs) + '\n')
                else: chunk.append('<span class="wc-muted">*(nothing)*</span>\n')
        elif figure_only:
            chunk.append('::figure::\n')
            chunk.append(figure_html(pics, labels, title or ''))
        elif side_figure:
            h, bs = render_body(bodies[0])
            text_right = bodies[0]['g'] and bodies[0]['g'][0] >= SLIDE_W*0.45
            textcol=['<div class="wc-col">\n']
            if h: textcol.append(f'### {h}\n')
            textcol.append('\n'.join(bs) + '\n')
            textcol.append('</div>\n')
            figcol=['<div class="wc-col wc-figure">\n',
                    figure_html(pics, labels, title or ''),
                    '</div>\n']
            chunk.append('<div class="wc-cols" style="grid-template-columns: 1fr 1fr">\n')
            chunk += (figcol + textcol) if text_right else (textcol + figcol)
            chunk.append('</div>\n')
        else:
            for b in bodies:
                h, bs = render_body(b)
                if h: chunk.append(f'### {h}\n')
                if bs: chunk.append('\n'.join(bs) + '\n')
            if pics:
                chunk.append(figure_html(pics, labels, title or ''))

        if groups:
            chunk.append(f'<!-- The original slide also carried {groups} grouped '
                         'drawing(s) (a hand-drawn timeline); not carried over. -->\n')
        out.append('\n'.join(chunk))
        if notes: out.append(fmt_notes(notes))

    text='\n'.join(out)
    text=re.sub(r'\n{3,}','\n\n',text)
    open(os.path.join(outdir,'slides.md'),'w',encoding='utf-8').write(text.rstrip()+'\n')
    return len(slides), sorted(used)

def attach_labels(pics, labels):
    """Give every stray text label to the picture it sits closest to, so a
    legend swatch or a 'zdim: 16' annotation stays with its own plot."""
    for p in pics:
        p['caps']=[]
    loose=[]
    for l in labels:
        if not l['g'] or not pics:
            loose.append(l); continue
        lx,ly,lw,lh=l['g']
        cx,cy=lx+lw/2, ly+lh/2
        def d(p):
            x,y,w,h=p['g']
            dx=max(x-cx, 0, cx-(x+w))
            dy=max(y-cy, 0, cy-(y+h))
            dist=(dx*dx+dy*dy)**0.5
            # A caption in these decks labels the artwork beneath it, so a
            # picture that ends above the label is a much weaker candidate.
            if y+h <= ly + 0.02:
                dist += 1.0
            return dist
        near=min(pics, key=d)
        (near['caps'] if d(near) < 1.2 else loose).append(l)
    return loose


def columnize(pics):
    """Group pictures into visual columns by x-overlap, ordered left to right
    and, within a column, top to bottom. Reproduces rows, stacks and grids."""
    cols=[]
    for p in sorted(pics, key=lambda q: q['g'][0] if q['g'] else 0):
        x,_,w,_ = p['g'] if p['g'] else (0,0,1,0)
        placed=False
        for c in cols:
            cx0=min(q['g'][0] for q in c); cx1=max(q['g'][0]+q['g'][2] for q in c)
            overlap=min(cx1,x+w)-max(cx0,x)
            if overlap > 0.55*min(w, cx1-cx0):
                c.append(p); placed=True; break
        if not placed:
            cols.append([p])
    for c in cols:
        c.sort(key=lambda q: q['g'][1] if q['g'] else 0)
    return cols


def img_block(p, indent='  ', context=''):
    caps=[c['text'] for c in p.get('caps',[])]
    alt=' · '.join(caps) if caps else context
    out=[f'{indent}<figure>',
         f'{indent}  <img src="/assets/{p["media"]}" alt="{esc_attr(alt)}" />']
    if caps:
        out.append(f'{indent}  <figcaption>' + ' · '.join(caps) + '</figcaption>')
    out.append(f'{indent}</figure>')
    return '\n'.join(out)


def figure_html(pics, labels, context=''):
    """One picture, a row, a stack, or a grid — sized in proportion to how wide
    each picture was on the original slide."""
    attach_labels(pics, labels)
    cols=columnize(pics)
    if len(cols)==1 and len(cols[0])==1:
        return img_block(cols[0][0], indent='', context=context) + '\n'
    parts=[]
    for c in cols:
        w=max(q['g'][2] for q in c if q['g']) if any(q['g'] for q in c) else 1
        inner='\n'.join(img_block(q, indent='    ', context=context) for q in c)
        parts.append(f'  <div class="wc-figure-col" style="flex: {w:.2f} 1 0">\n'
                     f'{inner}\n  </div>')
    return '<div class="wc-figure-row">\n' + '\n'.join(parts) + '\n</div>\n'


def fmt_notes(notes):
    body='\n'.join(l for l in notes.split('\n') if l.strip())
    # "<Aside>: ..." is how these notes flag a point to raise out loud; as a
    # literal tag it would either vanish or be parsed as a component.
    body=re.sub(r'(?i)&lt;aside&gt;\s*:?', '**Aside:**', body)
    body=re.sub(r'(?i)<aside>\s*:?', '**Aside:**', body)
    body=body.replace('<','&lt;').replace('>','&gt;')
    body=body.replace('&lt;strong&gt;','').replace('&lt;/strong&gt;','')
    return '<!--\n'+body+'\n-->\n'

if __name__=='__main__':
    src_dir=sys.argv[1]; root=sys.argv[2]
    total=0
    for fn,(iso,human,who) in sorted(DECKS.items(), key=lambda kv: kv[1][0]):
        src=os.path.join(src_dir,fn)
        out=os.path.join(root, OUT_PREFIX, iso)
        os.makedirs(out,exist_ok=True)
        n,media=convert(src,out,iso,human,who)
        total+=n
        print(f'{iso}  {n:>2} slides  {len(media)} images  <- {fn}')
    print('total slides:',total)

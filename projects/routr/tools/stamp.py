#!/usr/bin/env python3
"""Stamp Routr's asset URLs with content hashes so browsers never mix old and new files.

There is no bundler, so modules import each other by plain relative paths ("./App.js").
index.html carries an import map that redirects every module path to "<path>?v=<hash>";
the browser applies it to all imports, so a changed file gets a new URL and an unchanged
one stays cached. The stylesheet and the entry script get the same treatment directly.

Run after changing any file under css/ or js/:  python3 tools/stamp.py
"""
import hashlib, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'


def ver(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()[:10]


def main():
    html = INDEX.read_text()
    modules = sorted(p for p in (ROOT / 'js').rglob('*.js'))
    imports = {f'./{p.relative_to(ROOT).as_posix()}': f'./{p.relative_to(ROOT).as_posix()}?v={ver(p)}' for p in modules}
    block = '<script type="importmap">\n' + json.dumps({'imports': imports}, indent=1) + '\n</script>'
    html, n = re.subn(r'<script type="importmap">.*?</script>', lambda m: block, html, flags=re.S)
    assert n == 1, 'index.html needs one <script type="importmap"> block'
    html, n = re.subn(r'href="css/app\.css(\?v=\w+)?"', f'href="css/app.css?v={ver(ROOT / "css/app.css")}"', html)
    assert n == 1, 'stylesheet link not found'
    html, n = re.subn(r'src="js/main\.js(\?v=\w+)?"', f'src="js/main.js?v={ver(ROOT / "js/main.js")}"', html)
    assert n == 1, 'entry script not found'
    INDEX.write_text(html)
    print(f'stamped {len(imports)} modules + css')


if __name__ == '__main__':
    main()

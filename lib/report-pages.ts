/**
 * A4 report pagination shared by the on-screen pages and the print / PDF document.
 *
 * The report is described by a hidden "source" (see buildReportSourceHtml in print-helper):
 *   [data-rn="page"]         one empty A4 page: letterhead chrome + content box + footer slot
 *   [data-rn="foot-normal"]  footer of every page but the last (QR code + "n of N pages")
 *   [data-rn="foot-last"]    footer of the last page (QR + doctor block + "N of N pages")
 *   [data-rn="flow"]         the report body as a flat list of blocks
 * rnPaginate() clones the page shell as many times as needed and moves the blocks into the
 * content boxes, measuring as it goes: text paragraphs ([data-split]) are split between lines,
 * headings ([data-kwn]) are kept with the block after them, everything else moves whole.
 * Nothing is ever laid out under the letterhead or the footer: the content box is what is left
 * of the page once those are placed. Page numbers are filled in once the page count is known.
 *
 * The function only uses the DOM of the elements it is given (no globals, no instanceof),
 * so the app can run it on the print iframe's document as well as on its own.
 */

/** Page structure; shared by the screen pages and the print document. */
export const REPORT_PAGES_CSS = `
.rn-page { position: relative; width: 210mm; height: 297mm; overflow: hidden; background: #fff; box-sizing: border-box; }
.rn-page *, .rn-page *::before, .rn-page *::after { box-sizing: border-box; margin: 0; padding: 0; }
.rn-page img, .rn-page svg { display: block; }
.rn-page .rn-page-bg { position: absolute; top: 0; left: 0; width: 210mm; height: 297mm; max-width: none; object-fit: fill; z-index: 0; pointer-events: none; }
.rn-page .rn-page-crop { position: absolute; top: 0; left: 0; width: 210mm; height: 42mm; overflow: hidden; z-index: 0; }
.rn-page .rn-page-crop img { position: absolute; top: 0; left: 0; width: 210mm; height: 297mm; max-width: none; object-fit: fill; }
.rn-page .rn-page-lhfoot { position: absolute; bottom: 0; left: 0; width: 210mm; height: 27mm; overflow: hidden; z-index: 0; }
.rn-page .rn-page-lhfoot img { position: absolute; bottom: 0; left: 0; width: 210mm; height: 297mm; max-width: none; object-fit: fill; }
.rn-page .rn-page-inner { position: absolute; z-index: 1; display: flex; flex-direction: column; }
.rn-page .rn-page-inner > .letterhead { flex: none; }
.rn-page .rn-page-content { flex: 1 1 auto; min-height: 0; overflow: hidden; display: flow-root; }
.rn-page .rn-page-foot { flex: none; }
.rn-sheet .rn-first { margin-top: 0 !important; }
.rn-sheet .rn-split-head { margin-bottom: 0 !important; }
.rn-sheet p.clinical-body { margin-bottom: 12px; }
.rn-sheet .rn-foot { font-family: system-ui, sans-serif; color: #444; }
.rn-sheet .rn-foot-normal { padding-top: 8px; }
.rn-sheet .rn-foot-row, .rn-sheet .rn-foot-last .foot { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 8px; font-family: system-ui, sans-serif; font-size: 8pt; color: #555; }
.rn-sheet .rn-foot-row { border-top: 1px solid #999; padding-top: 4px; }
.rn-sheet .rn-foot-row > :last-child, .rn-sheet .rn-foot-last .foot > :last-child { justify-self: end; text-align: right; }
.rn-sheet .rn-foot-row > :first-child, .rn-sheet .rn-foot-last .foot > :first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rn-sheet .rn-pageno { font-family: system-ui, sans-serif; font-size: 9pt; font-weight: 600; color: #222; white-space: nowrap; text-align: center; }
.rn-sheet .rn-foot-qr { display: flex; align-items: center; gap: 6px; color: #444; text-decoration: none; font-size: 7pt; line-height: 1.25; text-align: right; }
.rn-sheet .rn-foot-qr svg { width: 18mm; height: 18mm; flex: none; }
.rn-sheet .sig-qr { color: #444; text-decoration: none; }
.rn-sheet .rn-foot-last.sig-block { margin-top: 18px; }
.rn-page.rn-compact h2.study-title { margin: 8px 0 5px; }
.rn-page.rn-compact h3.sec { margin: 5px 0 2px; }
.rn-page.rn-compact p.body { margin-bottom: 4px; }
.rn-page.rn-compact .demo { margin-bottom: 8px; }
.rn-page.rn-compact .demo td { padding: 4px 7px; }
.rn-page.rn-compact .rn-foot-last.sig-block { margin-top: 10px; }
.rn-page.rn-compact .disclaimer { margin-top: 8px; padding-top: 5px; }
`;

/** Pages stacked on screen (scaled by the caller). */
export const REPORT_PAGES_SCREEN_CSS = `
.rn-pages { display: flex; flex-direction: column; gap: 8mm; width: 210mm; }
.rn-pages .rn-page { box-shadow: 0 10px 30px rgba(15, 23, 42, 0.28); flex: none; }
`;

/** Gap between stacked pages on screen, in mm (keep in sync with REPORT_PAGES_SCREEN_CSS). */
export const SCREEN_PAGE_GAP_MM = 8;

/**
 * Lay the report described by `src` out into A4 pages appended to `out` (which is emptied).
 * `out` must be laid out (not display:none). Returns the number of pages.
 */
export function rnPaginate(src: HTMLElement, out: HTMLElement): number {
  var doc = out.ownerDocument as Document;
  var pageTpl = src.querySelector('[data-rn="page"]') as HTMLElement;
  var footNormal = src.querySelector('[data-rn="foot-normal"]') as HTMLElement;
  var footLast = src.querySelector('[data-rn="foot-last"]') as HTMLElement;
  var flow = src.querySelector('[data-rn="flow"]') as HTMLElement;
  var EPS = 0.5;
  while (out.firstChild) out.removeChild(out.firstChild);
  if (!pageTpl || !footNormal || !footLast || !flow) return 0;

  function contentOf(page: HTMLElement): HTMLElement {
    return page.querySelector('[data-rn-content]') as HTMLElement;
  }
  function setFoot(page: HTMLElement, last: boolean) {
    var slot = page.querySelector('[data-rn-foot]') as HTMLElement;
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    var f = (last ? footLast : footNormal).cloneNode(true) as HTMLElement;
    f.removeAttribute('data-rn');
    slot.appendChild(f);
    page.setAttribute('data-last', last ? '1' : '0');
  }
  function newPage(last: boolean): HTMLElement {
    var p = pageTpl.cloneNode(true) as HTMLElement;
    p.removeAttribute('data-rn');
    out.appendChild(p);
    setFoot(p, last);
    return p;
  }
  function limitOf(c: HTMLElement): number {
    var r = c.getBoundingClientRect();
    return r.top + r.height;
  }
  function fits(c: HTMLElement): boolean {
    var last = c.lastElementChild as HTMLElement | null;
    if (!last) return true;
    return last.getBoundingClientRect().bottom <= limitOf(c) + EPS;
  }
  function markFirst(c: HTMLElement) {
    var kids = c.children;
    for (var i = 0; i < kids.length; i++) {
      if (i === 0) kids[i].classList.add('rn-first');
      else kids[i].classList.remove('rn-first');
    }
  }
  function textNodes(el: Node): Text[] {
    var w = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    var a: Text[] = [];
    var n = w.nextNode();
    while (n) {
      a.push(n as Text);
      n = w.nextNode();
    }
    return a;
  }
  // Text position -> (text node, offset)
  function locate(nodes: Text[], i: number): { node: Text; off: number } {
    var acc = 0;
    for (var j = 0; j < nodes.length; j++) {
      var len = nodes[j].data.length;
      if (i <= acc + len && (i < acc + len || j === nodes.length - 1)) return { node: nodes[j], off: i - acc };
      acc += len;
    }
    var lastNode = nodes[nodes.length - 1];
    return { node: lastNode, off: lastNode.data.length };
  }
  // Bottom edge of character i (null when it has no box, e.g. some line breaks)
  function charBottom(nodes: Text[], i: number): number | null {
    var p = locate(nodes, i);
    if (p.off >= p.node.data.length) return null;
    var r = doc.createRange();
    r.setStart(p.node, p.off);
    r.setEnd(p.node, p.off + 1);
    var rects = r.getClientRects();
    if (!rects.length) return null;
    var b = rects[0].bottom;
    for (var k = 1; k < rects.length; k++) if (rects[k].bottom > b) b = rects[k].bottom;
    return b;
  }
  // Does every character before position k end above `lim`?
  function prefixFits(nodes: Text[], k: number, lim: number): boolean {
    for (var i = k - 1; i >= 0 && i >= k - 4; i--) {
      var b = charBottom(nodes, i);
      if (b !== null) return b <= lim;
    }
    return true;
  }
  function sliceEl(el: HTMLElement, nodes: Text[], a: number, b: number): HTMLElement {
    var r = doc.createRange();
    var s = locate(nodes, a);
    var e = locate(nodes, b);
    r.setStart(s.node, s.off);
    r.setEnd(e.node, e.off);
    var c = el.cloneNode(false) as HTMLElement;
    c.appendChild(r.cloneContents());
    return c;
  }
  // Split a text block so its head ends on the current page; null when not even a line fits.
  function split(el: HTMLElement, c: HTMLElement): HTMLElement[] | null {
    var nodes = textNodes(el);
    var total = 0;
    for (var j = 0; j < nodes.length; j++) total += nodes[j].data.length;
    if (total < 2) return null;
    var base = parseInt(el.getAttribute('data-s') || '0', 10) || 0;
    var lim = limitOf(c);
    for (var attempt = 0; attempt < 8; attempt++) {
      var lo = 0;
      var hi = total;
      while (lo < hi) {
        var mid = Math.ceil((lo + hi) / 2);
        if (prefixFits(nodes, mid, lim)) lo = mid;
        else hi = mid - 1;
      }
      var k = lo;
      if (k <= 0) return null;
      if (k >= total) k = total - 1;
      var head = sliceEl(el, nodes, 0, k);
      var tail = sliceEl(el, nodes, k, total);
      var hadHead = el.classList.contains('rn-split-head');
      head.classList.add('rn-split-head');
      tail.classList.add('rn-split-tail');
      tail.classList.remove('rn-first');
      if (!hadHead) tail.classList.remove('rn-split-head');
      head.setAttribute('data-s', String(base));
      head.setAttribute('data-e', String(base + k));
      tail.setAttribute('data-s', String(base + k));
      c.replaceChild(head, el);
      if (fits(c)) {
        c.replaceChild(el, head);
        return [head, tail];
      }
      var over = head.getBoundingClientRect().bottom - limitOf(c);
      c.replaceChild(el, head);
      lim -= Math.max(1, over);
    }
    return null;
  }
  function fill(queue: HTMLElement[], last: boolean, pages: HTMLElement[]) {
    var page = newPage(last);
    pages.push(page);
    var c = contentOf(page);
    var guard = 0;
    while (queue.length && guard++ < 5000) {
      var el = queue.shift() as HTMLElement;
      el.classList.remove('rn-first');
      if (!c.firstElementChild) el.classList.add('rn-first');
      c.appendChild(el);
      if (fits(c)) continue;
      var moved: HTMLElement[] = [];
      var placed = false;
      if (el.hasAttribute('data-split')) {
        var parts = split(el, c);
        if (parts) {
          c.replaceChild(parts[0], el);
          moved.push(parts[1]);
          placed = true;
        }
      }
      if (!placed) {
        // Taller than a whole page and cannot be split: leave it (it is clipped, never overlapped)
        if (c.firstElementChild === el) continue;
        c.removeChild(el);
        moved.push(el);
      }
      // Keep headings with what follows them
      while (c.lastElementChild && c.lastElementChild !== c.firstElementChild && c.lastElementChild.hasAttribute('data-kwn')) {
        moved.unshift(c.removeChild(c.lastElementChild) as HTMLElement);
      }
      queue.unshift.apply(queue, moved);
      page = newPage(last);
      pages.push(page);
      c = contentOf(page);
    }
  }

  var blocks: HTMLElement[] = [];
  var kids = flow.children;
  for (var i = 0; i < kids.length; i++) {
    var b = kids[i].cloneNode(true) as HTMLElement;
    if (b.hasAttribute('data-split')) {
      b.setAttribute('data-s', '0');
      b.setAttribute('data-e', String((b.textContent || '').length));
    }
    blocks.push(b);
  }

  var pages: HTMLElement[] = [];
  fill(blocks, false, pages);
  // The last page carries the doctor block: if its content does not fit above it, reflow
  // that page's content onto pages that all reserve room for the doctor block.
  var lastPage = pages[pages.length - 1];
  setFoot(lastPage, true);
  if (!fits(contentOf(lastPage))) {
    var lc = contentOf(lastPage);
    var rest: HTMLElement[] = [];
    while (lc.firstElementChild) rest.push(lc.removeChild(lc.firstElementChild) as HTMLElement);
    out.removeChild(lastPage);
    pages.pop();
    var from = pages.length;
    fill(rest, true, pages);
    for (var q = from; q < pages.length - 1; q++) setFoot(pages[q], false);
  }
  for (var p = 0; p < pages.length; p++) {
    markFirst(contentOf(pages[p]));
    pages[p].setAttribute('data-page', String(p + 1));
    var nums = pages[p].querySelectorAll('[data-rn-pageno]');
    for (var n = 0; n < nums.length; n++) nums[n].textContent = p + 1 + ' of ' + pages.length + ' pages';
  }
  return pages.length;
}

/** A detached, laid-out but invisible host for measuring (unscaled, A4 wide). */
export function createMeasureHost(doc: Document, css: string): { host: HTMLElement; src: HTMLElement; out: HTMLElement } {
  var host = doc.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:210mm;visibility:hidden;pointer-events:none;z-index:-1;';
  var style = doc.createElement('style');
  style.textContent = css;
  var src = doc.createElement('div');
  src.style.display = 'none';
  var out = doc.createElement('div');
  host.appendChild(style);
  host.appendChild(src);
  host.appendChild(out);
  doc.body.appendChild(host);
  return { host: host, src: src, out: out };
}

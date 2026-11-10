"use strict";

(function() {
  if (typeof window === "undefined") return;
  const SHAPES = {
    1569: [ 65152, 65152, 65152, 65152 ],
    1570: [ 65153, 65153, 65154, 65154 ],
    1571: [ 65155, 65155, 65156, 65156 ],
    1572: [ 65157, 65157, 65158, 65158 ],
    1573: [ 65159, 65159, 65160, 65160 ],
    1574: [ 65161, 65163, 65164, 65162 ],
    1575: [ 65165, 65165, 65166, 65166 ],
    1576: [ 65167, 65169, 65170, 65168 ],
    1577: [ 65171, 65171, 65172, 65172 ],
    1578: [ 65173, 65175, 65176, 65174 ],
    1579: [ 65177, 65179, 65180, 65178 ],
    1580: [ 65181, 65183, 65184, 65182 ],
    1581: [ 65185, 65187, 65188, 65186 ],
    1582: [ 65189, 65191, 65192, 65190 ],
    1583: [ 65193, 65193, 65194, 65194 ],
    1584: [ 65195, 65195, 65196, 65196 ],
    1585: [ 65197, 65197, 65198, 65198 ],
    1586: [ 65199, 65199, 65200, 65200 ],
    1587: [ 65201, 65203, 65204, 65202 ],
    1588: [ 65205, 65207, 65208, 65206 ],
    1589: [ 65209, 65211, 65212, 65210 ],
    1590: [ 65213, 65215, 65216, 65214 ],
    1591: [ 65217, 65219, 65220, 65218 ],
    1592: [ 65221, 65223, 65224, 65222 ],
    1593: [ 65225, 65227, 65228, 65226 ],
    1594: [ 65229, 65231, 65232, 65230 ],
    1601: [ 65233, 65235, 65236, 65234 ],
    1602: [ 65237, 65239, 65240, 65238 ],
    1603: [ 65241, 65243, 65244, 65242 ],
    1604: [ 65245, 65247, 65248, 65246 ],
    1605: [ 65249, 65251, 65252, 65250 ],
    1606: [ 65253, 65255, 65256, 65254 ],
    1607: [ 65257, 65259, 65260, 65258 ],
    1608: [ 65261, 65261, 65262, 65262 ],
    1609: [ 65263, 65263, 65264, 65264 ],
    1610: [ 65265, 65267, 65268, 65266 ],
    1649: [ 64336, 64336, 64337, 64337 ]
  };
  const NON_CONNECTING = new Set([ 1569, 1570, 1571, 1573, 1575, 1577, 1583, 1584, 1585, 1586, 1608, 1649 ]);
  function isArabic(cp) {
    return cp >= 1536 && cp <= 1791 || cp >= 1872 && cp <= 1919 || cp >= 64336 && cp <= 65023 || cp >= 65136 && cp <= 65279;
  }
  function isLetter(cp) {
    return SHAPES.hasOwnProperty(cp);
  }
  function canConnectAfter(cp) {
    return isLetter(cp) && !NON_CONNECTING.has(cp);
  }
  function shapeArabicWord(text) {
    const codes = Array.from(text).map(c => c.codePointAt(0));
    const result = [];
    const n = codes.length;
    for (let i = 0; i < n; i++) {
      const cp = codes[i];
      if (!isLetter(cp)) {
        result.push(cp);
        continue;
      }
      const prev = i > 0 ? codes[i - 1] : null;
      const next = i < n - 1 ? codes[i + 1] : null;
      const hasPrev = prev !== null && isLetter(prev) && canConnectAfter(prev);
      const hasNext = next !== null && isLetter(next);
      if (cp === 1604 && next !== null) {
        let lig = null;
        if (next === 1570) lig = hasPrev ? 65270 : 65269; else if (next === 1571) lig = hasPrev ? 65272 : 65271; else if (next === 1573) lig = hasPrev ? 65274 : 65273; else if (next === 1575) lig = hasPrev ? 65276 : 65275;
        if (lig !== null) {
          result.push(lig);
          i++;
          continue;
        }
      }
      const shapes = SHAPES[cp];
      let form;
      if (hasPrev && hasNext) form = shapes[2]; else if (hasPrev && !hasNext) form = shapes[3]; else if (!hasPrev && hasNext) form = shapes[1]; else form = shapes[0];
      result.push(form);
    }
    return result.map(cp => String.fromCodePoint(cp)).join("");
  }
  function reverseSegments(text) {
    const chars = Array.from(text);
    const segments = [];
    let current = {
      rtl: null,
      text: ""
    };
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const cp = ch.codePointAt(0);
      const isArab = isArabic(cp);
      const isLtrChar = cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp >= 1632 && cp <= 1641;
      let rtl;
      if (isArab) rtl = true; else if (isLtrChar) rtl = false; else rtl = current.rtl;
      if (current.rtl === null) current.rtl = rtl !== null ? rtl : true;
      if (rtl !== null && rtl !== current.rtl) {
        segments.push(current);
        current = {
          rtl: rtl,
          text: ch
        };
      } else current.text += ch;
    }
    if (current.text) segments.push(current);
    const out = [];
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (seg.rtl) out.push(Array.from(seg.text).reverse().join("")); else out.push(seg.text);
    }
    return out.join("");
  }
  function processArabicText(text) {
    if (!text || typeof text !== "string") return text;
    let hasArabic = false;
    for (let i = 0; i < text.length; i++) if (isArabic(text.charCodeAt(i))) {
      hasArabic = true;
      break;
    }
    if (!hasArabic) return text;
    return text.split("\n").map(line => {
      const words = line.split(/(\s+)/);
      const shaped = words.map(w => {
        let hasArab = false;
        for (let i = 0; i < w.length; i++) if (isArabic(w.charCodeAt(i))) {
          hasArab = true;
          break;
        }
        return hasArab ? shapeArabicWord(w) : w;
      }).join("");
      return reverseSegments(shaped);
    }).join("\n");
  }
  function processTableForRTL(tbl) {
    if (!tbl || !tbl.body || !tbl.body.length) return tbl;
    const reversedBody = tbl.body.map(row => row.slice().reverse());
    const reversedWidths = tbl.widths ? tbl.widths.slice().reverse() : tbl.widths;
    return {
      ...tbl,
      body: reversedBody,
      widths: reversedWidths
    };
  }
  function processForRTL(docDef) {
    const clone = JSON.parse(JSON.stringify(docDef));
    function walk(node) {
      if (node == null) return node;
      if (typeof node === "string") return processArabicText(node);
      if (Array.isArray(node)) return node.map(walk);
      if (typeof node === "object") {
        if (node.text !== void 0) if (typeof node.text === "string") node.text = processArabicText(node.text); else if (Array.isArray(node.text)) node.text = node.text.map(walk);
        if (node.table) {
          node.table = processTableForRTL(node.table);
          if (node.table.body) node.table.body = node.table.body.map(row => row.map(walk));
        }
        if (node.columns) node.columns = node.columns.slice().reverse().map(walk);
        if (node.stack) node.stack = node.stack.map(walk);
        if (node.ul) node.ul = node.ul.map(walk);
        if (node.ol) node.ol = node.ol.map(walk);
      }
      return node;
    }
    if (clone.content) clone.content = walk(clone.content);
    return clone;
  }
  window.PdfRTL = {
    processArabicText: processArabicText,
    processForRTL: processForRTL,
    shapeWord: shapeArabicWord,
    isArabic: isArabic
  };
})();
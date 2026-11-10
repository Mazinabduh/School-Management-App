"use strict";

var ArabicReshaper = function() {
  "use strict";
  var LETTERS_MAP = {
    1569: [ 65152, 65152, 65152, 65152 ],
    1570: [ 65153, 65154, 65153, 65154 ],
    1571: [ 65155, 65156, 65155, 65156 ],
    1572: [ 65157, 65158, 65157, 65158 ],
    1573: [ 65159, 65160, 65159, 65160 ],
    1574: [ 65161, 65162, 65163, 65164 ],
    1575: [ 65165, 65166, 65165, 65166 ],
    1576: [ 65167, 65168, 65169, 65170 ],
    1577: [ 65171, 65172, 65171, 65172 ],
    1578: [ 65173, 65174, 65175, 65176 ],
    1579: [ 65177, 65178, 65179, 65180 ],
    1580: [ 65181, 65182, 65183, 65184 ],
    1581: [ 65185, 65186, 65187, 65188 ],
    1582: [ 65189, 65190, 65191, 65192 ],
    1583: [ 65193, 65194, 65193, 65194 ],
    1584: [ 65195, 65196, 65195, 65196 ],
    1585: [ 65197, 65198, 65197, 65198 ],
    1586: [ 65199, 65200, 65199, 65200 ],
    1587: [ 65201, 65202, 65203, 65204 ],
    1588: [ 65205, 65206, 65207, 65208 ],
    1589: [ 65209, 65210, 65211, 65212 ],
    1590: [ 65213, 65214, 65215, 65216 ],
    1591: [ 65217, 65218, 65219, 65220 ],
    1592: [ 65221, 65222, 65223, 65224 ],
    1593: [ 65225, 65226, 65227, 65228 ],
    1594: [ 65229, 65230, 65231, 65232 ],
    1601: [ 65233, 65234, 65235, 65236 ],
    1602: [ 65237, 65238, 65239, 65240 ],
    1603: [ 65241, 65242, 65243, 65244 ],
    1604: [ 65245, 65246, 65247, 65248 ],
    1605: [ 65249, 65250, 65251, 65252 ],
    1606: [ 65253, 65254, 65255, 65256 ],
    1607: [ 65257, 65258, 65259, 65260 ],
    1608: [ 65261, 65262, 65261, 65262 ],
    1609: [ 65263, 65264, 65263, 65264 ],
    1610: [ 65265, 65266, 65267, 65268 ],
    1647: [ 64488, 64489, 64488, 64489 ],
    1697: [ 64342, 64343, 64344, 64345 ],
    1711: [ 64402, 64403, 64404, 64405 ]
  };
  var NON_CONNECTING = new Set([ 1569, 1570, 1571, 1572, 1573, 1575, 1583, 1584, 1585, 1586, 1608, 1609, 1647 ]);
  var TASHKEEL = new Set([ 1611, 1612, 1613, 1614, 1615, 1616, 1617, 1618, 1619, 1620, 1621, 1648 ]);
  var LAM_ALEF = new Set([ 65269, 65270, 65271, 65272, 65273, 65274, 65275, 65276 ]);
  function isArabic(ch) {
    var code = ch.charCodeAt(0);
    return code >= 1536 && code <= 1791 || code >= 64336 && code <= 65023 || code >= 65136 && code <= 65279 || code >= 1872 && code <= 1919 || code >= 2208 && code <= 2303;
  }
  function isArabicLetter(ch) {
    var code = ch.charCodeAt(0);
    return LETTERS_MAP.hasOwnProperty(code);
  }
  function isTashkeel(ch) {
    return TASHKEEL.has(ch.charCodeAt(0));
  }
  function isNonConnecting(ch) {
    return NON_CONNECTING.has(ch.charCodeAt(0));
  }
  function isSpaceOrPunct(ch) {
    var code = ch.charCodeAt(0);
    return code <= 32 || code >= 8192 && code <= 8303 || ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  }
  function isDigit(ch) {
    var code = ch.charCodeAt(0);
    return code >= 48 && code <= 57 || code >= 1632 && code <= 1641 || code >= 1776 && code <= 1785;
  }
  function reshape(text) {
    if (!text || typeof text !== "string") return text || "";
    var result = [];
    var i = 0;
    var len = text.length;
    while (i < len) {
      var ch = text[i];
      var code = ch.charCodeAt(0);
      if (isTashkeel(ch)) {
        result.push(ch);
        i++;
        continue;
      }
      if (!LETTERS_MAP[code]) {
        result.push(ch);
        i++;
        continue;
      }
      var connectToPrev = false;
      var connectToNext = false;
      var prevIdx = i - 1;
      while (prevIdx >= 0 && isTashkeel(text[prevIdx])) prevIdx--;
      if (prevIdx >= 0) {
        var prevCh = text[prevIdx];
        var prevCode = prevCh.charCodeAt(0);
        if (LETTERS_MAP[prevCode] && !isNonConnecting(prevCh)) connectToPrev = true;
      }
      var nextIdx = i + 1;
      while (nextIdx < len && isTashkeel(text[nextIdx])) nextIdx++;
      if (nextIdx < len) {
        var nextCh = text[nextIdx];
        var nextCode = nextCh.charCodeAt(0);
        if (LETTERS_MAP[nextCode]) connectToNext = true;
      }
      var forms = LETTERS_MAP[code];
      var selectedForm;
      if (connectToPrev && connectToNext) selectedForm = forms[3]; else if (connectToPrev && !connectToNext) selectedForm = forms[1]; else if (!connectToPrev && connectToNext) selectedForm = forms[2]; else selectedForm = forms[0];
      result.push(String.fromCharCode(selectedForm));
      i++;
    }
    return result.join("");
  }
  function fixLamAlef(text) {
    if (!text) return text;
    var lamCode = 65247;
    var replacements = [ [ /ﮄﭺ/g, "ﻵ" ], [ /ﮄﮈ/g, "ﻷ" ], [ /ﮄﮇ/g, "ﻹ" ], [ /ﮄﺎ/g, "ﻻ" ] ];
    var result = text;
    for (var r = 0; r < replacements.length; r++) result = result.replace(replacements[r][0], replacements[r][1]);
    return result;
  }
  function reorderBiDi(text) {
    if (!text || typeof text !== "string") return text || "";
    var result = [];
    var i = 0;
    var len = text.length;
    while (i < len) {
      var ch = text[i];
      if (isDigit(ch) || ch === "." && i > 0 && isDigit(text[i - 1])) {
        var numStart = i;
        while (i < len && (isDigit(text[i]) || text[i] === "." || text[i] === "," || text[i] === "-")) i++;
        var numStr = text.substring(numStart, i);
        result.push(numStr);
        continue;
      }
      if (ch.charCodeAt(0) >= 33 && ch.charCodeAt(0) <= 126) {
        var latStart = i;
        while (i < len && text.charCodeAt(i) >= 33 && text.charCodeAt(i) <= 126) i++;
        result.push(text.substring(latStart, i));
        continue;
      }
      result.push(ch);
      i++;
    }
    return reverseForRTL(result.join(""));
  }
  function reverseForRTL(text) {
    var segments = [];
    var current = "";
    var currentType = "";
    var len = text.length;
    for (var i = 0; i < len; i++) {
      var ch = text[i];
      var code = ch.charCodeAt(0);
      var type = "other";
      if (isArabic(ch) || isTashkeel(ch)) type = "arabic"; else if (isDigit(ch) || ch === "." && i > 0 && i < len - 1 && isDigit(text[i - 1]) && isDigit(text[i + 1])) type = "number"; else if (code >= 65 && code <= 90 || code >= 97 && code <= 122) type = "latin"; else if (ch === " ") type = "space";
      if (type !== currentType && currentType !== "") {
        segments.push({
          text: current,
          type: currentType
        });
        current = ch;
        currentType = type;
      } else {
        current += ch;
        currentType = type;
      }
    }
    if (current) segments.push({
      text: current,
      type: currentType
    });
    segments.reverse();
    return segments.map(function(s) {
      return s.text;
    }).join("");
  }
  function processForPrint(text) {
    if (!text) return text || "";
    var reshaped = reshape(text);
    var withLigatures = fixLamAlef(reshaped);
    return withLigatures;
  }
  function reshapeLine(text) {
    if (!text) return text || "";
    var processed = processForPrint(text);
    var chars = processed.split("");
    chars.reverse();
    return chars.join("");
  }
  function processForPDF(text) {
    return processForPrint(text);
  }
  return {
    isArabic: isArabic,
    isArabicLetter: isArabicLetter,
    isTashkeel: isTashkeel,
    reshape: reshape,
    reorderBiDi: reorderBiDi,
    processForPrint: processForPrint,
    processForPDF: processForPDF,
    reshapeLine: reshapeLine,
    fixLamAlef: fixLamAlef,
    reverseForRTL: reverseForRTL
  };
}();

if (typeof window !== "undefined") window.ArabicReshaper = ArabicReshaper;
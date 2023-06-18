import $ from "https://deno.land/x/dax/mod.ts";

function kanaToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

function getFuriganaHTML(morpheme) {
  let html = "";
  const furiganas = getFuriganas(morpheme);
  if (furiganas) {
    furiganas.forEach((furigana) => {
      if (furigana[1]) {
        html += `<ruby>${furigana[0]}<rt>${furigana[1]}</rt></ruby>`;
      } else {
        html += `<span>${furigana[0]}</span>`;
      }
    });
  } else {
    html += `<span>${morpheme.surface}</span>`;
  }
  return html;
}

function getFuriganas(morpheme) {
  const reading = morpheme.reading;
  if (!reading) return undefined;
  const surface = morpheme.surface;
  const hiraSurface = kanaToHira(surface);
  const hiraReading = kanaToHira(reading);
  if (hiraSurface == hiraReading) return undefined;
  // 楽しい --> ([ぁ-ん+])しい --> (たの)しい --> ["たの"]
  // 行き来 --> ([ぁ-ん+])き([ぁ-ん]+) --> (い)き(き), --> ["い", "き"]
  const searchString = hiraSurface.replaceAll(/[一-龠々ヵヶ]+/g, "([ぁ-ん]+)");
  const furiganaRegexp = new RegExp(searchString);
  const furiganas = hiraReading.match(furiganaRegexp).slice(1);
  const map = new Map();
  const kanjis = surface.match(/([一-龠々ヵヶ]+)/g);
  kanjis.forEach((kanji, i) => {
    map.set(kanji, furiganas[i]);
  });
  const words = surface.split(/([一-龠々ヵヶ]+)/g).filter((s) => s != "");
  const result = words.map((word) => {
    const furigana = map.get(word);
    if (furigana) {
      return [word, furigana];
    } else {
      return [word, undefined];
    }
  });
  return result;
}

function cleanupMorphemes(morphemes) {
  const result = [];
  morphemes.forEach((morpheme) => {
    const newMorpheme = {
      surface: morpheme.surface,
      feature: morpheme.feature,
      reading: morpheme.reading,
    };
    result.push(newMorpheme);
  });
  return result;
}

function json2html(problems) {
  let html = "<ul>\n";
  problems.forEach((morphemes) => {
    let sentence = "";
    morphemes.forEach((morpheme) => {
      sentence += getFuriganaHTML(morpheme);
    });
    html += `  <li>${sentence}</li>\n`;
  });
  html += "</ul>";
  return html;
}

function countPPP(problems) {
  const result = {};
  problems.forEach((morphemes) => {
    const count = morphemes
      .filter((morpheme) => morpheme.feature == "助詞").length;
    if (count in result) {
      result[count] += 1;
    } else {
      result[count] = 1;
    }
  });
  console.log(result);
}

function filterProblems(problems) {
  return problems.filter((morphemes) => {
    const count = morphemes
      .filter((morpheme) => morpheme.feature == "助詞").length;
    if (count <= 1) return false;
    const ppps = morphemes.filter((morpheme) => {
      return (morpheme.feature == "助詞") ? true : false;
    });
    const set = new Set();
    ppps.forEach((morpheme) => set.add(morpheme.surface));
    return (set.size != 1) ? true : false;
  });
}

// https://github.com/sera1mu/deno_mecab
// deno_mecab style Mecab + IPADic parser, but 30x faster
async function parseMecab(filepath) {
  const result = [];
  const stdout = await $`mecab ${filepath}`.text();
  stdout.slice(0, -4).split("\nEOS\n").forEach((sentence) => {
    const morphemes = [];
    sentence.replace(/\t/g, ",").split("\n").forEach((line) => {
      const cols = line.split(",");
      const morpheme = {
        surface: cols[0],
        feature: cols[1],
        featureDetails: [cols[2], cols[3], cols[4]],
        conjugationForms: [cols[5], cols[6]],
        originalForm: cols[7],
        reading: cols[8],
        pronunciation: cols[9],
      };
      morphemes.push(morpheme);
    });
    result.push(morphemes);
  });
  return result;
}

const result = await parseMecab("problems.lst");
const problems = result.map((morphemes) => {
  return cleanupMorphemes(morphemes);
});
countPPP(problems);
const filteredProblems = filterProblems(problems);
countPPP(filteredProblems);
const html = json2html(filteredProblems);
Deno.writeTextFileSync("problems.html", html);
const json = JSON.stringify(filteredProblems, null, "\t");
Deno.writeTextFileSync("src/problems.json", json);

// Stoichiometry balancer (simple brute-force integer method)
const parseFormula = (formula) => {
  const re = /([A-Z][a-z]?)(\d*)/g;
  const out = {};
  let m;
  while ((m = re.exec(formula)) !== null) {
    const e = m[1];
    const n = parseInt(m[2]||'1', 10);
    out[e] = (out[e]||0) + n;
  }
  return out;
};

const multiplyCounts = (counts, factor) => {
  const r = {};
  for (const k in counts) r[k] = counts[k]*factor;
  return r;
};
const addCounts = (a,b) => {
  const r = {...a};
  for (const k in b) r[k] = (r[k]||0) + b[k];
  return r;
};

const balance = (reaction) => {
  const sides = reaction.split('->');
  if (sides.length !== 2) return null;
  const left = sides[0].split('+').map(s=>s.trim());
  const right = sides[1].split('+').map(s=>s.trim());
  const maxCoeff = 10;
  const L = left.length, R = right.length;

  if (L>4 || R>4) return null;

  const combos = (arrLen) => {
    const res = [];
    const rec = (cur)=>{
      if (cur.length===arrLen){ res.push(cur.slice()); return; }
      for (let i=1;i<=maxCoeff;i++) { cur.push(i); rec(cur); cur.pop(); }
    };
    rec([]);
    return res;
  };

  const leftComb = combos(L);
  const rightComb = combos(R);

  const leftParsed = left.map(parseFormula);
  const rightParsed = right.map(parseFormula);
  for (const lc of leftComb) {
    const leftTotal = lc.reduce((acc,coef,i)=> addCounts(acc, multiplyCounts(leftParsed[i],coef)), {});
    for (const rc of rightComb) {
      const rightTotal = rc.reduce((acc,coef,i)=> addCounts(acc, multiplyCounts(rightParsed[i],coef)), {});
      const keys = new Set([...Object.keys(leftTotal), ...Object.keys(rightTotal)]);
      let equal = true;
      for (const k of keys) {
        if ((leftTotal[k]||0) !== (rightTotal[k]||0)) { equal=false; break; }
      }
      if (equal) {
        return {
          left: left.map((f,i)=> ({coef:lc[i], formula:f})),
          right: right.map((f,i)=> ({coef:rc[i], formula:f}))
        };
      }
    }
  }
  return null;
};

module.exports = { balance, parseFormula };

// Legacy WebKit (iOS 12 Safari) compatibility pass for Tailwind v4 output.
// Runs AFTER @tailwindcss/postcss. Modern browsers keep identical behaviour;
// old-only fallbacks are gated with @supports not (aspect-ratio: 1/1) (Safari < 15).
// Loaded at runtime (not bundled by Turbopack) because lightningcss is a native module.
let _transform;
function transform(opts) {
  if (!_transform) {
    const nodeModule = globalThis.process.getBuiltinModule("module");
    const req = nodeModule.createRequire(globalThis.process.cwd() + "/package.json");
    _transform = req(["lightning", "css"].join("")).transform;
  }
  return _transform(opts);
}

const OLD = "not (aspect-ratio: 1/1)";

function stripWhere(sel) {
  // :where(a) -> a  (nested parens handled for one level)
  let out = sel, prev;
  do { prev = out; out = out.replace(/:where\(((?:[^()]|\([^()]*\))*)\)/g, (_, inner) => inner.includes(",") ? `:-webkit-any(${inner})` : inner); } while (out !== prev);
  return out.replace(/:is\(((?:[^()]|\([^()]*\))*)\)/g, (_, inner) => inner.includes(",") ? `:-webkit-any(${inner})` : inner);
}

const splitVals = (v) => v.replace(/\)\s*(?=var\(|-?\d|calc\()/g, ") ").trim().split(/\s+(?![^(]*\))/).join(", ");

const legacySafari = () => ({
  postcssPlugin: "legacy-safari",
  OnceExit(root, { postcss }) {
    // 1) Flatten cascade layers (Safari < 15.4 drops @layer blocks entirely).
    root.walkAtRules("layer", (at) => { if (at.nodes) at.replaceWith(at.nodes); else at.remove(); });
    root.walkAtRules("property", (at) => at.remove());

    // 2) Lower CSS (oklch/color-mix/nesting/inset/etc.) for old targets.
    const css = root.toString();
    const res = transform({
      filename: "globals.css",
      code: Buffer.from(css),
      minify: false,
      errorRecovery: true,
      targets: { safari: 12 << 16, ios_saf: 12 << 16, chrome: 80 << 16, firefox: 78 << 16 },
    });
    const lowered = postcss.parse(res.code.toString());
    root.removeAll();
    root.append(lowered.nodes);

    const gate = postcss.atRule({ name: "supports", params: OLD });
    root.walkRules((rule) => {
      if (rule.parent && rule.parent.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
      const extra = [];
      // dvh/svh/lvh -> vh fallback placed before (harmless for modern).
      rule.walkDecls((d) => {
        if (/\d(d|s|l)v(h|w)\b/.test(d.value)) d.cloneBefore({ value: d.value.replace(/(\d)(d|s|l)v(h|w)\b/g, "$1v$3") });
        if (d.prop === "translate") extra.push(postcss.decl({ prop: "transform", value: `translate(${splitVals(d.value)})` }));
        if (d.prop === "scale") extra.push(postcss.decl({ prop: "transform", value: `scale(${splitVals(d.value)})` }));
        if (d.prop === "rotate") extra.push(postcss.decl({ prop: "transform", value: `rotate(${d.value})` }));
        if (d.prop === "backdrop-filter") d.cloneBefore({ prop: "-webkit-backdrop-filter" });
        if (d.prop === "user-select") d.cloneBefore({ prop: "-webkit-user-select" });
      });
      const sel = rule.selector;
      const legacySel = /:(where|is)\(/.test(sel) ? stripWhere(sel) : null;
      if (legacySel && legacySel !== sel) gate.append(rule.clone({ selector: legacySel }));
      if (extra.length) gate.append(postcss.rule({ selector: legacySel || sel, nodes: extra }));
      // Flex gap fallback (Safari < 14.1): margins on children of .flex/.inline-flex with gap utilities.
      const m = sel.match(/^\.(gap|gap-x|gap-y)-([\w.\\\[\]\/-]+)$/);
      if (m) {
        const gapDecl = rule.nodes.find((n) => n.type === "decl" && /gap$/.test(n.prop));
        if (gapDecl) {
          const v = gapDecl.value;
          const c = `.${m[1]}-${m[2]}`;
          if (m[1] !== "gap-y") gate.append(postcss.rule({ selector: `.flex${c}:not(.flex-col):not(.flex-wrap) > * + *, .inline-flex${c}:not(.flex-col) > * + *`, nodes: [postcss.decl({ prop: "margin-left", value: v })] }));
          if (m[1] !== "gap-x") gate.append(postcss.rule({ selector: `.flex-col${c} > * + *`, nodes: [postcss.decl({ prop: "margin-top", value: v })] }));
        }
      }
    });
    if (gate.nodes && gate.nodes.length) root.append(gate);
  },
});
legacySafari.postcss = true;
export default legacySafari;

// Reglas de pantalla de Biela que se revisan solas (DESIGN.md, «Reglas de
// Biela»): botones de una o dos palabras, sin punto medio en lo que se ve, y
// un solo fin de fila.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const raiz = new URL("..", import.meta.url).pathname;
// Las imágenes que se exportan conservan su formato de hoja de cálculo.
const EXENTOS = /(cuadre-export|reporte-luis)\.tsx$/;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return archivos(p);
    return /\.tsx$/.test(n) ? [p] : [];
  });
}
const pantallas = () =>
  ["app", "components"].flatMap((d) => archivos(join(raiz, d))).filter((f) => !EXENTOS.test(f) && !f.includes("/auth/vista/"));

// Las cifras y los signos no cuentan como palabra: «Abonar $ 50.000» son dos.
const palabras = (t: string) =>
  t
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !/^[·•…\-–+×:()$%0-9.,]+$/.test(w));

const BOTONES = new Set(["Button", "AlertDialogAction", "AlertDialogCancel", "DropdownMenuItem", "ToggleGroupItem", "TabsTrigger"]);
// confirmar: la acción de ConfirmDialog. texto: lo que dice Deslizar.
const PROPS = new Set(["confirmar"]);

/** Los textos fijos de una expresión, siguiendo ternarios y «a || b». */
function textos(e: ts.Node | undefined, out: string[] = []): string[] {
  if (!e) return out;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) out.push(e.text);
  else if (ts.isTemplateExpression(e)) out.push([e.head.text, ...e.templateSpans.map((s) => s.literal.text)].join(" "));
  else if (ts.isConditionalExpression(e)) {
    textos(e.whenTrue, out);
    textos(e.whenFalse, out);
  } else if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.BarBarToken || e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) {
    textos(e.left, out);
    textos(e.right, out);
  } else if (ts.isParenthesizedExpression(e)) textos(e.expression, out);
  return out;
}

test("botones y opciones de menú de una o dos palabras", () => {
  const largos: string[] = [];
  for (const f of pantallas()) {
    const src = readFileSync(f, "utf8");
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const anotar = (n: ts.Node, t: string) => {
      if (palabras(t).length > 2) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
        largos.push(`${relative(raiz, f)}:${line + 1}  «${t.replace(/\s+/g, " ").trim()}»`);
      }
    };
    const visitar = (n: ts.Node) => {
      if (ts.isJsxElement(n)) {
        const nombre = n.openingElement.tagName.getText(sf);
        if (BOTONES.has(nombre)) {
          const fijo = n.children
            .filter(ts.isJsxText)
            .map((c) => c.text)
            .join(" ");
          if (fijo.trim()) anotar(n, fijo);
          n.children.filter(ts.isJsxExpression).forEach((c) => textos(c.expression).forEach((t) => anotar(c, t)));
        }
      }
      const enDeslizar =
        ts.isJsxAttribute(n) && n.name.getText(sf) === "texto" && ts.isJsxSelfClosingElement(n.parent.parent) && n.parent.parent.tagName.getText(sf) === "Deslizar";
      if (ts.isJsxAttribute(n) && (PROPS.has(n.name.getText(sf)) || enDeslizar) && n.initializer) {
        const v = ts.isJsxExpression(n.initializer) ? n.initializer.expression : n.initializer;
        textos(v).forEach((t) => anotar(n, t));
      }
      ts.forEachChild(n, visitar);
    };
    visitar(sf);
  }
  assert.deepEqual(largos, []);
});

test("sin punto medio en lo que se ve (solo en el título de la pestaña del navegador)", () => {
  const malos: string[] = [];
  for (const f of pantallas()) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((l, i) => {
        const codigo = l.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "").replace(/\{\/\*.*?\*\/\}/g, "");
        if (codigo.includes("·") && !/title:|applicationName/.test(codigo)) malos.push(`${relative(raiz, f)}:${i + 1}  ${l.trim()}`);
      });
  }
  assert.deepEqual(malos, []);
});

test("un solo fin de fila: FlechaFila, no un CaretRight a mano", () => {
  const malos: string[] = [];
  for (const f of pantallas()) {
    // Las flechas de ir y venir entre días no son fin de fila.
    if (f.includes("components/ui/") || f.endsWith("date-nav.tsx")) continue;
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((l, i) => {
        if (/<CaretRight\b/.test(l)) malos.push(`${relative(raiz, f)}:${i + 1}  ${l.trim().slice(0, 100)}`);
      });
  }
  assert.deepEqual(malos, []);
});

const EXPRESSION_PATTERN = /^[\d\s.+\-*/]+$/;

function tokenize(expr: string): (number | string)[] | null {
  const tokens: (number | string)[] = [];
  let i = 0;

  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if ("+-*/".includes(c)) {
      const isUnaryMinus =
        c === "-" &&
        (tokens.length === 0 ||
          typeof tokens[tokens.length - 1] === "string");
      if (isUnaryMinus) {
        i++;
        let num = "-";
        while (i < expr.length && /[\d.]/.test(expr[i])) {
          num += expr[i++];
        }
        if (num === "-") return null;
        const value = parseFloat(num);
        if (Number.isNaN(value)) return null;
        tokens.push(value);
        continue;
      }

      if (c === "+" && tokens.length === 0) {
        i++;
        continue;
      }

      tokens.push(c);
      i++;
      continue;
    }

    if (/[\d.]/.test(c)) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i++];
      }
      const value = parseFloat(num);
      if (Number.isNaN(value)) return null;
      tokens.push(value);
      continue;
    }

    return null;
  }

  return tokens;
}

function evaluateTokens(tokens: (number | string)[]): number | null {
  if (tokens.length === 0) return null;
  if (tokens.length === 1 && typeof tokens[0] === "number") return tokens[0];

  const first = tokens[0];
  if (typeof first !== "number") return null;

  const afterMulDiv: (number | string)[] = [first];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const right = tokens[i + 1];
    if (typeof op !== "string" || typeof right !== "number") return null;

    if (op === "*" || op === "/") {
      const left = afterMulDiv.pop();
      if (typeof left !== "number") return null;
      if (op === "/" && right === 0) return null;
      afterMulDiv.push(op === "*" ? left * right : left / right);
    } else {
      afterMulDiv.push(op, right);
    }
  }

  let result = afterMulDiv[0];
  if (typeof result !== "number") return null;

  for (let i = 1; i < afterMulDiv.length; i += 2) {
    const op = afterMulDiv[i];
    const right = afterMulDiv[i + 1];
    if (typeof op !== "string" || typeof right !== "number") return null;
    if (op === "+") result += right;
    else if (op === "-") result -= right;
    else return null;
  }

  return result;
}

/** Returns null when the value is empty, invalid, or an incomplete expression. */
export function evaluateNumberExpression(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!EXPRESSION_PATTERN.test(trimmed)) return null;

  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) return null;

  const last = tokens[tokens.length - 1];
  if (typeof last === "string") return null;

  const result = evaluateTokens(tokens);
  if (result === null || !Number.isFinite(result)) return null;
  return result;
}

export function formatEvaluatedNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return String(rounded);
}

export function looksLikeNumberExpression(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/[+*/]/.test(trimmed)) return true;
  return /\d[\s]*-[\s]*[\d.]/.test(trimmed);
}

/** Parse a quantity field: evaluate expressions (e.g. `50+85`) or plain numbers. */
export function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const evaluated = evaluateNumberExpression(trimmed);
  if (evaluated !== null) return evaluated;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

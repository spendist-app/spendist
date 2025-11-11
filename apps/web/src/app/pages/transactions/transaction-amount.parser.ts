export function parseAmountInput(raw: string | number | null | undefined): number | null {
  if (raw == null) {
    return null;
  }

  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : null;
  }

  const normalized = normalizeExpression(raw);
  if (!normalized) {
    return null;
  }

  const value = evaluateAmountExpression(normalized);
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function normalizeExpression(raw: string): string {
  return raw
    .replace(/,/g, '.')
    .replace(/[×xX]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function evaluateAmountExpression(expression: string): number | null {
  const tokens = tokenizeExpression(expression);
  if (!tokens || tokens.length === 0) {
    return null;
  }

  const values: number[] = [];
  const operators: ('+' | '-' | '*' | '/' | '(')[] = [];

  const applyOperator = (): boolean => {
    const operator = operators.pop();
    if (!operator || operator === '(') {
      return false;
    }

    const right = values.pop();
    const left = values.pop();

    if (right == null || left == null) {
      return false;
    }

    switch (operator) {
      case '+':
        values.push(left + right);
        return true;
      case '-':
        values.push(left - right);
        return true;
      case '*':
        values.push(left * right);
        return true;
      case '/':
        if (right === 0) {
          return false;
        }
        values.push(left / right);
        return true;
      default:
        return false;
    }
  };

  for (const token of tokens) {
    if (typeof token === 'number') {
      values.push(token);
      continue;
    }

    if (token === '(') {
      operators.push(token);
      continue;
    }

    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        if (!applyOperator()) {
          return null;
        }
      }

      if (operators.pop() !== '(') {
        return null;
      }

      continue;
    }

    const precedence = token === '+' || token === '-' ? 1 : 2;
    while (
      operators.length > 0 &&
      operators[operators.length - 1] !== '(' &&
      getOperatorPrecedence(operators[operators.length - 1]) >= precedence
    ) {
      if (!applyOperator()) {
        return null;
      }
    }

    operators.push(token);
  }

  while (operators.length > 0) {
    if (operators[operators.length - 1] === '(') {
      return null;
    }
    if (!applyOperator()) {
      return null;
    }
  }

  return values.length === 1 ? values[0] : null;
}

function tokenizeExpression(
  expression: string,
): readonly (number | '+' | '-' | '*' | '/' | '(' | ')')[] | null {
  const tokens: (number | '+' | '-' | '*' | '/' | '(' | ')')[] = [];
  let index = 0;

  const isNumberChar = (char: string): boolean => /[0-9.]/.test(char);

  while (index < expression.length) {
    const char = expression[index];

    if (char === ' ') {
      index += 1;
      continue;
    }

    if (isNumberChar(char)) {
      let end = index + 1;
      while (end < expression.length && isNumberChar(expression[end])) {
        end += 1;
      }

      const segment = expression.slice(index, end);
      if (!/^\d*\.?\d+$/.test(segment)) {
        return null;
      }

      const value = Number.parseFloat(segment);
      if (!Number.isFinite(value)) {
        return null;
      }

      tokens.push(value);
      index = end;
      continue;
    }

    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
      tokens.push(char);
      index += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

function getOperatorPrecedence(operator: '+' | '-' | '*' | '/' | '('): number {
  switch (operator) {
    case '+':
    case '-':
      return 1;
    case '*':
    case '/':
      return 2;
    default:
      return 0;
  }
}

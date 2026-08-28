import React, { useState, useRef } from 'react';
import { AlertCircle, Copy, Plus, Trash2, Camera, Upload, Loader2 } from 'lucide-react';

// ============ COMPRESSÃO DE IMAGEM ============
// Funções serverless da Vercel limitam o corpo da requisição a 4.5MB — uma foto de
// celular em resolução original facilmente ultrapassa isso já em base64. Reduzimos
// dimensão/qualidade até caber com folga, tentando níveis cada vez mais agressivos.
const MAX_UPLOAD_BASE64_LENGTH = 3500000; // ~2.6MB de imagem, com folga sob o limite de 4.5MB

const drawToJpegBase64 = (img, maxDimension, quality) => {
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
};

const compressImageForUpload = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    const attempts = [[1600, 0.75], [1200, 0.6], [900, 0.5], [700, 0.4]];
    for (const [maxDimension, quality] of attempts) {
      const base64 = drawToJpegBase64(img, maxDimension, quality);
      if (base64.length <= MAX_UPLOAD_BASE64_LENGTH) {
        resolve({ base64, mediaType: 'image/jpeg' });
        return;
      }
    }
    reject(new Error('Não foi possível reduzir a imagem o suficiente — tenta uma foto menor'));
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Falha ao carregar a imagem'));
  };
  img.src = objectUrl;
});

// ============ ÁLGEBRA LINEAR ============
const linalg = {
  add: (a, b) => {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error(`Dimensões incompatíveis para soma: ${a.length}×${a[0].length} + ${b.length}×${b[0].length}`);
    }
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
  },
  subtract: (a, b) => {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error(`Dimensões incompatíveis para subtração: ${a.length}×${a[0].length} − ${b.length}×${b[0].length}`);
    }
    return a.map((row, i) => row.map((val, j) => val - b[i][j]));
  },
  multiply: (a, b) => {
    if (a[0].length !== b.length) {
      throw new Error(`Dimensões incompatíveis para multiplicação: ${a.length}×${a[0].length} × ${b.length}×${b[0].length} (colunas de A devem = linhas de B)`);
    }
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        result[i][j] = 0;
        for (let k = 0; k < b.length; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  },
  transpose: (a) => a[0].map((_, i) => a.map(row => row[i])),
  negate: (a) => a.map(row => row.map(v => -v)),
  identity: (n) => Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0)),
  power: (a, n) => {
    if (a.length !== a[0].length) throw new Error(`Potência requer matriz quadrada (recebida ${a.length}×${a[0].length})`);
    if (n === 0) return linalg.identity(a.length);
    let result = a;
    for (let i = 1; i < n; i++) result = linalg.multiply(result, a);
    return result;
  },
  determinant: (matrix) => {
    const n = matrix.length;
    if (n !== matrix[0].length) throw new Error('Determinante requer matriz quadrada');
    if (n === 1) return matrix[0][0];
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    let det = 0;
    for (let j = 0; j < n; j++) {
      det += Math.pow(-1, j) * matrix[0][j] * linalg.determinant(
        matrix.slice(1).map(row => row.filter((_, i) => i !== j))
      );
    }
    return det;
  },
  inverse: (a) => {
    const n = a.length;
    if (n !== a[0].length) throw new Error('Inversa requer matriz quadrada');
    const det = linalg.determinant(a);
    if (Math.abs(det) < 1e-10) throw new Error('Matriz singular — não invertível (det = 0)');
    const identity = linalg.identity(n);
    const aug = a.map((row, i) => [...row, ...identity[i]]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      const pivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
        }
      }
    }
    return aug.map(row => row.slice(n));
  },
  rank: (a) => {
    const m = JSON.parse(JSON.stringify(a));
    let rank = 0;
    const rows = m.length, cols = m[0].length;
    for (let col = 0; col < cols && rank < rows; col++) {
      let pivot = rank;
      for (let row = rank + 1; row < rows; row++) {
        if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
      }
      if (Math.abs(m[pivot][col]) < 1e-10) continue;
      [m[rank], m[pivot]] = [m[pivot], m[rank]];
      for (let j = col; j < cols; j++) m[rank][j] /= m[rank][col];
      for (let row = 0; row < rows; row++) {
        if (row !== rank) {
          const factor = m[row][col];
          for (let j = col; j < cols; j++) m[row][j] -= factor * m[rank][j];
        }
      }
      rank++;
    }
    return rank;
  },
  norm: (a) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < a[i].length; j++)
        sum += a[i][j] * a[i][j];
    return Math.sqrt(sum);
  }
};

// ============ PARSER DE EXPRESSÕES ============
// Sintaxe: A*B - B*A | C'*C | D^2 | (E+F)^2 | V*W' + X
// ' = transposta | ^n = potência | * = mult. matricial | + - = soma/sub | () agrupa

function tokenize(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      while (j < str.length && /[A-Za-z0-9_]/.test(str[j])) j++;
      tokens.push({ type: 'IDENT', value: str.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < str.length && /[0-9]/.test(str[j])) j++;
      tokens.push({ type: 'NUMBER', value: parseInt(str.slice(i, j), 10) });
      i = j;
      continue;
    }
    const map = { "'": 'QUOTE', '^': 'CARET', '*': 'STAR', '+': 'PLUS', '-': 'MINUS', '(': 'LPAREN', ')': 'RPAREN' };
    if (map[c]) { tokens.push({ type: map[c] }); i++; continue; }
    throw new Error(`Caractere inesperado na expressão: "${c}"`);
  }
  tokens.push({ type: 'EOF' });
  return tokens;
}

function parseExpression(str) {
  const tokens = tokenize(str);
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = (type) => {
    if (type && tokens[pos].type !== type) {
      throw new Error(`Esperado ${type}, encontrado ${tokens[pos].type}`);
    }
    return tokens[pos++];
  };

  function parsePrimary() {
    if (peek().type === 'LPAREN') {
      consume('LPAREN');
      const node = parseExpr();
      consume('RPAREN');
      return node;
    }
    if (peek().type === 'MINUS') {
      consume('MINUS');
      return { type: 'neg', child: parsePrimary() };
    }
    if (peek().type === 'IDENT') {
      const tok = consume('IDENT');
      return { type: 'ident', name: tok.value };
    }
    throw new Error(`Token inesperado: ${peek().type}`);
  }

  function parsePostfix() {
    let node = parsePrimary();
    while (peek().type === 'QUOTE' || peek().type === 'CARET') {
      if (peek().type === 'QUOTE') {
        consume('QUOTE');
        node = { type: 'transpose', child: node };
      } else {
        consume('CARET');
        const n = consume('NUMBER');
        node = { type: 'power', child: node, n: n.value };
      }
    }
    return node;
  }

  function parseTerm() {
    let node = parsePostfix();
    while (peek().type === 'STAR') {
      consume('STAR');
      node = { type: 'mul', left: node, right: parsePostfix() };
    }
    return node;
  }

  function parseExpr() {
    let node = parseTerm();
    while (peek().type === 'PLUS' || peek().type === 'MINUS') {
      const op = consume().type === 'PLUS' ? 'add' : 'sub';
      node = { type: op, left: node, right: parseTerm() };
    }
    return node;
  }

  const result = parseExpr();
  if (peek().type !== 'EOF') throw new Error('Expressão mal formada — sobrou conteúdo inesperado');
  return result;
}

// Reconstrói a notação da sub-expressão (pra rotular cada passo)
function astToString(node) {
  switch (node.type) {
    case 'ident': return node.name;
    case 'transpose': return `${astToString(node.child)}'`;
    case 'power': return `${astToString(node.child)}^${node.n}`;
    case 'neg': return `-${astToString(node.child)}`;
    case 'mul': return `${astToString(node.left)} · ${astToString(node.right)}`;
    case 'add': return `${astToString(node.left)} + ${astToString(node.right)}`;
    case 'sub': return `${astToString(node.left)} − ${astToString(node.right)}`;
    default: return '?';
  }
}

// Monta a conta célula a célula, do jeito que se escreveria resolvendo na mão
function buildWork(type, left, right) {
  if (type === 'mul') {
    return left.map((row) =>
      right[0].map((_, j) => row.map((v, k) => `${v}×${right[k][j]}`).join(' + '))
    );
  }
  if (type === 'add') {
    return left.map((row, i) => row.map((v, j) => `${v} + ${right[i][j]}`));
  }
  if (type === 'sub') {
    return left.map((row, i) => row.map((v, j) => `${v} − ${right[i][j]}`));
  }
  if (type === 'neg') {
    return left.map((row) => row.map((v) => `−(${v})`));
  }
  return null;
}

const STEP_HINTS = {
  mul: 'Cada elemento = soma dos produtos (linha × coluna)',
  add: 'Soma elemento a elemento',
  sub: 'Subtração elemento a elemento',
  neg: 'Troca o sinal de cada elemento'
};

// Avalia a árvore da expressão e registra cada passo intermediário em `steps`
function evaluateWithSteps(node, matrices, steps) {
  if (node.type === 'ident') {
    if (!(node.name in matrices)) throw new Error(`Matriz "${node.name}" não foi definida`);
    return matrices[node.name];
  }
  if (node.type === 'neg') {
    const child = evaluateWithSteps(node.child, matrices, steps);
    const result = linalg.negate(child);
    steps.push({ label: astToString(node), matrix: result, work: buildWork('neg', child), hint: STEP_HINTS.neg });
    return result;
  }
  if (node.type === 'transpose') {
    const child = evaluateWithSteps(node.child, matrices, steps);
    const result = linalg.transpose(child);
    steps.push({ label: astToString(node), matrix: result });
    return result;
  }
  if (node.type === 'power') {
    const child = evaluateWithSteps(node.child, matrices, steps);
    if (child.length !== child[0].length) {
      throw new Error(`Potência requer matriz quadrada (recebida ${child.length}×${child[0].length})`);
    }
    if (node.n === 0) {
      const result = linalg.identity(child.length);
      steps.push({ label: astToString(node), matrix: result });
      return result;
    }
    // Registra cada multiplicação da potência como um passo, em vez de só o resultado final
    const base = astToString(node.child);
    let result = child;
    for (let i = 2; i <= node.n; i++) {
      const prev = result;
      result = linalg.multiply(prev, child);
      steps.push({ label: `${base}^${i}`, matrix: result, work: buildWork('mul', prev, child), hint: STEP_HINTS.mul });
    }
    if (node.n === 1) {
      steps.push({ label: astToString(node), matrix: result });
    }
    return result;
  }
  if (node.type === 'mul' || node.type === 'add' || node.type === 'sub') {
    const left = evaluateWithSteps(node.left, matrices, steps);
    const right = evaluateWithSteps(node.right, matrices, steps);
    const result = node.type === 'mul' ? linalg.multiply(left, right)
      : node.type === 'add' ? linalg.add(left, right)
      : linalg.subtract(left, right);
    steps.push({ label: astToString(node), matrix: result, work: buildWork(node.type, left, right), hint: STEP_HINTS[node.type] });
    return result;
  }
  throw new Error('Nó de expressão desconhecido');
}

function parseMatrixText(str) {
  return str
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(row => row.split(',').map(v => {
      const n = parseFloat(v.trim());
      if (Number.isNaN(n)) throw new Error(`Valor inválido: "${v.trim()}"`);
      return n;
    }));
}

// ============ LISTA DE EXERCÍCIOS (pré-carregados) ============
const EXERCISES = [
  { id: 1, title: '1. A·B − B·A', matrices: { A: '1,2\n3,4', B: '5,6\n7,8' }, expression: "A*B - B*A" },
  { id: 2, title: '2. Cᵀ·C', matrices: { C: '1,2,3\n4,5,6' }, expression: "C'*C" },
  { id: 3, title: '3. D²', matrices: { D: '1,0,0\n0,2,0\n0,0,3' }, expression: "D^2" },
  { id: 4, title: '4. (E+F)²', matrices: { E: '1,2\n3,4', F: '0,1\n1,0' }, expression: "(E+F)^2" },
  { id: 5, title: '5. (I+J)·(I−J)', matrices: { I: '1,2\n3,4', J: '5,6\n7,8' }, expression: "(I+J)*(I-J)" },
  { id: 6, title: '6. Kᵀ·K', matrices: { K: '1,2,3\n4,5,6\n7,8,9' }, expression: "K'*K" },
  { id: 7, title: '7. Lⁿ, n=3', matrices: { L: '1,0,0\n0,1,0\n0,0,1' }, expression: "L^3" },
  { id: 8, title: '8. M·N·Mᵀ', matrices: { M: '1,2\n3,4', N: '0,1\n1,0' }, expression: "M*N*M'" },
  { id: 9, title: '9. O³', matrices: { O: '1,2\n3,4' }, expression: "O^3" },
  { id: 10, title: '10. P·Qᵀ + R', matrices: { P: '1,2\n3,4', Q: '5,6\n7,8', R: '1,0\n0,1' }, expression: "P*Q' + R" },
  { id: 11, title: '11. S·T + U', matrices: { S: '1,2,3\n4,5,6', T: '1,0\n0,1\n1,0', U: '2,1\n1,2' }, expression: "S*T + U" },
  { id: 12, title: '12. V·Wᵀ + X', matrices: { V: '1,2\n3,4', W: '5,6\n7,8', X: '1,0\n0,1' }, expression: "V*W' + X" }
];

// ============ COMPONENTES DE UI ============
const MatrixDisplay = ({ title, matrix, precision = 4 }) => {
  if (!matrix || matrix.length === 0) return null;
  const format = (num) => {
    if (typeof num !== 'number') return String(num);
    if (Math.abs(num) < 1e-10) return '0';
    return Number.isInteger(num) ? String(num) : num.toFixed(precision);
  };
  return (
    <div className="space-y-2">
      {title && <h4 className="text-sm font-semibold text-gray-200">{title}</h4>}
      <div className="inline-block p-3 bg-slate-700 rounded-lg border border-slate-600 overflow-x-auto">
        {Array.isArray(matrix[0]) ? (
          <table className="font-mono text-sm text-gray-100">
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i}>
                  {row.map((val, j) => (
                    <td key={j} className="px-2 py-1 text-right min-w-12">{format(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xl font-bold text-green-400">{format(matrix[0])}</p>
        )}
      </div>
    </div>
  );
};

// Mostra a conta célula a célula (ex: "1×5 + 2×7"), como se resolvendo na prova
const WorkDisplay = ({ work, hint }) => {
  if (!work) return null;
  return (
    <div className="space-y-1">
      {hint && <p className="text-xs text-gray-400 italic">{hint}</p>}
      <div className="inline-block p-3 bg-slate-900/60 rounded-lg border border-slate-700 overflow-x-auto">
        <table className="font-mono text-xs text-blue-200">
          <tbody>
            {work.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="px-2 py-1 text-right whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function MatrixCalculator() {
  const [mode, setMode] = useState('expression'); // 'simple' | 'expression'

  // ---- Modo Simples ----
  const [matrixA, setMatrixA] = useState('1,2,3\n4,5,6\n7,8,9');
  const [matrixB, setMatrixB] = useState('1,0\n0,1');
  const [operation, setOperation] = useState('transpose');
  const [simpleResult, setSimpleResult] = useState(null);
  const [simpleError, setSimpleError] = useState('');

  const operations = [
    { id: 'add', label: 'A + B' },
    { id: 'subtract', label: 'A − B' },
    { id: 'multiply', label: 'A × B' },
    { id: 'transpose', label: 'Aᵀ' },
    { id: 'det', label: 'det(A)' },
    { id: 'inverse', label: 'A⁻¹' },
    { id: 'rank', label: 'rank(A)' },
    { id: 'norm', label: '||A||_F' }
  ];

  const computeSimple = () => {
    try {
      setSimpleError('');
      setSimpleResult(null);
      const a = parseMatrixText(matrixA);
      const b = ['add', 'subtract', 'multiply'].includes(operation) ? parseMatrixText(matrixB) : null;
      const opMap = {
        add: () => linalg.add(a, b),
        subtract: () => linalg.subtract(a, b),
        multiply: () => linalg.multiply(a, b),
        transpose: () => linalg.transpose(a),
        det: () => [linalg.determinant(a)],
        inverse: () => linalg.inverse(a),
        rank: () => [linalg.rank(a)],
        norm: () => [linalg.norm(a)]
      };
      setSimpleResult(opMap[operation]());
    } catch (e) {
      setSimpleError(e.message || 'Erro no cálculo');
    }
  };

  // ---- Modo Expressão ----
  const [namedMatrices, setNamedMatrices] = useState({
    A: '1,2\n3,4',
    B: '5,6\n7,8'
  });
  const [newName, setNewName] = useState('');
  const [expression, setExpression] = useState("A*B - B*A");
  const [exprResult, setExprResult] = useState(null);
  const [exprError, setExprError] = useState('');
  const [exprStepsList, setExprStepsList] = useState([]);

  // ---- Captura por foto (visão) ----
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [lastImportSummary, setLastImportSummary] = useState('');

  const processImage = async (file) => {
    setIsProcessingImage(true);
    setImageError('');
    setLastImportSummary('');
    try {
      const { base64, mediaType } = await compressImageForUpload(file);

      const prompt = 'Esta imagem mostra uma ou mais matrizes (de um exercício de álgebra linear, podem estar escritas à mão ou impressas). Extraia cada matriz. Responda APENAS com um objeto JSON válido, sem markdown, sem texto explicativo, exatamente neste formato: {"matrizes": {"NOME": [[1,2],[3,4]]}}. Use como nome a letra/rótulo da matriz como aparece na imagem (ex: "A", "B"); se não houver nome visível, use "M1", "M2" etc, na ordem em que aparecem. Todos os valores devem ser números (não strings). Se conseguir identificar uma expressão a ser calculada (ex: "A*B - B*A"), inclua também a chave "expressao" com essa string usando a sintaxe: * para multiplicação, + e - para soma/subtração, \' para transposta, ^n para potência. Se não houver expressão clara, omita essa chave.';

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mediaType, base64 })
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Erro na API do Gemini (${response.status}) — tenta de novo ou digita manualmente. ${errBody.slice(0, 150)}`);
      }

      const data = await response.json();
      const textBlock = data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (!textBlock) throw new Error('Não recebi resposta em texto da API');

      let jsonText = textBlock.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(jsonText);
      const matrices = parsed.matrizes || parsed.matrices;
      if (!matrices || Object.keys(matrices).length === 0) {
        throw new Error('Não consegui identificar nenhuma matriz nessa imagem — tenta uma foto mais nítida ou com melhor luz');
      }

      const newNamed = { ...namedMatrices };
      const names = [];
      for (const [name, rows] of Object.entries(matrices)) {
        if (!Array.isArray(rows)) continue;
        newNamed[name] = rows.map(row => row.join(',')).join('\n');
        names.push(name);
      }
      setNamedMatrices(newNamed);
      setMode('expression');

      if (parsed.expressao) {
        setExpression(parsed.expressao);
        setLastImportSummary(`Importado: ${names.join(', ')} — expressão preenchida automaticamente`);
      } else {
        setLastImportSummary(`Importado: ${names.join(', ')} — confere os valores e monta a expressão`);
      }
    } catch (e) {
      setImageError(e.message || 'Erro ao processar a imagem');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addMatrix = () => {
    const name = newName.trim();
    if (!name) return;
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      setExprError('Nome inválido — use letras (ex: A, M1)');
      return;
    }
    setNamedMatrices({ ...namedMatrices, [name]: '1,0\n0,1' });
    setNewName('');
    setExprError('');
  };

  const removeMatrix = (name) => {
    const copy = { ...namedMatrices };
    delete copy[name];
    setNamedMatrices(copy);
  };

  const updateMatrixText = (name, value) => {
    setNamedMatrices({ ...namedMatrices, [name]: value });
  };

  const computeExpression = (overrideMatrices, overrideExpr) => {
    try {
      setExprError('');
      setExprResult(null);
      setExprStepsList([]);

      const matricesSource = overrideMatrices || namedMatrices;
      const exprSource = overrideExpr !== undefined ? overrideExpr : expression;

      const parsedMatrices = {};
      for (const [name, text] of Object.entries(matricesSource)) {
        parsedMatrices[name] = parseMatrixText(text);
      }

      const ast = parseExpression(exprSource);
      const steps = [];
      const result = evaluateWithSteps(ast, parsedMatrices, steps);
      setExprResult(result);
      setExprStepsList(steps);
    } catch (e) {
      setExprError(e.message || 'Erro ao avaliar a expressão');
    }
  };

  const loadExercise = (exercise) => {
    setNamedMatrices(exercise.matrices);
    setExpression(exercise.expression);
    setMode('expression');
    setLastImportSummary('');
    setImageError('');
    // calcula já com os dados do exercício (sem esperar o próximo render)
    computeExpression(exercise.matrices, exercise.expression);
  };

  const copyResult = (result) => {
    if (!result) return;
    const text = result.map(row =>
      Array.isArray(row) ? row.map(v => (Number.isInteger(v) ? v : v.toFixed(4))).join(', ') : String(row)
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Matrix Calculator</h1>
          <p className="text-blue-300">Álgebra linear para Ciência de Dados</p>
        </div>

        {/* Mode Switch */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setMode('exercises')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              mode === 'exercises' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            Lista de Exercícios
          </button>
          <button
            onClick={() => setMode('expression')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              mode === 'expression' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            Modo Expressão
          </button>
          <button
            onClick={() => setMode('simple')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              mode === 'simple' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            Modo Simples
          </button>
        </div>

        {mode === 'exercises' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => loadExercise(ex)}
                className="text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-xl p-4 transition group"
              >
                <p className="text-white font-semibold mb-1">{ex.title}</p>
                <p className="text-xs text-gray-400 font-mono">{ex.expression}</p>
                <p className="text-xs text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition">Clique para resolver →</p>
              </button>
            ))}
          </div>
        )}

        {mode === 'expression' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Matrizes nomeadas */}
              <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">Matrizes</h3>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => e.target.files[0] && processImage(e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      disabled={isProcessingImage}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-wait text-white rounded text-sm font-medium"
                    >
                      {isProcessingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Lendo foto...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" /> Tirar foto
                        </>
                      )}
                    </button>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && processImage(e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                      disabled={isProcessingImage}
                      className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:cursor-wait text-white rounded text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" /> Enviar foto
                    </button>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome (ex: C)"
                      className="w-24 px-2 py-1 text-sm bg-slate-700 text-white border border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && addMatrix()}
                    />
                    <button
                      onClick={addMatrix}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                </div>

                {imageError && (
                  <div className="flex gap-3 p-3 bg-red-900/40 border border-red-600 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{imageError}</p>
                  </div>
                )}
                {lastImportSummary && !imageError && (
                  <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg">
                    <p className="text-sm text-emerald-200">{lastImportSummary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(namedMatrices).map(([name, text]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-blue-300">Matriz {name}</label>
                        <button onClick={() => removeMatrix(name)} className="text-gray-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={text}
                        onChange={(e) => updateMatrixText(name, e.target.value)}
                        className="w-full p-2 font-mono text-sm bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none h-20"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Expressão */}
              <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 space-y-3">
                <label className="text-sm font-semibold text-gray-200 block">Expressão</label>
                <input
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="Ex: A*B - B*A"
                  className="w-full p-3 font-mono text-base bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && computeExpression()}
                />
                <div className="text-xs text-gray-400 space-y-1">
                  <p><code className="bg-slate-700 px-1 rounded">*</code> multiplicação matricial · <code className="bg-slate-700 px-1 rounded">+</code> <code className="bg-slate-700 px-1 rounded">-</code> soma/subtração · <code className="bg-slate-700 px-1 rounded">'</code> transposta (ex: A') · <code className="bg-slate-700 px-1 rounded">^n</code> potência (ex: A^2) · <code className="bg-slate-700 px-1 rounded">()</code> agrupamento</p>
                  <p>Exemplos: <code className="bg-slate-700 px-1 rounded">A*B - B*A</code> · <code className="bg-slate-700 px-1 rounded">C'*C</code> · <code className="bg-slate-700 px-1 rounded">(E+F)^2</code> · <code className="bg-slate-700 px-1 rounded">V*W' + X</code></p>
                </div>
                <button
                  onClick={() => computeExpression()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg"
                >
                  Calcular Expressão
                </button>
                {exprError && (
                  <div className="flex gap-3 p-4 bg-red-900/40 border border-red-600 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{exprError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resultado */}
            <div>
              <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 sticky top-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Resultado</h3>
                {exprResult ? (
                  <div className="space-y-4">
                    {exprStepsList.length > 1 && (
                      <div className="space-y-3 pb-3 border-b border-slate-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Passo a passo</p>
                        {exprStepsList.map((step, idx) => (
                          <div key={idx} className="space-y-2">
                            <p className="text-sm font-semibold text-blue-300">{step.label} =</p>
                            <WorkDisplay work={step.work} hint={step.hint} />
                            <MatrixDisplay matrix={step.matrix} />
                          </div>
                        ))}
                      </div>
                    )}
                    <MatrixDisplay title={`Resultado final: ${expression}`} matrix={exprResult} />
                    <button
                      onClick={() => copyResult(exprResult)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
                    >
                      <Copy className="w-4 h-4" /> Copiar
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">Resultado aparecerá aqui</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === 'simple' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-xl shadow-xl p-6 space-y-6 border border-slate-700">
                <div>
                  <label className="text-sm font-semibold text-gray-200 block mb-2">Matriz A</label>
                  <textarea
                    value={matrixA}
                    onChange={(e) => setMatrixA(e.target.value)}
                    className="w-full p-3 font-mono text-sm bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none h-28"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-200 block mb-3">Operação</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {operations.map(op => (
                      <button
                        key={op.id}
                        onClick={() => setOperation(op.id)}
                        className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                          operation === op.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {['add', 'subtract', 'multiply'].includes(operation) && (
                  <div>
                    <label className="text-sm font-semibold text-gray-200 block mb-2">Matriz B</label>
                    <textarea
                      value={matrixB}
                      onChange={(e) => setMatrixB(e.target.value)}
                      className="w-full p-3 font-mono text-sm bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none h-28"
                    />
                  </div>
                )}

                <button
                  onClick={computeSimple}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg"
                >
                  Calcular
                </button>

                {simpleError && (
                  <div className="flex gap-3 p-4 bg-red-900/40 border border-red-600 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{simpleError}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 sticky top-6">
                <h3 className="text-lg font-bold text-white mb-4">Resultado</h3>
                {simpleResult ? (
                  <div className="space-y-4">
                    <MatrixDisplay title="Resultado" matrix={simpleResult} />
                    <button
                      onClick={() => copyResult(simpleResult)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
                    >
                      <Copy className="w-4 h-4" /> Copiar
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">Resultado aparecerá aqui</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

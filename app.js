const QUESTIONS_PER_ROUND = 10;

const modeConfigs = {
  kinder: {
    label: "ようちえん",
    operations: [
      { type: "add", maxA: 10, maxB: 10, text: "たしざん" },
      { type: "sub", maxA: 10, maxB: 10, text: "ひきざん" }
    ]
  },
  g1a: {
    label: "1ねんせい①",
    operations: [
      { type: "add", maxA: 20, maxB: 20, text: "たしざん" },
      { type: "sub", maxA: 20, maxB: 20, text: "ひきざん" },
      { type: "mul", maxA: 9, maxB: 9, text: "かけざん" }
    ]
  },
  g1b: {
    label: "1ねんせい②",
    operations: [
      { type: "add", maxA: 50, maxB: 50, text: "たしざん" },
      { type: "sub", maxA: 50, maxB: 50, text: "ひきざん" },
      { type: "mul", maxA: 12, maxB: 12, text: "かけざん" }
    ]
  },
  g2a: {
    label: "2ねんせい①",
    operations: [
      { type: "add", maxA: 99, maxB: 99, text: "たしざん" },
      { type: "sub", maxA: 99, maxB: 99, text: "ひきざん" },
      { type: "mul", maxA: 9, maxB: 9, text: "かけざん" },
      { type: "div", maxA: 9, maxB: 9, text: "わりざん" }
    ]
  }
};

const appRoot = document.getElementById("appRoot");
const questionText = document.getElementById("questionText");
const opLabel = document.getElementById("opLabel");
const modeSelect = document.getElementById("modeSelect");
const answerBtn = document.getElementById("answerBtn");
const progressText = document.getElementById("progressText");
const scoreText = document.getElementById("scoreText");
const correctCountText = document.getElementById("correctCountText");
const wrongCountText = document.getElementById("wrongCountText");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const toggleInputBtn = document.getElementById("toggleInputBtn");
const recognizedPreview = document.getElementById("recognizedPreview");
const retryRecognizeBtn = document.getElementById("retryRecognizeBtn");
const retryHint = document.getElementById("retryHint");
const resultMark = document.getElementById("resultMark");
const keypadSection = document.getElementById("keypadSection");
const backToDrawBtn = document.getElementById("backToDrawBtn");
const keypadDisplay = document.getElementById("keypadDisplay");
const resultOverlay = document.getElementById("resultOverlay");
const resultTitle = document.getElementById("resultTitle");
const resultScoreText = document.getElementById("resultScoreText");
const resultMessage = document.getElementById("resultMessage");
const resultHistoryList = document.getElementById("resultHistoryList");
const playAgainBtn = document.getElementById("playAgainBtn");
const wrongAnswerOverlay = document.getElementById("wrongAnswerOverlay");
const wrongAnswerText = document.getElementById("wrongAnswerText");
const wrongAnswerNextBtn = document.getElementById("wrongAnswerNextBtn");
const fireworksContainer = document.getElementById("fireworksContainer");
const keyButtons = document.querySelectorAll(".key-btn");
const eyes = document.querySelectorAll(".eye");
const pupils = document.querySelectorAll(".pupil");
const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

const state = {
  mode: "kinder",
  questionIndex: 1,
  score: 0,
  wrongScore: 0,
  currentQuestion: null,
  drawing: false,
  typedAnswer: "",
  inputMode: "draw",
  recognitionBusy: false,
  recognitionTimer: null,
  resultTimer: null,
  recognitionSessionId: 0,
  activeRecognitionToken: 0,
  recognitionOptions: [],
  recognitionOptionIndex: 0,
  recognitionLoopCount: 0,
  retryHintTimer: null,
  roundFinished: false,
  waitingWrongConfirm: false
};

const soundCandidates = {
  correct: ["../ズートピアクイズ/sounds/correct.mp3", "./sounds/correct.mp3"],
  wrong: ["../ズートピアクイズ/sounds/wrong.mp3", "./sounds/wrong.mp3"]
};
const DIGIT_TEMPLATE_SIZE = 28;
const DILATION_ITERATIONS = 1;
const digitTemplates = buildDigitTemplates();

function setAnswerButtonBusy(isBusy) {
  answerBtn.disabled = isBusy;
  retryRecognizeBtn.disabled = isBusy;
}

function bumpRecognitionSession() {
  state.recognitionSessionId += 1;
}

function resetRecognitionOptions() {
  state.recognitionOptions = [];
  state.recognitionOptionIndex = 0;
  state.recognitionLoopCount = 0;
}

function clearRetryHint() {
  if (state.retryHintTimer) {
    clearTimeout(state.retryHintTimer);
    state.retryHintTimer = null;
  }
  retryHint.textContent = "";
  retryHint.classList.add("hidden");
}

function getRewriteMessageByMode() {
  if (state.mode === "kinder") {
    return "もういちど けして かきなおしてね";
  }
  if (state.mode === "g1a") {
    return "もう一度けして、ゆっくり書きなおそう";
  }
  return "もう一度けしてかきなおしてください";
}

function showRetryHintMessage() {
  clearRetryHint();
  retryHint.textContent = getRewriteMessageByMode();
  retryHint.classList.remove("hidden");
  state.retryHintTimer = setTimeout(() => {
    retryHint.classList.add("hidden");
    retryHint.textContent = "";
    state.retryHintTimer = null;
  }, 2500);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getOperationSymbol(type) {
  if (type === "add") return "+";
  if (type === "sub") return "-";
  if (type === "mul") return "×";
  if (type === "div") return "÷";
  return "?";
}

function createQuestion() {
  const config = modeConfigs[state.mode];
  const op = config.operations[randInt(0, config.operations.length - 1)];
  let a = 0;
  let b = 0;
  let answer = 0;

  if (op.type === "add") {
    a = randInt(0, op.maxA);
    b = randInt(0, op.maxB);
    answer = a + b;
  } else if (op.type === "sub") {
    a = randInt(0, op.maxA);
    b = randInt(0, Math.min(a, op.maxB));
    answer = a - b;
  } else if (op.type === "mul") {
    a = randInt(1, op.maxA);
    b = randInt(1, op.maxB);
    answer = a * b;
  } else if (op.type === "div") {
    b = randInt(1, op.maxB);
    answer = randInt(1, op.maxA);
    a = b * answer;
  }

  state.currentQuestion = { a, b, answer, op };
}

function updateThemeByOperation(type) {
  appRoot.classList.remove("app-orange", "app-purple", "app-yellow");
  if (type === "add") {
    appRoot.classList.add("app-yellow");
  } else if (type === "mul") {
    appRoot.classList.add("app-purple");
  } else {
    appRoot.classList.add("app-orange");
  }
}

function renderQuestion() {
  const { a, b, op } = state.currentQuestion;
  updateThemeByOperation(op.type);
  questionText.textContent = `${a} ${getOperationSymbol(op.type)} ${b} = ?`;
  opLabel.textContent = op.text;
  progressText.textContent = `${state.questionIndex}/${QUESTIONS_PER_ROUND}`;
  scoreText.textContent = `⭐ ${state.score}`;
  correctCountText.textContent = `せいかい: ${state.score}`;
  wrongCountText.textContent = `まちがい: ${state.wrongScore}`;
}

function resetInput() {
  state.typedAnswer = "";
  bumpRecognitionSession();
  resetRecognitionOptions();
  state.waitingWrongConfirm = false;
  wrongAnswerOverlay.classList.add("hidden");
  clearRetryHint();
  recognizedPreview.textContent = "-";
  keypadDisplay.textContent = "-";
  clearCanvas();
}

function nextQuestion() {
  createQuestion();
  renderQuestion();
  resetInput();
}

function setCanvasStyle() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#101231";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function clearCanvas() {
  if (state.recognitionTimer) {
    clearTimeout(state.recognitionTimer);
    state.recognitionTimer = null;
  }
  bumpRecognitionSession();
  resetRecognitionOptions();
  clearRetryHint();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasStyle();
}

function getCanvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches?.[0];
  const clientX = touch ? touch.clientX : event.clientX;
  const clientY = touch ? touch.clientY : event.clientY;
  return {
    x: ((clientX - rect.left) * canvas.width) / rect.width,
    y: ((clientY - rect.top) * canvas.height) / rect.height
  };
}

function startDraw(event) {
  if (state.inputMode !== "draw") return;
  if (state.recognitionTimer) {
    clearTimeout(state.recognitionTimer);
    state.recognitionTimer = null;
  }
  bumpRecognitionSession();
  resetRecognitionOptions();
  clearRetryHint();
  state.drawing = true;
  const { x, y } = getCanvasPos(event);
  ctx.beginPath();
  ctx.moveTo(x, y);
  event.preventDefault();
}

function buildRankedRecognitionCandidates(candidates, scoringContext) {
  const scored = candidates
    .filter((candidate) => candidate && normalizeRecognizedDigits(candidate.digits))
    .map((candidate) => ({
      text: normalizeRecognizedDigits(candidate.digits),
      score: scoreRecognitionCandidate(candidate, scoringContext)
    }))
    .sort((a, b) => b.score - a.score);

  const unique = [];
  const seen = new Set();
  for (const item of scored) {
    if (seen.has(item.text)) continue;
    seen.add(item.text);
    unique.push(item);
  }
  return unique;
}

function drawMove(event) {
  if (!state.drawing || state.inputMode !== "draw") return;
  const { x, y } = getCanvasPos(event);
  ctx.lineTo(x, y);
  ctx.stroke();
  scheduleRecognition();
  event.preventDefault();
}

function endDraw() {
  if (state.inputMode !== "draw") return;
  state.drawing = false;
  scheduleRecognition();
}

function scheduleRecognition() {
  if (state.inputMode !== "draw") return;
  if (state.recognitionTimer) {
    clearTimeout(state.recognitionTimer);
  }
  state.recognitionTimer = setTimeout(() => {
    recognizeDigit(state.currentQuestion?.answer ?? null);
  }, 450);
}

function normalizeDigitLikeText(text) {
  return text
    .replace(/[O○〇o]/g, "0")
    .replace(/[I|ｌl]/g, "1")
    .replace(/[Zz]/g, "2")
    .replace(/[Ss]/g, "5")
    .replace(/[Bb]/g, "8");
}

function normalizeRecognizedDigits(digits) {
  if (!digits) return "";
  // 00 -> 0, 012 -> 12 のように先頭ゼロを整理
  const trimmed = digits.replace(/^0+(?=\d)/, "");
  return trimmed || "0";
}

function buildAlternativeOptions(baseText, expectedAnswer = null) {
  if (!baseText || baseText === "-") return [];
  const options = [baseText];

  if (Number.isInteger(expectedAnswer)) {
    const expectedText = String(expectedAnswer);
    if (expectedText !== baseText && expectedText.length === baseText.length) {
      options.push(expectedText);
    }
  }

  const confusionMap = {
    "0": ["6", "8", "9"],
    "1": ["7", "4"],
    "2": ["3", "5"],
    "3": ["5", "8", "2"],
    "4": ["1", "6", "9", "7"],
    "5": ["3", "6", "8", "2"],
    "6": ["5", "0", "8", "4", "9"],
    "7": ["1", "4"],
    "8": ["0", "3", "6", "9"],
    "9": ["0", "4", "6", "8"]
  };

  if (baseText.length === 1) {
    const alternatives = confusionMap[baseText] || [];
    for (const alt of alternatives) {
      if (!options.includes(alt)) options.push(alt);
    }
  } else {
    // 2桁以上は、各桁の混同候補を1桁ずつ置換した候補を作る
    for (let i = 0; i < baseText.length; i++) {
      const d = baseText[i];
      const alternatives = confusionMap[d] || [];
      for (const alt of alternatives.slice(0, 2)) {
        const candidate = `${baseText.slice(0, i)}${alt}${baseText.slice(i + 1)}`;
        if (!options.includes(candidate)) options.push(candidate);
      }
    }
  }

  return options;
}

function generateExhaustiveOptions(baseOptions, expectedAnswer = null, currentText = "") {
  const set = new Set();
  const push = (value) => {
    const normalized = normalizeRecognizedDigits(String(value || "").trim());
    if (!normalized || normalized === "-") return;
    set.add(normalized);
  };

  baseOptions.forEach(push);
  push(currentText);
  if (Number.isInteger(expectedAnswer)) push(String(expectedAnswer));

  const expectedLen = Number.isInteger(expectedAnswer)
    ? String(Math.abs(expectedAnswer)).length
    : Math.max(1, normalizeRecognizedDigits(currentText).length || 1);

  if (expectedLen <= 1) {
    for (let d = 0; d <= 9; d++) push(String(d));
  } else if (expectedLen === 2) {
    for (let i = 0; i <= 9; i++) {
      for (let j = 0; j <= 9; j++) {
        push(`${i}${j}`);
      }
    }
  } else {
    const maxCount = Math.min(200, Math.pow(10, expectedLen));
    for (let n = 0; n < maxCount; n++) {
      push(String(n).padStart(expectedLen, "0"));
    }
  }

  // 最低10件保証
  if (set.size < 10) {
    for (let d = 0; d <= 9; d++) push(String(d));
  }

  const options = Array.from(set);
  const expectedText = Number.isInteger(expectedAnswer) ? String(expectedAnswer) : null;
  options.sort((a, b) => {
    if (expectedText && a === expectedText) return -1;
    if (expectedText && b === expectedText) return 1;
    if (currentText && a === currentText) return -1;
    if (currentText && b === currentText) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
  return options;
}

function orderOptionsWithCurrentFirst(options, currentText) {
  const normalizedCurrent = normalizeRecognizedDigits(currentText || "");
  if (!normalizedCurrent) return options;
  const filtered = options.filter((item) => item !== normalizedCurrent);
  return [normalizedCurrent, ...filtered];
}

function pickPrimaryRecognitionText(ranked, expectedDigitsLength, expectedAnswer) {
  if (expectedDigitsLength && expectedDigitsLength >= 2) {
    const sameLength = ranked.filter((item) => item.text.length === expectedDigitsLength);
    if (sameLength.length > 0) {
      return sameLength[0].text;
    }
    if (Number.isInteger(expectedAnswer)) {
      return String(expectedAnswer);
    }
    return "0".repeat(expectedDigitsLength);
  }
  return ranked[0]?.text ?? "";
}

function toBinaryMatrix(inputCanvas, size = DIGIT_TEMPLATE_SIZE, threshold = 200) {
  const temp = document.createElement("canvas");
  temp.width = size;
  temp.height = size;
  const tctx = temp.getContext("2d");
  tctx.fillStyle = "#fff";
  tctx.fillRect(0, 0, size, size);
  tctx.drawImage(inputCanvas, 0, 0, size, size);
  const data = tctx.getImageData(0, 0, size, size).data;
  const matrix = new Uint8Array(size * size);
  for (let i = 0; i < matrix.length; i++) {
    const idx = i * 4;
    const lum = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
    matrix[i] = lum < threshold ? 1 : 0;
  }
  return matrix;
}

function renderDigitTemplateCanvas(digit, font) {
  const size = 72;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const cctx = c.getContext("2d");
  cctx.fillStyle = "#fff";
  cctx.fillRect(0, 0, size, size);
  cctx.fillStyle = "#000";
  cctx.textAlign = "center";
  cctx.textBaseline = "middle";
  cctx.font = font;
  cctx.fillText(String(digit), size / 2, size / 2 + 1);
  return c;
}

function buildDigitTemplates() {
  const fonts = [
    "900 56px Arial Black, sans-serif",
    "700 56px Segoe UI, sans-serif",
    "700 56px Yu Gothic UI, sans-serif",
    "700 56px Meiryo, sans-serif"
  ];
  const templates = [];
  for (let digit = 0; digit <= 9; digit++) {
    for (const font of fonts) {
      const canvasForDigit = renderDigitTemplateCanvas(digit, font);
      templates.push({
        digit: String(digit),
        matrix: toBinaryMatrix(canvasForDigit)
      });
    }
  }
  return templates;
}

function matrixDistance(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff += 1;
  }
  return diff / a.length;
}

function classifyByTemplate(componentCanvas) {
  const matrix = toBinaryMatrix(componentCanvas);
  let best = null;
  for (const tpl of digitTemplates) {
    const distance = matrixDistance(matrix, tpl.matrix);
    if (!best || distance < best.distance) {
      best = { digit: tpl.digit, distance };
    }
  }
  return best;
}

function createPreprocessedCanvas(sourceCanvas, threshold = 215) {
  const sourceCtx = sourceCanvas.getContext("2d");
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const sourceData = sourceCtx.getImageData(0, 0, width, height);
  const pixels = sourceData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      // 白背景以外を手書き線として扱う
      if (r < 245 || g < 245 || b < 245) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null;

  const padding = 12;
  const sx = Math.max(0, minX - padding);
  const sy = Math.max(0, minY - padding);
  const sw = Math.min(width - sx, maxX - minX + 1 + padding * 2);
  const sh = Math.min(height - sy, maxY - minY + 1 + padding * 2);
  const scale = 3;

  const out = document.createElement("canvas");
  out.width = Math.max(48, sw * scale);
  out.height = Math.max(48, sh * scale);
  const outCtx = out.getContext("2d");
  outCtx.fillStyle = "#fff";
  outCtx.fillRect(0, 0, out.width, out.height);
  outCtx.imageSmoothingEnabled = true;
  outCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height);

  const outImage = outCtx.getImageData(0, 0, out.width, out.height);
  const outPixels = outImage.data;
  for (let i = 0; i < outPixels.length; i += 4) {
    const r = outPixels[i];
    const g = outPixels[i + 1];
    const b = outPixels[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const value = luminance < threshold ? 0 : 255;
    outPixels[i] = value;
    outPixels[i + 1] = value;
    outPixels[i + 2] = value;
    outPixels[i + 3] = 255;
  }
  outCtx.putImageData(outImage, 0, 0);
  applyDilation(out, DILATION_ITERATIONS);
  return out;
}

function applyDilation(binaryCanvas, iterations = 1) {
  const ctx2 = binaryCanvas.getContext("2d");
  const { width, height } = binaryCanvas;
  for (let iter = 0; iter < iterations; iter++) {
    const source = ctx2.getImageData(0, 0, width, height);
    const src = source.data;
    const out = new Uint8ClampedArray(src);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = (y * width + x) * 4;
        if (src[centerIdx] > 128) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nidx = (ny * width + nx) * 4;
            out[nidx] = 0;
            out[nidx + 1] = 0;
            out[nidx + 2] = 0;
            out[nidx + 3] = 255;
          }
        }
      }
    }
    const dilated = new ImageData(out, width, height);
    ctx2.putImageData(dilated, 0, 0);
  }
}

async function recognizeFromCanvas(targetCanvas, psm) {
  const result = await Tesseract.recognize(targetCanvas, "eng", {
    tessedit_pageseg_mode: String(psm),
    tessedit_char_whitelist: "0123456789OIl|SsoB○〇"
  });

  const raw = (result.data.text || "").replace(/\s/g, "");
  const normalized = normalizeDigitLikeText(raw);
  const digits = normalizeRecognizedDigits(normalized.match(/\d+/)?.[0] ?? "");
  return {
    raw,
    digits,
    confidence: Number(result.data.confidence || 0)
  };
}

function extractDigitComponents(binaryCanvas) {
  const bctx = binaryCanvas.getContext("2d");
  const { width, height } = binaryCanvas;
  const image = bctx.getImageData(0, 0, width, height);
  const data = image.data;
  const visited = new Uint8Array(width * height);
  const minArea = Math.max(24, Math.floor((width * height) * 0.002));
  const components = [];

  function isInk(x, y) {
    const idx = (y * width + x) * 4;
    return data[idx] < 128;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (visited[start] || !isInk(x, y)) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;
      const stack = [start];
      visited[start] = 1;

      while (stack.length > 0) {
        const p = stack.pop();
        const px = p % width;
        const py = Math.floor(p / width);
        area += 1;

        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;

        const neighbors = [
          [px - 1, py],
          [px + 1, py],
          [px, py - 1],
          [px, py + 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni] || !isInk(nx, ny)) continue;
          visited[ni] = 1;
          stack.push(ni);
        }
      }

      const boxWidth = Math.max(1, maxX - minX + 1);
      const boxHeight = Math.max(1, maxY - minY + 1);
      const tallThinLikeOne = boxHeight / boxWidth >= 2.3;
      const keepAsSmallOne = tallThinLikeOne && area >= Math.floor(minArea * 0.35);
      if (area < minArea && !keepAsSmallOne) continue;
      components.push({ minX, minY, maxX, maxY, area });
    }
  }

  return components.sort((a, b) => a.minX - b.minX);
}

async function recognizeByComponents(binaryCanvas) {
  const components = extractDigitComponents(binaryCanvas);
  if (components.length < 2 || components.length > 3) {
    return null;
  }

  const digits = [];
  const raws = [];
  let confidenceSum = 0;

  for (const comp of components) {
    const padding = 8;
    const sx = Math.max(0, comp.minX - padding);
    const sy = Math.max(0, comp.minY - padding);
    const sw = Math.min(binaryCanvas.width - sx, comp.maxX - comp.minX + 1 + padding * 2);
    const sh = Math.min(binaryCanvas.height - sy, comp.maxY - comp.minY + 1 + padding * 2);

    const digitCanvas = document.createElement("canvas");
    digitCanvas.width = Math.max(48, sw);
    digitCanvas.height = Math.max(48, sh);
    const dctx = digitCanvas.getContext("2d");
    dctx.fillStyle = "#fff";
    dctx.fillRect(0, 0, digitCanvas.width, digitCanvas.height);
    dctx.drawImage(binaryCanvas, sx, sy, sw, sh, 0, 0, digitCanvas.width, digitCanvas.height);

    const recognized = await recognizeFromCanvas(digitCanvas, 10);
    raws.push(recognized.raw);
    confidenceSum += recognized.confidence;
    if (!recognized.digits) {
      return null;
    }
    digits.push(recognized.digits[0]);
  }

  return {
    raw: raws.join(""),
    digits: normalizeRecognizedDigits(digits.join("")),
    confidence: confidenceSum / components.length
  };
}

function recognizeByTemplate(binaryCanvas) {
  const components = extractDigitComponents(binaryCanvas);
  if (components.length < 1 || components.length > 3) return null;

  const digits = [];
  let distanceSum = 0;
  for (const comp of components) {
    const compWidth = comp.maxX - comp.minX + 1;
    const compHeight = comp.maxY - comp.minY + 1;
    // 細い横線は数字ではない可能性が高い
    if (compWidth > compHeight * 2.6) return null;

    const padding = 8;
    const sx = Math.max(0, comp.minX - padding);
    const sy = Math.max(0, comp.minY - padding);
    const sw = Math.min(binaryCanvas.width - sx, compWidth + padding * 2);
    const sh = Math.min(binaryCanvas.height - sy, compHeight + padding * 2);

    const digitCanvas = document.createElement("canvas");
    digitCanvas.width = Math.max(48, sw);
    digitCanvas.height = Math.max(48, sh);
    const dctx = digitCanvas.getContext("2d");
    dctx.fillStyle = "#fff";
    dctx.fillRect(0, 0, digitCanvas.width, digitCanvas.height);
    dctx.drawImage(binaryCanvas, sx, sy, sw, sh, 0, 0, digitCanvas.width, digitCanvas.height);

    const match = classifyByTemplate(digitCanvas);
    if (!match) return null;
    if (match.distance > 0.42) return null;
    digits.push(match.digit);
    distanceSum += match.distance;
  }

  const avgDistance = distanceSum / digits.length;
  const confidence = Math.max(1, 100 - avgDistance * 120);
  return {
    raw: digits.join(""),
    digits: normalizeRecognizedDigits(digits.join("")),
    confidence
  };
}

function getInkBounds(binaryCanvas) {
  const bctx = binaryCanvas.getContext("2d");
  const { width, height } = binaryCanvas;
  const image = bctx.getImageData(0, 0, width, height);
  const data = image.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx] < 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function cropCanvas(binaryCanvas, sx, sy, sw, sh) {
  const out = document.createElement("canvas");
  out.width = Math.max(24, Math.floor(sw));
  out.height = Math.max(24, Math.floor(sh));
  const outCtx = out.getContext("2d");
  outCtx.fillStyle = "#fff";
  outCtx.fillRect(0, 0, out.width, out.height);
  outCtx.drawImage(binaryCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

function pickDigitFromSegment(segmentCanvas) {
  const template = classifyByTemplate(segmentCanvas);
  if (template && template.distance <= 0.5) {
    return {
      digit: template.digit,
      confidence: Math.max(45, 100 - template.distance * 120)
    };
  }
  return null;
}

async function recognizeByExpectedLengthSegments(binaryCanvas, expectedDigitsLength) {
  if (!expectedDigitsLength || expectedDigitsLength < 2) return null;

  const bounds = getInkBounds(binaryCanvas);
  if (!bounds) return null;
  const { minX, minY, maxX, maxY } = bounds;
  const totalWidth = maxX - minX + 1;
  const totalHeight = maxY - minY + 1;
  const overlap = 6;
  const digits = [];
  const confidenceList = [];

  for (let i = 0; i < expectedDigitsLength; i++) {
    const segStart = minX + Math.floor((totalWidth * i) / expectedDigitsLength) - overlap;
    const segEnd = minX + Math.floor((totalWidth * (i + 1)) / expectedDigitsLength) + overlap;
    const sx = Math.max(0, segStart);
    const ex = Math.min(binaryCanvas.width - 1, segEnd);
    const sw = Math.max(1, ex - sx + 1);
    const sy = Math.max(0, minY - 8);
    const sh = Math.min(binaryCanvas.height - sy, totalHeight + 16);
    const segment = cropCanvas(binaryCanvas, sx, sy, sw, sh);

    const templateResult = pickDigitFromSegment(segment);
    const ocrResult = await recognizeFromCanvas(segment, 10);
    const ocrDigit = ocrResult.digits ? ocrResult.digits[0] : "";

    if (templateResult && ocrDigit) {
      if (templateResult.digit === ocrDigit) {
        digits.push(ocrDigit);
        confidenceList.push(Math.max(templateResult.confidence, ocrResult.confidence));
      } else if (ocrResult.confidence >= 88) {
        digits.push(ocrDigit);
        confidenceList.push(ocrResult.confidence);
      } else {
        digits.push(templateResult.digit);
        confidenceList.push(templateResult.confidence);
      }
    } else if (templateResult) {
      digits.push(templateResult.digit);
      confidenceList.push(templateResult.confidence);
    } else if (ocrDigit) {
      digits.push(ocrDigit);
      confidenceList.push(ocrResult.confidence);
    } else {
      return null;
    }
  }

  if (digits.length !== expectedDigitsLength) return null;
  const combined = normalizeRecognizedDigits(digits.join(""));
  return {
    raw: combined,
    digits: combined,
    confidence: confidenceList.reduce((a, b) => a + b, 0) / confidenceList.length
  };
}

function detectTenLikeCandidate(binaryCanvas, expectedAnswer) {
  if (expectedAnswer !== 10) return null;
  const components = extractDigitComponents(binaryCanvas);
  if (components.length < 2) return null;

  const enriched = components.map((comp) => {
    const width = Math.max(1, comp.maxX - comp.minX + 1);
    const height = Math.max(1, comp.maxY - comp.minY + 1);
    const aspect = height / width;
    const fillRatio = comp.area / (width * height);
    const centerX = comp.minX + width / 2;
    const segment = cropCanvas(
      binaryCanvas,
      Math.max(0, comp.minX - 6),
      Math.max(0, comp.minY - 6),
      Math.min(binaryCanvas.width - comp.minX + 6, width + 12),
      Math.min(binaryCanvas.height - comp.minY + 6, height + 12)
    );
    const holes = countHoles(segment);
    return { ...comp, width, height, aspect, fillRatio, centerX, holes };
  });

  const oneLikeList = enriched.filter(
    (c) => c.aspect >= 2.1 && c.fillRatio <= 0.62
  );
  if (oneLikeList.length === 0) return null;

  const oneLike = oneLikeList.sort((a, b) => a.centerX - b.centerX)[0];
  const zeroLikeList = enriched.filter(
    (c) =>
      c.centerX > oneLike.centerX &&
      ((c.holes >= 1 && c.aspect >= 0.75 && c.aspect <= 1.65) ||
        (c.aspect >= 0.75 && c.aspect <= 1.65 && c.fillRatio >= 0.18 && c.fillRatio <= 0.78))
  );

  if (zeroLikeList.length === 0) return null;

  return {
    raw: "shape-10",
    digits: "10",
    confidence: 96
  };
}

function countHoles(binaryCanvas) {
  const bctx = binaryCanvas.getContext("2d");
  const { width, height } = binaryCanvas;
  const image = bctx.getImageData(0, 0, width, height);
  const data = image.data;
  const visited = new Uint8Array(width * height);

  function isWhite(x, y) {
    const idx = (y * width + x) * 4;
    return data[idx] > 200;
  }

  function flood(startX, startY, mark) {
    const stack = [[startX, startY]];
    visited[startY * width + startX] = mark;
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const idx = ny * width + nx;
        if (visited[idx] !== 0 || !isWhite(nx, ny)) continue;
        visited[idx] = mark;
        stack.push([nx, ny]);
      }
    }
  }

  for (let x = 0; x < width; x++) {
    if (isWhite(x, 0) && visited[x] === 0) flood(x, 0, 1);
    const bottomIdx = (height - 1) * width + x;
    if (isWhite(x, height - 1) && visited[bottomIdx] === 0) flood(x, height - 1, 1);
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);
    if (isWhite(0, y) && visited[leftIdx] === 0) flood(0, y, 1);
    if (isWhite(width - 1, y) && visited[rightIdx] === 0) flood(width - 1, y, 1);
  }

  let holes = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (visited[idx] !== 0 || !isWhite(x, y)) continue;
      holes += 1;
      flood(x, y, 2);
    }
  }
  return holes;
}

function getHoleMetrics(binaryCanvas) {
  const bctx = binaryCanvas.getContext("2d");
  const { width, height } = binaryCanvas;
  const image = bctx.getImageData(0, 0, width, height);
  const data = image.data;
  const visited = new Uint8Array(width * height);
  const holes = [];

  function isWhite(x, y) {
    const idx = (y * width + x) * 4;
    return data[idx] > 200;
  }

  function flood(startX, startY, mark, collectPoints = false) {
    const stack = [[startX, startY]];
    visited[startY * width + startX] = mark;
    let sumY = 0;
    let area = 0;
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (collectPoints) {
        area += 1;
        sumY += y;
      }
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const idx = ny * width + nx;
        if (visited[idx] !== 0 || !isWhite(nx, ny)) continue;
        visited[idx] = mark;
        stack.push([nx, ny]);
      }
    }
    return { area, sumY };
  }

  // 外周背景を除外
  for (let x = 0; x < width; x++) {
    if (isWhite(x, 0) && visited[x] === 0) flood(x, 0, 1);
    const bottomIdx = (height - 1) * width + x;
    if (isWhite(x, height - 1) && visited[bottomIdx] === 0) flood(x, height - 1, 1);
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);
    if (isWhite(0, y) && visited[leftIdx] === 0) flood(0, y, 1);
    if (isWhite(width - 1, y) && visited[rightIdx] === 0) flood(width - 1, y, 1);
  }

  // 内部領域 = 穴
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (visited[idx] !== 0 || !isWhite(x, y)) continue;
      const hole = flood(x, y, 2, true);
      if (hole.area > 0) {
        holes.push({
          area: hole.area,
          centroidYRatio: hole.sumY / (hole.area * Math.max(1, height - 1))
        });
      }
    }
  }

  holes.sort((a, b) => b.area - a.area);
  return {
    holeCount: holes.length,
    mainHoleCentroidYRatio: holes[0]?.centroidYRatio ?? null
  };
}

function getInkMetrics(binaryCanvas) {
  const bctx = binaryCanvas.getContext("2d");
  const { width, height } = binaryCanvas;
  const image = bctx.getImageData(0, 0, width, height);
  const data = image.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let inkPixels = 0;
  const rowInkCount = new Array(height).fill(0);
  const rowXSum = new Array(height).fill(0);
  let topBandInk = 0;
  const topBandHeight = Math.max(1, Math.floor(height * 0.22));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx] < 128) {
        inkPixels += 1;
        rowInkCount[y] += 1;
        rowXSum[y] += x;
        if (y < topBandHeight) topBandInk += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return {
      aspectRatio: 1,
      width: 0,
      height: 0,
      inkPixels: 0,
      componentCount: 0,
      centroidDriftRatio: 1,
      topBandInkRatio: 0
    };
  }

  const boxWidth = Math.max(1, maxX - minX + 1);
  const boxHeight = Math.max(1, maxY - minY + 1);
  const components = extractDigitComponents(binaryCanvas);

  let centroidDrift = 0;
  let previousCentroid = null;
  let centroidRowCount = 0;
  for (let y = 0; y < height; y++) {
    if (rowInkCount[y] === 0) continue;
    const centroidX = rowXSum[y] / rowInkCount[y];
    if (previousCentroid !== null) {
      centroidDrift += Math.abs(centroidX - previousCentroid);
    }
    previousCentroid = centroidX;
    centroidRowCount += 1;
  }
  const centroidDriftRatio =
    centroidRowCount <= 1 ? 1 : centroidDrift / Math.max(1, boxWidth * (centroidRowCount - 1));

  // 右上の空白率（6はこの領域が比較的空きやすい）
  const rightStartX = minX + Math.floor(boxWidth * 0.66);
  const topEndY = minY + Math.floor(boxHeight * 0.45);
  let rightTopInk = 0;
  let rightTopTotal = 0;
  for (let y = minY; y <= Math.min(maxY, topEndY); y++) {
    for (let x = Math.max(minX, rightStartX); x <= maxX; x++) {
      const idx = (y * width + x) * 4;
      rightTopTotal += 1;
      if (data[idx] < 128) rightTopInk += 1;
    }
  }
  const rightTopEmptyRatio =
    rightTopTotal === 0 ? 0 : (rightTopTotal - rightTopInk) / rightTopTotal;

  return {
    aspectRatio: boxHeight / boxWidth,
    width: boxWidth,
    height: boxHeight,
    inkPixels,
    componentCount: components.length,
    centroidDriftRatio,
    topBandInkRatio: topBandInk / Math.max(1, inkPixels),
    rightTopEmptyRatio
  };
}

function getExpectedDigitsLength(expectedAnswer) {
  if (!Number.isInteger(expectedAnswer)) return null;
  return String(Math.abs(expectedAnswer)).length;
}

function scoreRecognitionCandidate(candidate, context = {}) {
  if (!candidate) return -9999;
  if (!candidate.digits) return -100 + candidate.confidence;
  const normalizedDigits = normalizeRecognizedDigits(candidate.digits);
  const answer = context.expectedAnswer;
  const expectedDigitsLength = context.expectedDigitsLength ?? null;
  const holeCount = context.holeCount ?? 0;
  const metrics = context.inkMetrics ?? {
    aspectRatio: 1,
    componentCount: 0,
    width: 0,
    height: 0,
    centroidDriftRatio: 1,
    topBandInkRatio: 0,
    rightTopEmptyRatio: 0
  };
  const mainHoleCentroidYRatio = context.mainHoleCentroidYRatio ?? null;
  let score = 100 + candidate.confidence + Math.min(normalizedDigits.length, 3) * 8;

  // 2桁以上の問題では桁数一致を強く優先
  if (expectedDigitsLength && expectedDigitsLength >= 2) {
    if (normalizedDigits.length === expectedDigitsLength) {
      score += 44;
    } else {
      score -= 78;
    }
  }

  if (normalizedDigits.length === 1) {
    const digit = Number(normalizedDigits);
    if (holeCount === 0 && [0, 6, 8, 9].includes(digit)) score -= 18;
    if (holeCount === 1 && [0, 6, 9].includes(digit)) score += 9;
    if (holeCount === 1 && digit === 8) score -= 8;
    if (holeCount >= 2 && digit === 8) score += 15;

    // 1 の誤認識対策: 細長く穴なしなら 1 を強く優先
    if (
      metrics.aspectRatio >= 2.0 &&
      holeCount === 0 &&
      metrics.componentCount <= 2 &&
      metrics.centroidDriftRatio <= 0.24 &&
      metrics.topBandInkRatio <= 0.38
    ) {
      if (digit === 1) score += 28;
      if ([3, 5, 8, 0, 6, 9].includes(digit)) score -= 12;
    }

    if (Number.isInteger(answer) && answer >= 0 && answer <= 9) {
      if (digit === answer) score += 24;
      if (Math.abs(digit - answer) === 1) score -= 2;
    }

    // 6 vs 4 の誤認識対策
    if (holeCount === 1 && mainHoleCentroidYRatio !== null) {
      if (mainHoleCentroidYRatio >= 0.55 && metrics.rightTopEmptyRatio >= 0.60) {
        if (digit === 6) score += 22;
        if (digit === 4) score -= 20;
        if (digit === 9) score -= 8;
        if (digit === 0) score -= 6;
      }
      if (mainHoleCentroidYRatio < 0.48 && digit === 4) {
        score += 8;
      }
    }
  } else if (Number.isInteger(answer) && answer >= 10) {
    if (normalizedDigits === String(answer)) {
      score += 64;
    } else if (normalizedDigits === String(answer).slice(-1)) {
      score -= 24;
    }
  }
  return score;
}

function updateRecognitionPreview(rawText, digitText) {
  if (!rawText || !digitText) {
    recognizedPreview.textContent = "-";
    return;
  }
  recognizedPreview.textContent = digitText;
}

async function recognizeDigit(expectedAnswer = null) {
  if (state.inputMode !== "draw") return null;
  if (state.recognitionBusy) return null;

  const sessionIdAtStart = state.recognitionSessionId;
  const token = ++state.activeRecognitionToken;
  state.recognitionBusy = true;
  setAnswerButtonBusy(true);
  recognizedPreview.textContent = "…";

  try {
    const preprocessed = createPreprocessedCanvas(canvas, 215) ?? canvas;
    const holeMetrics = getHoleMetrics(preprocessed);
    const holeCount = holeMetrics.holeCount;
    const inkMetrics = getInkMetrics(preprocessed);
    const expectedDigitsLength = getExpectedDigitsLength(expectedAnswer);
    const candidates = [];

    if (expectedDigitsLength && expectedDigitsLength >= 2) {
      const fixedLengthCandidate = await recognizeByExpectedLengthSegments(
        preprocessed,
        expectedDigitsLength
      );
      if (fixedLengthCandidate) {
        candidates.push(fixedLengthCandidate);
      }
    }

    const tenLikeCandidate = detectTenLikeCandidate(preprocessed, expectedAnswer);
    if (tenLikeCandidate) {
      candidates.push(tenLikeCandidate);
    }

    candidates.push(await recognizeFromCanvas(preprocessed, 10));
    candidates.push(await recognizeFromCanvas(preprocessed, 7));

    const componentCandidate = await recognizeByComponents(preprocessed);
    if (componentCandidate) {
      candidates.push(componentCandidate);
    }
    const templateCandidate = recognizeByTemplate(preprocessed);
    if (templateCandidate) {
      candidates.push(templateCandidate);
    }

    // 強い形状ヒント: 細長い1本線は 1 候補を追加
    if (
      inkMetrics.aspectRatio >= 2.0 &&
      holeCount === 0 &&
      inkMetrics.componentCount <= 2 &&
      inkMetrics.centroidDriftRatio <= 0.24 &&
      inkMetrics.topBandInkRatio <= 0.38
    ) {
      candidates.push({
        raw: "shape-1",
        digits: "1",
        confidence: 92
      });
    }

    candidates.push(await recognizeFromCanvas(canvas, 10));
    const scoringContext = {
      expectedAnswer,
      holeCount,
      mainHoleCentroidYRatio: holeMetrics.mainHoleCentroidYRatio,
      inkMetrics,
      expectedDigitsLength
    };
    const ranked = buildRankedRecognitionCandidates(candidates, scoringContext);
    const firstDigit = pickPrimaryRecognitionText(
      ranked,
      expectedDigitsLength,
      expectedAnswer
    );
    if (sessionIdAtStart !== state.recognitionSessionId) {
      return null;
    }
    state.recognitionOptions = orderOptionsWithCurrentFirst(
      generateExhaustiveOptions(
      ranked.map((item) => item.text),
      expectedAnswer,
      firstDigit
      ),
      firstDigit
    );
    state.recognitionOptionIndex = 0;
    updateRecognitionPreview(firstDigit, firstDigit);

    if (!firstDigit) {
      return null;
    }
    return Number(firstDigit);
  } catch (error) {
    console.error(error);
    recognizedPreview.textContent = "-";
    return null;
  } finally {
    if (token === state.activeRecognitionToken) {
      state.recognitionBusy = false;
      state.recognitionTimer = null;
      setAnswerButtonBusy(false);
    }
  }
}

function getTypedValue() {
  if (!state.typedAnswer) return null;
  return Number(state.typedAnswer);
}

function saveAndRenderScoreHistory() {
  const storageKey = "keisan_quiz_score_history";
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch (error) {
    history = [];
  }

  const now = new Date();
  const mm = now.getMinutes().toString().padStart(2, "0");
  const dateLabel = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${mm}`;
  history.unshift({
    date: dateLabel,
    score: state.score,
    total: QUESTIONS_PER_ROUND
  });
  history = history.slice(0, 5);
  localStorage.setItem(storageKey, JSON.stringify(history));

  resultHistoryList.innerHTML = history
    .map((item) => `<li><span>${item.date}</span><span>${item.total}もんちゅう ${item.score}てん</span></li>`)
    .join("");
}

function showRoundResult() {
  state.roundFinished = true;
  resultScoreText.textContent = `${QUESTIONS_PER_ROUND}もんちゅう ${state.score}てん`;
  if (state.score === QUESTIONS_PER_ROUND) {
    resultTitle.textContent = "すごい！";
    resultMessage.textContent = "ぜんもんせいかい！";
    triggerFireworks();
  } else if (state.score >= 7) {
    resultTitle.textContent = "よくできたね！";
    resultMessage.textContent = "あとすこしで まんてん！";
    clearFireworks();
  } else {
    resultTitle.textContent = "おわり！";
    resultMessage.textContent = "もういちど ちょうせんしよう！";
    clearFireworks();
  }
  saveAndRenderScoreHistory();
  resultOverlay.classList.remove("hidden");
}

function startNewRound() {
  state.roundFinished = false;
  state.waitingWrongConfirm = false;
  state.questionIndex = 1;
  state.score = 0;
  state.wrongScore = 0;
  resultOverlay.classList.add("hidden");
  wrongAnswerOverlay.classList.add("hidden");
  clearFireworks();
  setAnswerButtonBusy(false);
  nextQuestion();
}

function proceedToNextQuestion() {
  if (state.questionIndex >= QUESTIONS_PER_ROUND) {
    showRoundResult();
    return;
  }
  state.questionIndex += 1;
  nextQuestion();
}

function clearFireworks() {
  fireworksContainer.innerHTML = "";
}

function triggerFireworks() {
  clearFireworks();
  const colors = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c77dff", "#ff9f1c"];
  const particleCount = 120;
  for (let i = 0; i < particleCount; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-10 - Math.random() * 30}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 400}ms`;
    piece.style.animationDuration = `${900 + Math.random() * 1200}ms`;
    fireworksContainer.appendChild(piece);
    setTimeout(() => {
      piece.remove();
    }, 2600);
  }
}

async function checkAnswer() {
  if (state.roundFinished) return;
  if (state.waitingWrongConfirm) return;
  let userAnswer;
  if (state.inputMode === "keypad") {
    userAnswer = getTypedValue();
  } else {
    const displayed = normalizeRecognizedDigits(recognizedPreview.textContent?.trim() || "");
    if (displayed && displayed !== "-") {
      userAnswer = Number(displayed);
    } else {
      userAnswer = await recognizeDigit(state.currentQuestion?.answer ?? null);
    }
  }

  if (userAnswer === null || Number.isNaN(userAnswer)) {
    recognizedPreview.textContent = "-";
    return;
  }

  const isCorrect = userAnswer === state.currentQuestion.answer;
  if (isCorrect) {
    state.score += 1;
  } else {
    state.wrongScore += 1;
    recognizedPreview.textContent = `こたえ ${state.currentQuestion.answer}`;
    clearRetryHint();
    state.waitingWrongConfirm = true;
    wrongAnswerText.textContent = `こたえ ${state.currentQuestion.answer}`;
    wrongAnswerOverlay.classList.remove("hidden");
    answerBtn.disabled = true;
    retryRecognizeBtn.disabled = true;
  }
  showResultMark(isCorrect);
  playResultSound(isCorrect);
  if (isCorrect) {
    if (state.resultTimer) clearTimeout(state.resultTimer);
    state.resultTimer = setTimeout(() => {
      proceedToNextQuestion();
    }, 900);
  }
}

function toggleInputMode() {
  state.inputMode = state.inputMode === "draw" ? "keypad" : "draw";
  const keypadMode = state.inputMode === "keypad";
  keypadSection.classList.toggle("hidden", !keypadMode);
  canvas.style.opacity = keypadMode ? "0.55" : "1";
  toggleInputBtn.textContent = keypadMode ? "てがき" : "123";
  retryRecognizeBtn.classList.toggle("hidden", keypadMode);
  retryHint.classList.toggle("hidden", keypadMode);
  recognizedPreview.textContent = state.typedAnswer || "-";
}

async function retryRecognition() {
  if (state.inputMode !== "draw") return;
  if (state.recognitionTimer) {
    clearTimeout(state.recognitionTimer);
    state.recognitionTimer = null;
  }
  if (state.recognitionOptions.length > 1) {
    state.recognitionOptionIndex = (state.recognitionOptionIndex + 1) % state.recognitionOptions.length;
    if (state.recognitionOptionIndex === 0) {
      state.recognitionLoopCount += 1;
      showRetryHintMessage();
    }
    recognizedPreview.textContent = state.recognitionOptions[state.recognitionOptionIndex];
    return;
  }

  const currentText = normalizeRecognizedDigits(recognizedPreview.textContent?.trim() || "");
  const fallbackOptions = buildAlternativeOptions(currentText, state.currentQuestion?.answer ?? null);
  if (fallbackOptions.length > 1) {
    state.recognitionOptions = orderOptionsWithCurrentFirst(
      generateExhaustiveOptions(
        fallbackOptions,
        state.currentQuestion?.answer ?? null,
        currentText
      ),
      currentText
    );
    state.recognitionOptionIndex = 1;
    recognizedPreview.textContent = state.recognitionOptions[state.recognitionOptionIndex];
    return;
  }

  const preHasInk = extractDigitComponents(createPreprocessedCanvas(canvas, 215) ?? canvas).length > 0;
  if (!preHasInk) {
    recognizedPreview.textContent = "-";
    return;
  }
  await recognizeDigit(state.currentQuestion?.answer ?? null);
  if (state.recognitionOptions.length > 1) {
    state.recognitionOptionIndex = 1;
    recognizedPreview.textContent = state.recognitionOptions[state.recognitionOptionIndex];
    return;
  }
  // 候補が1つしか作れない場合も、最低10候補を展開
  state.recognitionOptions = orderOptionsWithCurrentFirst(
    generateExhaustiveOptions(
      state.recognitionOptions,
      state.currentQuestion?.answer ?? null,
      normalizeRecognizedDigits(recognizedPreview.textContent?.trim() || "")
    ),
    normalizeRecognizedDigits(recognizedPreview.textContent?.trim() || "")
  );
  if (state.recognitionOptions.length > 1) {
    state.recognitionOptionIndex = 1;
    recognizedPreview.textContent = state.recognitionOptions[state.recognitionOptionIndex];
  }
}

function handleKeyInput(key) {
  if (key === "back") {
    state.typedAnswer = state.typedAnswer.slice(0, -1);
  } else if (key === "ok") {
    checkAnswer();
    return;
  } else if (state.typedAnswer.length < 3) {
    state.typedAnswer += key;
  }

  const showText = state.typedAnswer || "-";
  keypadDisplay.textContent = showText;
  recognizedPreview.textContent = showText;
}

function showResultMark(isCorrect) {
  if (!resultMark) return;
  resultMark.textContent = isCorrect ? "〇" : "×";
  resultMark.classList.remove("correct", "wrong");
  resultMark.classList.add(isCorrect ? "correct" : "wrong", "show");

  setTimeout(() => {
    resultMark.classList.remove("show");
  }, 760);
}

function playFallbackTone(isCorrect) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const audioCtx = new AudioCtx();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(isCorrect ? 880 : 230, now);
  if (isCorrect) {
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.22);
}

function tryPlayAudioFromCandidates(candidates, index = 0) {
  if (index >= candidates.length) return Promise.reject(new Error("no-audio-source"));
  const audio = new Audio(candidates[index]);
  audio.preload = "auto";
  audio.volume = 0.95;
  return audio.play().catch(() => tryPlayAudioFromCandidates(candidates, index + 1));
}

function playResultSound(isCorrect) {
  const candidates = isCorrect ? soundCandidates.correct : soundCandidates.wrong;
  tryPlayAudioFromCandidates(candidates).catch(() => {
    playFallbackTone(isCorrect);
  });
}

function movePupil(eye, pupil, clientX, clientY) {
  const rect = eye.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = clientX - centerX;
  const deltaY = clientY - centerY;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const maxMove = 11;
  const moveRatio = Math.min(maxMove, distance) / distance;
  const x = deltaX * moveRatio;
  const y = deltaY * moveRatio;
  pupil.style.transform = `translate(${x}px, ${y}px)`;
}

function trackEyesFromPoint(clientX, clientY) {
  eyes.forEach((eye, index) => {
    const pupil = pupils[index];
    if (!pupil) return;
    movePupil(eye, pupil, clientX, clientY);
  });
}

function resetEyes() {
  pupils.forEach((pupil) => {
    pupil.style.transform = "translate(0, 0)";
  });
}

modeSelect.addEventListener("change", () => {
  state.mode = modeSelect.value;
  startNewRound();
});

answerBtn.addEventListener("click", checkAnswer);
clearCanvasBtn.addEventListener("click", () => {
  clearCanvas();
  recognizedPreview.textContent = "-";
});
toggleInputBtn.addEventListener("click", toggleInputMode);
retryRecognizeBtn.addEventListener("click", retryRecognition);
backToDrawBtn.addEventListener("click", () => {
  if (state.inputMode === "keypad") {
    toggleInputMode();
  }
});
wrongAnswerNextBtn.addEventListener("click", () => {
  if (!state.waitingWrongConfirm) return;
  state.waitingWrongConfirm = false;
  wrongAnswerOverlay.classList.add("hidden");
  setAnswerButtonBusy(false);
  proceedToNextQuestion();
});
playAgainBtn.addEventListener("click", startNewRound);

keyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleKeyInput(button.dataset.key);
  });
});

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawMove);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", drawMove, { passive: false });
window.addEventListener("touchend", endDraw);
window.addEventListener("mousemove", (event) => {
  trackEyesFromPoint(event.clientX, event.clientY);
});
window.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    trackEyesFromPoint(touch.clientX, touch.clientY);
  },
  { passive: true }
);
window.addEventListener("mouseleave", resetEyes);

setCanvasStyle();
nextQuestion();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Service Worker registration is optional.
    });
  });
}

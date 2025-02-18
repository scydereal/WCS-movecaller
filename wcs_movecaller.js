const HTMLcolors = [
    'orange', 'limegreen', 'dodgerblue', 'red', 'linen', 'cyan', 'magenta', 'darkgoldenrod', 'chartreuse', 'salmon', 'gold', 'lightseagreen', 'deeppink', 'sandybrown','darkgreen', 'slateblue', 'brown', 'wheat', 'deepskyblue', 'darkviolet', 'goldenrod', 'darkolivegreen', 'darksalmon', 'gold', 'lightskyblue', 'plum', 'coral', 'powderblue', 'crimson', 'tan', 'darkmagenta', 'sienna', 'tan', 'orchid', 'blue',
];

// sadly, we count on the fact that string keys (non-integers) are ordered in
// insertion order and just keep a dict, deriving the ordered MOVE_NAMES arr
// from it. the type is: move name : [count, [weights]]. default weight = 2.
// weights: everything is relative, but actual weight is squared
let MOVE_LIBRARY = JSON.parse(localStorage.getItem("MOVE_LIBRARY")) || {
    "left side pass": [6, [1, 0, 2, 3, 2, 2, 2, 2, 2, 3]],
    "under arm turn": [6, [2, 2, 2, 0, 2, 2, 2, 2, 2, 0]],
    "basic whip":     [8, [2, 2, 2, 3, 2, 2, 2, 2, 2, 3]],
    "basket whip":    [8, [2, 2, 2, 0, 2, 2, 2, 2, 2, 0]],
    "sugar push":     [6, [2, 2, 2, 3, 2, 2, 2, 2, 2, 3]],
    "sugar tuck":     [6, [0, 2, 1, 0, 3, 0, 0, 3, 0, 0]],
    "traveling tuck": [6, [2, 2, 2, 0, 2, 2, 2, 2, 2, 0]],
    "inside turn":    [6, [2, 2, 3, 0, 2, 3, 3, 2, 3, 0]],
    "outside turn":   [6, [2, 3, 2, 0, 2, 2, 2, 3, 2, 0]],
    "free turn":      [6, [2, 2, 3, 0, 2, 3, 3, 2, 3, 0]],
}
let MOVE_NAMES = Object.keys(MOVE_LIBRARY);
let utterances = MOVE_NAMES.map(move => new SpeechSynthesisUtterance(move));
function onMoveLibChange() {
    MOVE_NAMES = Object.keys(MOVE_LIBRARY);
    utterances = MOVE_NAMES.map(move => new SpeechSynthesisUtterance(move));
}

function addToLib(move) {
    const newMovesetSize = MOVE_NAMES.length + 1;

    const count = move.includes("whip") ? 8 : 6; // super basic heuristic
    const weights = Array.from({ length: newMovesetSize }, () => 2);

    for (let key in MOVE_LIBRARY) {
        MOVE_LIBRARY[key][1].push(2);
    }

    MOVE_LIBRARY[move] = [count, weights];
    onMoveLibChange();
    createTM();
    // saveMoveLibrary();
}

function removeFromLib(move) {
    delete MOVE_LIBRARY[move];
    onMoveLibChange();
    createTM();
    // saveMoveLibrary();
}

function saveMoveLibrary() {
    localStorage.setItem("MOVE_LIBRARY", JSON.stringify(MOVE_LIBRARY));
}

function createCellCircle(row, col, size) {
    const circle = document.createElement("div");
    circle.id = `${row}-${col}`;
    circle.classList.add("circle");
    circle.classList.add(`size${size}`);
    return circle;
}

function createTM() {
    const matrix = document.querySelector(".transition-matrix");
    matrix.innerHTML = ""; // Clear existing table
    const table = document.createElement("table");
    table.classList.add("transition-table");

    // Create table header row
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th")); // Empty top-left corner

    for (let col = 0; col < MOVE_NAMES.length; col++) {
        const colHeader = document.createElement("th");
        colHeader.classList.add("circle-container", "header-circle");
        colHeader.id = `${col}`;

        const daughter = document.createElement("div");
        daughter.classList.add("circle");
        daughter.style.backgroundColor = HTMLcolors[col];

        colHeader.appendChild(daughter);
        headerRow.appendChild(colHeader);
    }
    const sixOrEight = document.createElement("th");
    sixOrEight.textContent = "6/8";
    headerRow.appendChild(sixOrEight);
    table.appendChild(headerRow);

    // Create table body
    for (let row = 0; row < MOVE_NAMES.length; row++) {
        const tr = document.createElement("tr");

        const rowLabel = document.createElement("th");
        const moveName = MOVE_NAMES[row];
        const moveCount = MOVE_LIBRARY[moveName][0];
        const nextMoveFreqs = MOVE_LIBRARY[moveName][1];
        rowLabel.textContent = moveName;
        rowLabel.style.color = HTMLcolors[row];
        rowLabel.style.textAlign = 'right';
        tr.appendChild(rowLabel);

        for (let col = 0; col < MOVE_NAMES.length; col++) {
            const cell = document.createElement("td");
            cell.classList.add("circle-container");
            let size = nextMoveFreqs[col];
            const daughter = createCellCircle(row, col, size);
            cell.appendChild(daughter);
            tr.appendChild(cell);
        }

        tr.appendChild(createToggle(moveCount));
        tr.appendChild(createXButton());
        table.appendChild(tr);
    }

    matrix.appendChild(table);
    setCellBorders();
}

function setCellBorders() {
    const matrix = document.querySelector(".transition-table");
    const rows = matrix.querySelectorAll("tr");

    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll("td");
        cells.forEach((cell, colIndex) => {
            if (cell.classList.contains("circle-container")) {
                cell.style.borderRight = "1px solid " + HTMLcolors[colIndex];
                cell.style.borderBottom = "1px solid " + HTMLcolors[rowIndex-1];
            }
        });
    });
}

function createToggle(moveCount) {
    const toggle = document.createElement("div");
    toggle.classList.add("toggle-switch");
    const circle = document.createElement("div");
    circle.classList.add("toggle-circle");
    toggle.appendChild(circle);
    
    let isSix = true;
    const toggleCallback = () => {
        isSix = !isSix;
        circle.style.transform = isSix ? "translateX(0)" : "translateX(11px)";
        toggle.setAttribute("data-value", isSix ? "6" : "8");

        const row = circle.closest("tr"); // Find the nearest table row
        if (!row) return;
        const firstTH = row.querySelector("th"); // Find the first <th> in the row
        if (!firstTH) return;
        MOVE_LIBRARY[firstTH.textContent][0] = isSix ? 6 : 8;
    }
    if (moveCount == 8) toggleCallback();
    //setTimeout(toggleCallback, 100); // wait. I don't understand why but the above works and I don't need the timeout.

    toggle.addEventListener("click", toggleCallback);

    let toggleCell = document.createElement("td"); 
    toggleCell.appendChild(toggle);
    return toggleCell;
}

function createXButton() {
    const button = document.createElement("button");
    button.textContent = "✕"; // Unicode "X"
    button.classList.add("x-button");

    button.addEventListener("click", () => {
        const row = button.closest("tr"); // Find the nearest table row
        if (!row) return;
        const firstTH = row.querySelector("th"); // Find the first <th> in the row
        if (!firstTH) return;
        removeFromLib(firstTH.textContent);
    });

    let xCell = document.createElement("td"); 
    xCell.appendChild(button);

    return xCell;
}

// +++ Create initial TM and set callbacks on the TM components

createTM();

document.querySelector(".input-container input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const moveName = event.target.value.trim();
        if (moveName) {
            addToLib(moveName);
            event.target.value = ""; // Clear input after adding
        }
    }
});

function updateTransitionMatrixCell(row, col, val) { // val is 0, 1, 2, 3
    MOVE_LIBRARY[MOVE_NAMES[row]][1][col] = val;
    const circle = document.getElementById(`${row}-${col}`);
    let currentSize = [...circle.classList].find(cls => cls.startsWith("size"));
    circle.classList.replace(currentSize, `size${val}`);
}

// -1 (heteregeneous) or 0, 1, 2, 3 (homogeneous, to that value)
function getColumnHomogeneity(col) {
    let homogeneous = MOVE_LIBRARY[MOVE_NAMES[0]][1][col];
    for (let i = 1; i < MOVE_NAMES.length; i++) {
        if (MOVE_LIBRARY[MOVE_NAMES[i-1]][1][col] != MOVE_LIBRARY[MOVE_NAMES[i]][1][col]) {
            homogeneous = -1;
        }
    }
    return homogeneous;
}

document.addEventListener("click", (event) => {
    let columnHeaderCircle = event.target.classList.contains("header-circle") 
        ? event.target 
        : event.target.closest(".header-circle"); // Find nearest container if clicked on circle
    if (!columnHeaderCircle) return;

    let col = columnHeaderCircle.id;
    const columnHeterogeneity = getColumnHomogeneity(col);
    const newVal = columnHeterogeneity < 0 ? 0 : (columnHeterogeneity+1)%4;
    for (let i = 0; i < MOVE_NAMES.length; i++) updateTransitionMatrixCell(i, col, newVal); 
});

document.addEventListener("click", (event) => {
    let container = event.target.classList.contains("circle-container") 
        ? event.target 
        : event.target.closest(".circle-container"); // Find nearest container if clicked on circle
    if (!container) return;
    const circle = container.querySelector(".circle");
    if (!circle) return;

    let currentSize = [...circle.classList].find(cls => cls.startsWith("size"));

    if (currentSize) {
        let curSize = parseInt(currentSize.replace("size", ""), 10);
        let [row, col] = circle.id.split("-").map(Number);
        updateTransitionMatrixCell(row, col, (curSize + 1) % 4);
        // saveMoveLibrary();
    }
});

// +++ audio consts
FIRST_BEAT_FREQ = 880
AND_FREQ = 415.4
DEFAULT_BPM = 90
BEAT_NEXT_MOVE_NOTICE = 3;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const defaultVolume = audioCtx.createGain();
defaultVolume.gain.value = 0.5;
defaultVolume.connect(audioCtx.destination);

// +++ bpm JS

const bpmSlider = document.getElementById("bpm");
const bpmValue = document.getElementById("bpm-value");

bpmSlider.addEventListener("input", () => {
    bpmValue.textContent = bpmSlider.value;
});


// +++ the beeps and speaks

function speakRandomMove() {
    const utterance = utterances[Math.floor(Math.random() * utterances.length)];
    speechSynthesis.speak(utterance);
}

function playBeep(time, freq=440) {
    const oscillator = audioCtx.createOscillator();
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    oscillator.connect(defaultVolume);

    // audioCtx.currentTime is measured in seconds
    oscillator.start(audioCtx.currentTime + time / 1000);
    oscillator.stop(audioCtx.currentTime + time/1000 + 0.15);
}

function playSixCount(bpm = DEFAULT_BPM) {
    const beatIntervalMs = (60 / bpm) * 1000;
    // these funcs get called all essentially at the same time, but schedule it out first_arg milliseconds
    playBeep(beatIntervalMs*1, freq=FIRST_BEAT_FREQ); // Beats 2-6 (Ping)
    playBeep(beatIntervalMs*2);
    playBeep(beatIntervalMs*3);
    playBeep(beatIntervalMs*3.5, freq=AND_FREQ);
    playBeep(beatIntervalMs*4);
    playBeep(beatIntervalMs*5);
    playBeep(beatIntervalMs*5.5, freq=AND_FREQ);
    playBeep(beatIntervalMs*6);
}

function playEightcount(bpm = DEFAULT_BPM) {
    const beatIntervalMs = (60 / bpm) * 1000;

    playBeep(beatIntervalMs*1, freq=FIRST_BEAT_FREQ); // Beats 2-6 (Ping)
    playBeep(beatIntervalMs*2);
    playBeep(beatIntervalMs*3);
    playBeep(beatIntervalMs*3.5, freq=AND_FREQ);
    playBeep(beatIntervalMs*4);
    playBeep(beatIntervalMs*5);
    playBeep(beatIntervalMs*6);
    playBeep(beatIntervalMs*7);
    playBeep(beatIntervalMs*7.5, freq=AND_FREQ);
    playBeep(beatIntervalMs*8);
}

let isPlaying = false;
const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playEightcount(bpmSlider.value);
    speakRandomMove();

    isPlaying = !isPlaying;
    playButton.textContent = isPlaying ? "■" : "▶";
});

// +++ Transition matrix logic - no need to contort, just get it from user

function weightedRandomIndex(weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    return weights.findIndex(w => (rand -= w) < 0);
}

// get str, return str
function chooseNextMove(move) {
    const weights = MOVE_LIBRARY[move];
    const squared = weights.map(x => x ** 2);
    const index = weightedRandomChoice(squared);
    return MOVE_NAMES[index];
}

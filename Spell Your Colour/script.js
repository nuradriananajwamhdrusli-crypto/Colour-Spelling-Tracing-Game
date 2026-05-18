// Game Elements
const canvas = document.getElementById('tracingCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const messageOverlay = document.getElementById('message-overlay');
const successMsg = document.getElementById('success-msg');
const progressFill = document.getElementById('progress-fill');

// Game State Variables
let currentColor = '';
let currentWord = '';
let currentLetterIndex = 0;
let currentLevel = 1; // 1 = Uppercase, 2 = Lowercase
let isDrawing = false;
let totalLetterPixels = 0;
let brushSize = 15; // How thick the tracing brush is

// Colour Definitions
const colorMap = {
    red: '#ff4d4d',
    blue: '#4d94ff',
    green: '#2ecc71',
    yellow: '#f1c40f',
    pink: '#ff85a2'
};

// Setup internal canvas resolution (keeps drawing sharp)
canvas.width = 600;
canvas.height = 400;

// ==========================================
// EVENT LISTENERS
// ==========================================

// Color Buttons
document.querySelectorAll('.btn-color').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.color));
});

// Navigation Buttons
document.getElementById('home-btn').addEventListener('click', () => location.reload());
document.getElementById('restart-btn').addEventListener('click', () => initLevel());

// Mouse & Touch Tracing Events
canvas.addEventListener('mousedown', startTracing);
canvas.addEventListener('mousemove', trace);
canvas.addEventListener('mouseup', stopTracing);
canvas.addEventListener('mouseleave', stopTracing);

// Touch support for tablets/phones
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startTracing(e.touches[0]); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); trace(e.touches[0]); });
canvas.addEventListener('touchend', stopTracing);

// ==========================================
// GAME FLOW LOGIC
// ==========================================

function startGame(color) {
    currentColor = color;
    currentLevel = 1; // Start with capital letters
    currentWord = color.toUpperCase();
    
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    initLevel();
}

function initLevel() {
    currentLetterIndex = 0;
    messageOverlay.classList.add('hidden');
    updateProgress();
    loadLetter();
}

function loadLetter() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const letter = currentWord[currentLetterIndex];
    
    // 1. Draw the faded template letter
    ctx.font = "bold 250px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Add '44' to the hex code to make it highly transparent (faded)
    ctx.fillStyle = colorMap[currentColor] + "44"; 
    ctx.fillText(letter, canvas.width / 2, canvas.height / 2);
    
    // 2. Scan the canvas to count how many pixels make up this letter
    calculateTargetPixels();
}

function updateProgress() {
    const totalLetters = currentWord.length;
    const progress = (currentLetterIndex / totalLetters) * 100;
    progressFill.style.width = progress + "%";
}

// ==========================================
// TRACING LOGIC
// ==========================================

function calculateTargetPixels() {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    totalLetterPixels = 0;
    // imgData is a flat array [R, G, B, Alpha, R, G, B, Alpha...]
    // We check every 4th value (Alpha) to see if a pixel is drawn
    for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] > 0) {
            totalLetterPixels++;
        }
    }
}

function startTracing(e) {
    isDrawing = true;
    trace(e); // Paint a dot immediately on click/touch
}

function stopTracing() {
    if (!isDrawing) return;
    isDrawing = false;
    checkCompletion(); // Verify if they traced enough when they let go
}

function trace(e) {
    if (!isDrawing) return;

    // Calculate mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Read the single pixel under the mouse
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    
    // Check Alpha channel (pixel[3]). If it's > 0, they are inside the faded letter!
    if (pixel[3] > 0) {
        // Draw bright color
        ctx.fillStyle = colorMap[currentColor];
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Occasionally check completion while dragging to feel responsive
        if (Math.random() < 0.1) checkCompletion(); 
    }
}

function checkCompletion() {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let brightPixels = 0;
    
    for (let i = 3; i < imgData.length; i += 4) {
        // Fully opaque pixels (Alpha = 255) indicate the user has traced there
        if (imgData[i] === 255) {
            brightPixels++;
        }
    }

    // Requirement: Must trace at least 80% correctly
    const completionRatio = brightPixels / totalLetterPixels;
    
    if (completionRatio >= 0.80) {
        isDrawing = false;
        handleLetterSuccess();
    }
}

// ==========================================
// FEEDBACK & SOUND
// ==========================================

function handleLetterSuccess() {
    playSuccessSound();
    
    // Fill the rest of the letter completely to show success
    const letter = currentWord[currentLetterIndex];
    ctx.fillStyle = colorMap[currentColor];
    ctx.fillText(letter, canvas.width / 2, canvas.height / 2);
    
    currentLetterIndex++;
    updateProgress();

    // Check if word is finished
    if (currentLetterIndex < currentWord.length) {
        setTimeout(loadLetter, 800); // Load next letter after brief pause
    } else {
        setTimeout(handleWordComplete, 500);
    }
}

function handleWordComplete() {
    if (currentLevel === 1) {
        // Move to lowercase level
        currentLevel = 2;
        currentWord = currentColor.toLowerCase();
        
        successMsg.innerText = "Level 1 Done!";
        messageOverlay.classList.remove('hidden');
        
        setTimeout(() => {
            initLevel();
        }, 2500);
    } else {
        // Color complete!
        successMsg.innerText = "Great Job!";
        messageOverlay.classList.remove('hidden');
        
        setTimeout(() => {
            location.reload(); // Return to start screen
        }, 3000);
    }
}

// Offline synthesized sound effect (No external files needed)
function playSuccessSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // Slide to C6
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.log("Audio not supported or disabled");
    }
}
// Global variables
let bubbles = [];
let currentPath = [];
let stanzas = [];
let currentStanzaText = [];
let mode = 'lock'; // Always lock mode
let rows = 4;
let cols = 6;
let bubbleSize = 75;
let includePunctuation = false; // Always exclude punctuation
let isDragging = false;
let hoveredBubble = null;
let canvasWidth, canvasHeight;
let morseCodeLevel = 0; // 0-100, controls how much text is morse coded

// RiTa Markov for text generation
let markov = null;
let gehryEssay = null;
let gehryInterview = null;

// Morse code mapping
const morseCode = {
    'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.',
    'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..',
    'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.',
    's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
    'y': '-.--', 'z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ',': '--..--', '.': '.-.-.-', '?': '..--..',
    '!': '-.-.--', '-': '-....-', '/': '-..-.', ' ': '/'
};

// Convert text to Morse code
function textToMorse(text) {
    return text.toLowerCase()
        .split('')
        .map(char => morseCode[char] || char)
        .join(' ');
}

// Calculate morse code percentage based on bubble size
// Larger bubble = more words converted to morse code
function getMorsePercentageFromSize(size) {
    // Map size 40-100 to percentage 0-100%
    let percentage = ((size - 40) / (100 - 40)) * 100;
    return Math.max(0, Math.min(100, percentage));
}

// Convert partial text to morse code based on percentage
function partialTextToMorse(text, percentage) {
    let words = text.split(' ');
    let numWordsToConvert = Math.ceil((words.length * percentage) / 100);

    // Convert first N words to morse, keep rest as normal text
    let result = words.map((word, index) => {
        if (index < numWordsToConvert) {
            return textToMorse(word);
        }
        return word;
    });

    return result.join(' ');
}

function preload() {
    // Load both Gehry texts
    gehryEssay = loadStrings('gehry_essay.txt');
    gehryInterview = loadStrings('gehry_interview.txt');
    // Font will be loaded via CSS
}

function setup() {
    // Show welcome popup on load
    showWelcomePopup();

    // Calculate canvas size - wait for DOM to be ready
    let container = document.getElementById('canvas-container');
    canvasWidth = container.offsetWidth || 800;
    canvasHeight = container.offsetHeight || 600;

    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');

    // Set font to Sometype Mono (loaded via CSS)
    textFont('Sometype Mono');

    // Add some debugging
    console.log('Canvas size:', canvasWidth, 'x', canvasHeight);
    console.log('Mode:', mode);


    // Create a markov model with n=3
    markov = RiTa.markov(3);

    // Load both texts into the model
    if (gehryEssay && gehryEssay.length > 0) {
        let essayText = gehryEssay.join(' ');
        markov.addText(essayText);
        console.log('Markov loaded with Gehry essay');
        console.log('Essay text length:', essayText.length);
    } else {
        console.log('ERROR: Essay not loaded!');
    }

    if (gehryInterview && gehryInterview.length > 0) {
        let interviewText = gehryInterview.join(' ');
        markov.addText(interviewText);
        console.log('Markov loaded with Gehry interview');
        console.log('Interview text length:', interviewText.length);
    } else {
        console.log('ERROR: Interview not loaded!');
    }

    console.log('Total model size:', markov.size());


    // Initialize bubbles and displays
    initializeBubbles();
    displayPatterns();

    // Event listeners
    document.getElementById('rows-slider').addEventListener('input', (e) => {
        rows = parseInt(e.target.value);
        document.getElementById('rows-value').textContent = rows;
        initializeBubbles();
    });

    document.getElementById('cols-slider').addEventListener('input', (e) => {
        cols = parseInt(e.target.value);
        document.getElementById('cols-value').textContent = cols;
        initializeBubbles();
    });

    // Morse code slider - update value and apply morse code in real-time
    document.getElementById('morse-slider').addEventListener('input', (e) => {
        morseCodeLevel = parseInt(e.target.value);
        document.getElementById('morse-value').textContent = morseCodeLevel;
        // Apply morse code in real-time
        applyMorseCodeToText();
    });

    document.getElementById('save-stanza').addEventListener('click', saveStanza);
    document.getElementById('finish-poem').addEventListener('click', finishPoem);
    document.getElementById('reset').addEventListener('click', resetAll);
    document.getElementById('export-poem').addEventListener('click', exportPoemOnly);
    document.getElementById('export-patterns').addEventListener('click', exportPatternsOnly);
    document.getElementById('export-all').addEventListener('click', exportAll);

    // Panel toggle functionality
    document.getElementById('text-panel-header').addEventListener('click', toggleTextPanel);
    document.getElementById('pattern-panel-header').addEventListener('click', togglePatternPanel);

    // Modal close functionality
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('export-modal').addEventListener('click', (e) => {
        if (e.target.id === 'export-modal') {
            closeModal();
        }
    });
}

// Close export modal
function closeModal() {
    document.getElementById('export-modal').style.display = 'none';
}

// Show welcome popup
function showWelcomePopup() {
    let popup = document.getElementById('welcome-popup');
    popup.style.display = 'flex';

    // Add close button listener
    document.getElementById('close-welcome').addEventListener('click', closeWelcomePopup);

    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target.id === 'welcome-popup') {
            closeWelcomePopup();
        }
    });
}

// Close welcome popup
function closeWelcomePopup() {
    document.getElementById('welcome-popup').style.display = 'none';
}

// Toggle text panel
function toggleTextPanel() {
    let content = document.getElementById('text-panel-content');
    let toggleBtn = document.getElementById('text-toggle');

    content.classList.toggle('collapsed');

    if (content.classList.contains('collapsed')) {
        toggleBtn.textContent = '+';
    } else {
        toggleBtn.textContent = '−';
    }
}

// Toggle pattern panel
function togglePatternPanel() {
    let content = document.getElementById('pattern-panel-content');
    let toggleBtn = document.getElementById('pattern-toggle');

    content.classList.toggle('collapsed');

    if (content.classList.contains('collapsed')) {
        toggleBtn.textContent = '+';
    } else {
        toggleBtn.textContent = '−';
    }
}

// Generate sentence from markov model
// Bubble size controls how much of the sentence gets converted to morse code
function generateMarkovText(currentBubble, bubbleSize) {
    if (!markov) {
        console.log('Markov not initialized');
        return {text: "Markov loading...", display: "..."};
    }

    try {
        let result = "";

        // If current bubble is punctuation, just return it
        if (!currentBubble || currentBubble.isPunctuation) {
            result = currentBubble.fragment;
            return {
                text: result,
                display: result
            };
        }

        // Use only the current bubble's keyword
        let keyword = currentBubble.fragment.trim();
        console.log('Current keyword:', keyword);

        // Generate a full sentence containing the keyword
        let attempts = 15;
        let bestSentence = null;
        let foundMatch = false;

        for (let i = 0; i < attempts; i++) {
            let sentences = markov.generate(1);
            let sentence = Array.isArray(sentences) ? sentences[0] : sentences;

            if (sentence) {
                // Check if keyword appears in this sentence (case insensitive)
                let lowerSentence = sentence.toLowerCase();
                let lowerKeyword = keyword.toLowerCase();

                if (lowerSentence.includes(lowerKeyword)) {
                    bestSentence = sentence;
                    foundMatch = true;
                    console.log(`Found sentence with keyword "${keyword}"`);
                    break;
                }

                // Keep first generated sentence as fallback
                if (!bestSentence) {
                    bestSentence = sentence;
                }
            }
        }

        // If we didn't find a match, try seed generation
        if (!foundMatch && keyword) {
            let seedSentence = generateSentenceFromSeed(keyword);
            bestSentence = seedSentence || bestSentence;
        }

        result = bestSentence || keyword;
        result = capitalizeFirstLetter(result);

        // Calculate morse percentage based on bubble size
        let morsePercentage = getMorsePercentageFromSize(bubbleSize);
        let displayText = partialTextToMorse(result, morsePercentage);

        console.log('Generated sentence:', result);
        console.log('Morse percentage:', morsePercentage.toFixed(1) + '%');
        console.log('Display text:', displayText);

        return {
            text: result, // Original sentence
            display: displayText // Partially morse-coded version
        };

    } catch(e) {
        console.error('Markov error:', e.message);
        console.error('Stack:', e.stack);
        return {
            text: currentBubble.fragment,
            display: currentBubble.fragment
        };
    }
}

// Helper to generate sentence from seed
function generateSentenceFromSeed(keyword) {
    try {
        let words = keyword.split(' ');
        let seed = words[0];

        let result = markov.generate(1, {seed: seed});
        if (result && result.length > 0) {
            let sentence = Array.isArray(result) ? result[0] : result;
            return sentence;
        }
    } catch(e) {
        console.log('Seed generation failed for:', keyword);
    }
    return null;
}

// Helper function to capitalize first letter of a sentence
function capitalizeFirstLetter(str) {
    if (!str || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to construct a sentence incorporating a single keyword
function constructSentenceWithKeyword(keyword) {
    if (!keyword) {
        let result = markov.generate(1);
        let sentence = Array.isArray(result) ? result[0] : result;
        return capitalizeFirstLetter(sentence);
    }

    try {
        // Use the keyword as a seed for generation
        let words = keyword.split(' ');
        let seed = words[0]; // Use first word as seed

        // Try to generate from this seed
        let result = markov.generate(1, {seed: seed});
        if (result && result.length > 0) {
            let sentence = Array.isArray(result) ? result[0] : result;
            return capitalizeFirstLetter(sentence);
        }
    } catch(e) {
        console.log('Seed generation failed for:', keyword);
    }

    // Fallback: insert keyword into a generated sentence
    try {
        let sentences = markov.generate(1);
        let baseSentence = Array.isArray(sentences) ? sentences[0] : sentences;

        if (baseSentence) {
            // Insert keyword at a natural position (e.g., beginning or middle)
            let words = baseSentence.split(' ');
            let insertPos = Math.floor(words.length / 2);
            words.splice(insertPos, 0, keyword);
            return capitalizeFirstLetter(words.join(' '));
        }
    } catch(e) {
        console.log('Fallback construction failed');
    }

    // Last resort: just return the keyword capitalized
    return capitalizeFirstLetter(keyword);
}

function initializeBubbles() {
    bubbles = [];
    currentPath = [];
    currentStanzaText = [];

    let totalBubbles = rows * cols;
    let fragments = getRandomFragments(totalBubbles, includePunctuation);

    let marginX = 80;
    let marginY = 80;
    let spacingX = (canvasWidth - 2 * marginX) / (cols - 1);
    let spacingY = (canvasHeight - 2 * marginY) / (rows - 1);

    let index = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (index < fragments.length) {
                bubbles.push({
                    x: marginX + c * spacingX,
                    y: marginY + r * spacingY,
                    fragment: fragments[index].fragment,
                    sentence: fragments[index].sentence,
                    isPunctuation: fragments[index].isPunctuation || false,
                    revealed: false, // Always start hidden in lock mode
                    selected: false,
                    hidden: false, // Track if bubble is hidden after saving pattern
                    size: bubbleSize, // Individual bubble size
                    generatedText: null, // Will store generated text
                    displayText: null // Will store partially morse-coded text
                });
                index++;
            }
        }
    }

    console.log('Initialized', bubbles.length, 'bubbles');
    console.log('First bubble:', bubbles[0]);

    updateCurrentStanzaDisplay();
}

function draw() {
    background(255);

    // Draw paths
    strokeWeight(3);
    stroke(0);
    noFill();

    if (currentPath.length > 1) {
        beginShape();
        for (let i = 0; i < currentPath.length; i++) {
            vertex(currentPath[i].x, currentPath[i].y);
        }
        endShape();
    }

    // Draw bubbles
    for (let bubble of bubbles) {
        drawBubble(bubble);
    }

    // Draw hover effect
    if (hoveredBubble && !isDragging) {
        drawSentenceHover(hoveredBubble);
    }
}

function drawBubble(bubble) {
    // Skip hidden bubbles
    if (bubble.hidden) {
        return;
    }

    push();

    // Check if this bubble is being hovered
    let isHovered = hoveredBubble === bubble;
    let currentSize = bubble.size; // Use bubble's individual size

    // Grow bubble on hover
    if (isHovered && !bubble.selected) {
        currentSize = bubble.size + 20; // Grow by 10px radius (20px diameter)
    }

    // Bubble appearance
    if (bubble.selected) {
        fill(0);
        stroke(0);
    } else if (isHovered) {
        fill(0); // Black on hover
        stroke(0);
    } else {
        fill(255);
        stroke(0);
    }

    strokeWeight(2);
    circle(bubble.x, bubble.y, currentSize);

    // Text
    if (bubble.revealed) {
        // White text on hover, black otherwise
        if (isHovered && !bubble.selected) {
            fill(255); // White text on hover
        } else if (bubble.selected) {
            fill(255); // White text when selected
        } else {
            fill(0); // Black text normally
        }
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(NORMAL);

        // Always show fragment (keyword), never show generated text in bubble
        let displayText = bubble.fragment;

        // Adjust text size based on content length and bubble size
        if (bubble.isPunctuation) {
            textSize(24);
            text(displayText, bubble.x, bubble.y);
        } else {
            // Calculate appropriate text size with minimum of 14px
            let fragmentLength = displayText.length;
            let baseSize = currentSize / 5.5;
            let calculatedSize;

            if (fragmentLength > 50) {
                calculatedSize = baseSize * 0.5;
            } else if (fragmentLength > 30) {
                calculatedSize = baseSize * 0.6;
            } else if (fragmentLength > 20) {
                calculatedSize = baseSize * 0.7;
            } else if (fragmentLength > 15) {
                calculatedSize = baseSize * 0.8;
            } else if (fragmentLength > 10) {
                calculatedSize = baseSize - 1;
            } else {
                calculatedSize = baseSize * 1.2;
            }

            // Ensure minimum font size of 12px (reduced by 2px)
            let finalTextSize = Math.max(12, calculatedSize - 2);
            textSize(finalTextSize);

            // Multi-line text within bubble
            let maxWidth = currentSize * 0.85;
            let words = displayText.split(' ');
            let lines = [];
            let currentLine = '';

            for (let word of words) {
                let testLine = currentLine + (currentLine ? ' ' : '') + word;
                if (textWidth(testLine) > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);

            // Draw lines
            let lineHeight = textAscent() + textDescent() + 2;
            let startY = bubble.y - (lines.length - 1) * lineHeight / 2;

            for (let i = 0; i < lines.length; i++) {
                text(lines[i], bubble.x, startY + i * lineHeight);
            }
        }
    }

    pop();
}

function drawSentenceHover(bubble) {
    if (!bubble.sentence || !bubble.fragment) return;

    // Extract context: 5 words before and 5 words after the fragment
    let fragment = bubble.fragment.toLowerCase();

    // Split sentence into words
    let words = bubble.sentence.split(/\s+/);

    // Find the index of the fragment word
    let fragmentIndex = -1;
    for (let i = 0; i < words.length; i++) {
        if (words[i].toLowerCase().includes(fragment)) {
            fragmentIndex = i;
            break;
        }
    }

    if (fragmentIndex === -1) return; // Fragment not found in sentence

    // Get 5 words before and 5 words after
    let startIndex = Math.max(0, fragmentIndex - 5);
    let endIndex = Math.min(words.length, fragmentIndex + 6); // +6 because slice is exclusive

    let contextWords = words.slice(startIndex, endIndex);
    let contextText = contextWords.join(' ');

    // Add ellipsis if truncated
    if (startIndex > 0) contextText = '...' + contextText;
    if (endIndex < words.length) contextText = contextText + '...';

    push();
    fill(50, 50, 50, 30);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);

    // Background for context
    let txtWidth = textWidth(contextText);
    let lines = Math.ceil(txtWidth / (canvasWidth - 100));
    let boxHeight = lines * 20 + 20;

    fill(0);
    stroke(200);
    strokeWeight(1);
    rect(50, bubble.y - bubbleSize - boxHeight - 10, canvasWidth - 100, boxHeight, 5);

    fill(255);
    noStroke();
    text(contextText, 50, bubble.y - bubbleSize - boxHeight - 10, canvasWidth - 100, boxHeight);

    pop();
}

function mousePressed() {
    if (mode === 'lock') {
        isDragging = true;
        let bubble = getBubbleAtMouse();
        if (bubble) {
            selectBubble(bubble);
        }
    } else {
        // Fragment mode - click
        let bubble = getBubbleAtMouse();
        if (bubble) {
            selectBubble(bubble);
        }
    }
}

function mouseDragged() {
    let bubble = getBubbleAtMouse();
    if (bubble && !bubble.selected) {
        if (mode === 'lock') {
            if (isDragging) {
                selectBubble(bubble);
            }
        } else {
            // Fragment mode - also works with dragging
            selectBubble(bubble);
        }
    }
}

function mouseReleased() {
    isDragging = false;
}

function mouseMoved() {
    hoveredBubble = getBubbleAtMouse();
}

function getBubbleAtMouse() {
    for (let bubble of bubbles) {
        // Skip hidden bubbles
        if (bubble.hidden) {
            continue;
        }
        let d = dist(mouseX, mouseY, bubble.x, bubble.y);
        if (d < bubble.size / 2) {
            return bubble;
        }
    }
    return null;
}

// Handle right-click to adjust bubble size
function mouseClicked(event) {
    if (event.button === 2) { // Right click
        event.preventDefault();
        let bubble = getBubbleAtMouse();
        if (bubble && !bubble.selected) {
            showBubbleSizeControl(bubble);
        }
        return false;
    }
}

// Show size control for individual bubble
function showBubbleSizeControl(bubble) {
    // Create a prompt for size adjustment
    let newSize = prompt(`Adjust bubble size (current: ${bubble.size}, range: 40-100):\nLarger = more morse code`, bubble.size);
    if (newSize !== null) {
        newSize = parseInt(newSize);
        if (newSize >= 40 && newSize <= 100) {
            bubble.size = newSize;

            // If bubble is already selected, regenerate with new size
            if (bubble.selected) {
                let generated = generateMarkovText(bubble, bubble.size);
                bubble.generatedText = generated.text;
                bubble.displayText = generated.display;

                // Update in currentStanzaText array (with morse code)
                let bubbleIndex = currentPath.findIndex(p => p.x === bubble.x && p.y === bubble.y);
                if (bubbleIndex >= 0 && bubbleIndex < currentStanzaText.length) {
                    currentStanzaText[bubbleIndex] = generated.display;
                }

                updateCurrentStanzaDisplay();
            }
        } else {
            alert('Size must be between 40 and 100');
        }
    }
}

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
});

function selectBubble(bubble) {
    if (!bubble.selected) {
        bubble.selected = true;
        bubble.revealed = true;
        // Store bubble reference with position (size will be updated when morse code is applied)
        currentPath.push({x: bubble.x, y: bubble.y, size: 75, bubble: bubble}); // Default size

        // Generate new sentence from markov (NO morse code yet)
        let generated = generateMarkovText(bubble, 0); // Pass 0 to generate without morse
        bubble.generatedText = generated.text; // Store original sentence
        bubble.displayText = generated.text; // Initially same as original

        // Append original text to left panel (no morse code yet)
        if (currentStanzaText.length === 0) {
            currentStanzaText = [generated.text];
        } else {
            currentStanzaText.push(generated.text);
        }

        // Brief sentence reveal
        if (bubble.sentence) {
            hoveredBubble = bubble;
            setTimeout(() => {
                if (!isDragging) hoveredBubble = null;
            }, 800);
        }

        updateCurrentStanzaDisplay();
    }
}

// Apply morse code to all generated text based on slider value
function applyMorseCodeToText() {
    if (currentStanzaText.length === 0) {
        alert('Please select some bubbles first to generate text');
        return;
    }

    console.log(`Applying ${morseCodeLevel}% morse code to text`);

    // Update each bubble's display text with morse code AND update size in currentPath
    for (let i = 0; i < currentPath.length; i++) {
        let pathPoint = currentPath[i];
        let bubble = pathPoint.bubble;

        if (bubble && bubble.generatedText) {
            // Apply morse code based on global slider value
            bubble.displayText = partialTextToMorse(bubble.generatedText, morseCodeLevel);
            currentStanzaText[i] = bubble.displayText;

            // Higher morse level = MORE variation in bubble sizes
            // Calculate random variation range based on morse level
            let variationRange = map(morseCodeLevel, 0, 100, 0, 60); // 0% = no variation, 100% = ±30px variation

            // Base size at midpoint (70)
            let baseSize = 70;

            // Add random variation (can be positive or negative)
            let randomVariation = random(-variationRange/2, variationRange/2);
            let finalSize = baseSize + randomVariation;

            // Clamp to valid range (40-100)
            pathPoint.size = constrain(finalSize, 40, 100);
        }
    }

    updateCurrentStanzaDisplay();
    console.log(`Morse code applied: ${morseCodeLevel}% -> bubble sizes randomized with variation range: ${map(morseCodeLevel, 0, 100, 0, 60).toFixed(1)}px`);
}

function updateCurrentStanzaDisplay() {
    let display = document.getElementById('poem-display');
    let currentText = currentStanzaText.join(' ');

    // Show current stanza being composed
    if (currentText) {
        let currentDiv = document.querySelector('.current-stanza-text');
        if (!currentDiv) {
            currentDiv = document.createElement('div');
            currentDiv.className = 'current-stanza-text';
            display.appendChild(currentDiv);
        }
        // Display text immediately (no typewriter effect)
        currentDiv.textContent = currentText;
    }
}

// Display all saved patterns in the gallery
function displayPatterns() {
    let gallery = document.getElementById('patterns-gallery');
    gallery.innerHTML = '';

    if (stanzas.length === 0) {
        return;
    }

    for (let i = 0; i < stanzas.length; i++) {
        let img = document.createElement('img');
        img.className = 'pattern-img';
        img.src = stanzas[i].image;
        img.alt = `Pattern ${i + 1}`;
        gallery.appendChild(img);
    }
}

// Save current stanza and reset for next one
function saveStanza() {
    if (currentStanzaText.length === 0) {
        alert('Create a pattern first by selecting bubbles');
        return;
    }

    // ============================================
    // PATTERN VISUAL SETTINGS - ADJUST HERE
    // ============================================
    let patternCanvasSize = 600;      // Pattern canvas size (square)
    let patternPadding = 25;           // Padding around pattern
    let patternLineWeight = 3;         // Connecting lines thickness
    let patternBubbleStroke = 2;       // Bubble outline thickness
    let patternDotSizeMin = 6;         // Minimum dot size (for smallest bubble)
    let patternDotSizeMax = 60;        // Maximum dot size (for largest bubble)
    let patternArrowSize = 15;         // Arrow size at end
    // ============================================

    // Generate pattern image
    let stanzaCanvas = createGraphics(patternCanvasSize, patternCanvasSize);
    stanzaCanvas.background(255);

    if (currentPath.length > 1) {
        let minX = Math.min(...currentPath.map(p => p.x));
        let maxX = Math.max(...currentPath.map(p => p.x));
        let minY = Math.min(...currentPath.map(p => p.y));
        let maxY = Math.max(...currentPath.map(p => p.y));

        let scaleX = (patternCanvasSize - 2 * patternPadding) / (maxX - minX || 1);
        let scaleY = (patternCanvasSize - 2 * patternPadding) / (maxY - minY || 1);
        let scale = Math.min(scaleX, scaleY, 1);

        stanzaCanvas.strokeWeight(patternLineWeight);
        stanzaCanvas.stroke(0);
        stanzaCanvas.noFill();

        // Draw connecting lines
        for (let i = 0; i < currentPath.length - 1; i++) {
            let x1 = patternPadding + (currentPath[i].x - minX) * scale;
            let y1 = patternPadding + (currentPath[i].y - minY) * scale;
            let x2 = patternPadding + (currentPath[i + 1].x - minX) * scale;
            let y2 = patternPadding + (currentPath[i + 1].y - minY) * scale;
            stanzaCanvas.line(x1, y1, x2, y2);
        }

        // Draw bubbles as solid black circles
        for (let i = 0; i < currentPath.length; i++) {
            let x = patternPadding + (currentPath[i].x - minX) * scale;
            let y = patternPadding + (currentPath[i].y - minY) * scale;

            // Map bubble size (40-100) to circle size (patternDotSizeMin to patternDotSizeMax)
            let bubbleSize = currentPath[i].size || 75;
            let circleSize = map(bubbleSize, 40, 100, patternDotSizeMin, patternDotSizeMax);

            // Draw solid black circle - filled with no stroke
            stanzaCanvas.push();
            stanzaCanvas.fill(0);
            stanzaCanvas.noStroke();
            stanzaCanvas.ellipse(x, y, circleSize, circleSize);
            stanzaCanvas.pop();
        }

        // Draw ARROW at the end
        if (currentPath.length >= 2) {
            let x1 = patternPadding + (currentPath[currentPath.length - 2].x - minX) * scale;
            let y1 = patternPadding + (currentPath[currentPath.length - 2].y - minY) * scale;
            let x2 = patternPadding + (currentPath[currentPath.length - 1].x - minX) * scale;
            let y2 = patternPadding + (currentPath[currentPath.length - 1].y - minY) * scale;

            let angle = Math.atan2(y2 - y1, x2 - x1);

            stanzaCanvas.push();
            stanzaCanvas.translate(x2, y2);
            stanzaCanvas.rotate(angle);
            stanzaCanvas.fill(0);
            stanzaCanvas.triangle(0, 0, -patternArrowSize, -patternArrowSize/2, -patternArrowSize, patternArrowSize/2);
            stanzaCanvas.pop();
        }
    }

    // Collect original text (without morse code)
    let originalText = [];
    for (let pathPoint of currentPath) {
        if (pathPoint.bubble && pathPoint.bubble.generatedText) {
            originalText.push(pathPoint.bubble.generatedText);
        }
    }

    // Save stanza with both original and morse-coded text
    stanzas.push({
        text: currentStanzaText.join(' '),           // Morse-coded text
        originalText: originalText.join(' '),        // Original text without morse
        image: stanzaCanvas.canvas.toDataURL(),
        timestamp: new Date()
    });

    // Update displays
    displayStanzas();
    displayPatterns();

    // Clear current stanza display
    let currentDiv = document.querySelector('.current-stanza-text');
    if (currentDiv) currentDiv.remove();

    // Hide selected bubbles (mark them as hidden)
    let hiddenCount = 0;
    for (let bubble of bubbles) {
        if (bubble.selected) {
            bubble.hidden = true;
            bubble.selected = false; // Also deselect the bubble
            hiddenCount++;
        }
    }
    console.log(`Hidden ${hiddenCount} bubbles after saving pattern`);

    // Clear current path and text for next stanza
    currentPath = [];
    currentStanzaText = [];
}

function displayStanzas() {
    let display = document.getElementById('poem-display');

    // Remove old stanza blocks
    document.querySelectorAll('.stanza-block').forEach(el => el.remove());

    if (stanzas.length === 0) {
        display.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Moving around and create your path</p>';
        return;
    }

    display.innerHTML = '';

    for (let i = 0; i < stanzas.length; i++) {
        let textDiv = document.createElement('div');
        textDiv.className = 'stanza-text';
        textDiv.textContent = stanzas[i].text;

        display.appendChild(textDiv);
    }
}

// Finish poem and show export options
function finishPoem() {
    // Auto-save current pattern if exists
    if (currentStanzaText.length > 0) {
        saveStanza();
    }

    if (stanzas.length === 0) {
        alert('Create at least one stanza first');
        return;
    }

    // Populate modal with content
    let originalTextDisplay = document.getElementById('original-text-display');
    let morseTextDisplay = document.getElementById('morse-text-display');
    let patternsGallery = document.getElementById('modal-patterns-gallery');

    // Clear previous content
    originalTextDisplay.innerHTML = '';
    morseTextDisplay.innerHTML = '';
    patternsGallery.innerHTML = '';

    // Build original text
    let originalLines = [];
    let morseLines = [];
    for (let i = 0; i < stanzas.length; i++) {
        originalLines.push(`Line ${i + 1}:\n${stanzas[i].originalText || stanzas[i].text}`);
        morseLines.push(`Line ${i + 1}:\n${stanzas[i].text}`);
    }
    originalTextDisplay.textContent = originalLines.join('\n\n');
    morseTextDisplay.textContent = morseLines.join('\n\n');

    // Add patterns
    for (let i = 0; i < stanzas.length; i++) {
        let img = document.createElement('img');
        img.src = stanzas[i].image;
        img.alt = `Pattern ${i + 1}`;
        patternsGallery.appendChild(img);
    }

    // Show modal
    document.getElementById('export-modal').style.display = 'block';
}

function resetAll() {
    if (!confirm('Reset everything? This will clear your entire paths.')) {
        return;
    }

    stanzas = [];
    currentPath = [];
    currentStanzaText = [];

    document.getElementById('poem-display').innerHTML = '';
    document.getElementById('output-card').style.display = 'none';
    document.getElementById('export-section').style.display = 'none';
    document.querySelector('.right-column').style.opacity = '1';

    initializeBubbles();
    displayStanzas();
    displayPatterns();
}

// Export ONLY the poem text (both original and morse-coded versions)
function exportPoemOnly() {
    let poemText = '=== ORIGINAL TEXT (No Morse Code) ===\n\n';

    // Export original text
    for (let i = 0; i < stanzas.length; i++) {
        poemText += `Line ${i + 1}:\n${stanzas[i].originalText || stanzas[i].text}\n\n`;
    }

    poemText += '\n\n=== MORSE-CODED TEXT ===\n\n';

    // Export morse-coded text
    for (let i = 0; i < stanzas.length; i++) {
        poemText += `Line ${i + 1}:\n${stanzas[i].text}\n\n`;
    }

    poemText += `\n---\n`;
    poemText += `Created: ${new Date().toLocaleString()}\n`;
    poemText += `Lines: ${stanzas.length}\n`;

    // Download as text file
    let blob = new Blob([poemText], {type: 'text/plain'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `poem_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    alert('text exported with both original and morse-coded text!');
}

// Export ONLY the pattern images
function exportPatternsOnly() {
    // Create a zip-like download by downloading each pattern
    stanzas.forEach((stanza, i) => {
        let a = document.createElement('a');
        a.href = stanza.image;
        a.download = `pattern_${i + 1}_${Date.now()}.png`;
        a.click();
    });

    alert(`${stanzas.length} pattern images exported!`);
}

// Export ALL (poem + patterns)
function exportAll() {
    // Export poem text
    exportPoemOnly();

    // Export patterns with a delay
    setTimeout(() => {
        exportPatternsOnly();
    }, 500);
}

function windowResized() {
    let container = document.getElementById('canvas-container');
    canvasWidth = container.offsetWidth || 800;
    canvasHeight = container.offsetHeight || 600;
    resizeCanvas(canvasWidth, canvasHeight);
    initializeBubbles();
}

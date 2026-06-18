//config stuff for easy of testing/tweaking without digging through code.
const CUTSCENE_ENABLED = false;

// how many copies of filler words to include in the inventory – more copies means more likely to build sentences, which means more reactions, but also more clutter
const FILLER_COPIES = 3;

//master list of all  beginnning words to give the player the ability to make basic sentences that trigger basic reactions.
const ALL_WORDS = ["LOVE","SMILE","HAPPY","HATE","CRY","UGLY","TABLE","CHAIR","WALK","BLUE","IS","THE","AND","ON","IN","WITH","FOR","BY","AT","WE","YOU","THEY"];
const FILLER_WORDS = ["IS","THE","AND","ON","IN","WITH","FOR","BY","AT","WE","YOU","THEY"];

// cereal and newspaper words – these are the "power-ups" that add more interesting words to the inventory that trigger more reactions and endings.
// I designed this to give the player a way to inject positivity.
const CEREAL_WORDS = ["HAPPY","LOVE","WARM","CRUNCHY","MOIST","CRANKY","SILLY","SOGGY","BLAND","SWEET"];

//newspaper words are more negative – they trigger different reactions and push towards the darker ending, but they also add more variety to the sentences you can build, which makes the game more fun overall. I wanted to include some neutral/ambiguous words too, but ran out of time.
const NEWSPAPER_WORDS = ["DARK","BLOOD","POWER","RISE","SHADOW","HUNGER","COLD","IRON","VOID","STORM"];

//  These are the image files for each family member.
// I sourced the original vector drawings from adobe stock, then exported to photoshop to do some clean up and draw a few assets of my own like the cereal box and newspaper. 
// Source: 
// https://stock.adobe.com/au/images/vector-cartoon-interior-of-family-kitchen-counter-with-appliances-furniture-household-objects-cooking-dining-room/206898602
// https://stock.adobe.com/au/199058353
// https://stock.adobe.com/au/460373755
const FAMILY_SPRITES = {
    ROSA:   'pngs/mom.png',
    TOM:    'pngs/dad.png',
    LILY:   'pngs/sis.png',
    MAX:    'pngs/bro.png',
    ELIA:   'pngs/grandma.png'
};

// reaction lines for each character based on the sentiment of the word that was just added to the fridge – they also have a special hint line for when the player tries to trigger a reaction without any filler words on the fridge, since that was a common point of confusion in testing
const CHARACTER_LINES = {
    ROSA: {
        positive: "Oh my goodness look at him!!",
        negative: "No no no sweetheart we don't say that!!",
        neutral: "Yes!! Good job baby!!"
    },
    TOM: {
        positive: "Genius. Absolute genius.",
        negative: "Ha. Bold. I respect the honesty.",
        neutral: "Solid word choice. Very grounded."
    },
    LILY: {
        positive: "I said that word yesterday. Nobody cared.",
        negative: "MUM HE SAID A BAD WORD AND YOU'RE SMILING??",
        neutral: "He just put that word up. We're all just okay with that."
    },
    MAX: {
        positive: "Still within normal parameters.",
        negative: "First shadow word. Writing it down.",
        neutral: "Could be symbolic. Could just be that word."
    },
    ELIA: {
        positive: "Warm. The hands are finding their way.",
        negative: "The child understands that dark words exist. Good.",
        neutral: "Not yet. But close."
    }
};

// counters for the ending. I wanted to do something more complex with the sentiment analysis, but ran out of time, so it's just counting positive and negative words for now. The ending triggers when either counter hits 10, which is about the point where the fridge starts getting really full and the reactions are flying fast and furious.
let positiveCount = 0;
let negativeCount = 0;

// This function looks at a word and decides whether it's positive, negative, or neutral. I had to manually list every word that counts as positive or negative and everything else is neutral. This is used by the reaction system.
function getReactionType(word) {
    const pos = ["LOVE","SMILE","HAPPY","WARM","SWEET","SILLY"];
    const neg = ["HATE","CRY","UGLY","DARK","BLOOD","POWER",
                 "RISE","SHADOW","HUNGER","COLD","IRON","VOID",
                 "STORM","CRANKY","MOIST","SOGGY","BLAND"];
    if (pos.includes(word)) return "POSITIVE";
    if (neg.includes(word)) return "NEGATIVE";
    return "NEUTRAL";
}

const REACTION_MAP = {
    POSITIVE: ["OUR LITTLE ANGEL", "CUTIE WOOTIE SWEETIE PIE", "What an outstanding little guy"],
    NEGATIVE: ["Oh that's quite concerning, who's been teaching him these things???", "No no no baby!!", "Your sister is not that bad :("],
    NEUTRAL: ["Okay... ", "Yes Shakespear", "How cute"],
    NOREACTION: []
};

// For the drag sound it was important to have at least 1 tactile sound. I took this inspiration from a similar magnet website source by pkdvalis: https://codepen.io/pkdvalis/pen/KwKReKv
// As I did not want to mess around with web audio api at all because it was not the focal point of this project, instead, i put my energy into the panning and dragging mechanics. 
// From pkdvalis's example I found, I implemented a system that alternates between two different click sounds to prevent audio clipping and make it feel more responsive when dragging multiple words in quick succession.
//The sounds I sourced: https://pixabay.com/sound-effects/film-special-effects-metal-hitting-230344/
//making a new audio objects and point it towards the local mp3 files.
const dragSound1 = new Audio("/mp3s/click1.mp3");
const dragSound2 = new Audio("/mp3s/click2.mp3");
let soundEnabled = true;
//Value to help alternate between 2 different clicks.
let nextSound = 1;

//simple function that if sound enabled 
function playSound() {
    if (!soundEnabled) return;
    if (nextSound === 2) {
        //resetting sound to start, so if the same sound is triggered multiple times in quick succession, it will play from the start each time instead of cutting out.
        dragSound1.currentTime = 0;
        //https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
        // https://developer.chrome.com/blog/play-returns-promise
        //sometimes the browser blocks the sound from auto-playing or if the files are missing, the play() function can throw an error, so I added a catch to prevent it from breaking the game for best practice.
        //common shorthand version: .play().catch(() => {})
        dragSound1.play().then(function() {
            // sound played successfully, nothing to do
        }).catch(function(error) {
            // sound failed to play, probably a missing file or browser issue
            // not critical so we just ignore it
            console.log("Sound could not be played: " + error);
        });        nextSound = 1;
    } else {
        dragSound2.currentTime = 0;
        dragSound2.play().then(function() {
        }).catch(function(error) {
            console.log("Sound could not be played: " + error);
        });
        nextSound = 2;
    }
}

// DOM ELEMENTS ------------------------------------
const fridgeDropZone = document.getElementById('fridgeDropZone');
const fridgeWordsContainer = document.getElementById('fridgeWords');
const inventoryContainer = document.getElementById('inventoryItems');
const inventoryUI = document.getElementById('inventoryUI');
const familyIconSpan = document.getElementById('familyIconFridge');
const reactionTextSpan = document.getElementById('reactionTextFridge');
const resetBtn = document.getElementById('resetBtn');
const worldDiv = document.getElementById('world');
const fridgeUI = document.getElementById('fridgeUI');
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');

// POPUP ELEMENTS --------------------------------------
const popupOverlay = document.getElementById('popupOverlay');
const popupGrid = document.getElementById('popupGrid');
const popupCloseBtn = document.getElementById('popupCloseBtn');

// ENDING ELEMENTS --------------------------------------
const endingOverlay = document.getElementById('endingOverlay');
const endingText = document.getElementById('endingText');
const endingResetBtn = document.getElementById('endingResetBtn');

// REACTION SPRITE ELEMENTS --------------------------------------
const reactionSpriteContainer = document.getElementById('reactionSpriteContainer');
const reactionSpriteImg = document.getElementById('reactionSprite');
const reactionSpriteText = document.getElementById('reactionSpriteText');

// DRAG STATE ------------------------------------------
//avo toast: explain all of the variables and skim on about their usage, go into further detail later in their resoective dunctions
let draggedItem = null;
let startX = 0, startY = 0;
let newX = 0, newY = 0;
let originalParent = null;
let isDragging = false;
let dragOffsetX = 0, dragOffsetY = 0;

// SHUFFLE -------------------------------------
// top answer on "How to randomize a JavaScript array": https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
// I followed an optimized version of the Fisher-Yates shuffle algorithm to randomize the order of words in the inventory each time the game is reset, which adds variety to the gameplay and encourages experimentation with different word combinations.
function shuffleArray(arr) {
    // Loop backwards through the array and swap each element with a random earlier element (or itself)
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// CREATE A DRAGGABLE WORD ----------------------------------------
//from pkdvalis I referenced the basic pattern of creating a div element, assigning text content and positioning it with inline styles was informed by similar approaches in existing magnet poetry implementations, then extended to support absolute positioning, random rotation, and drag event attachment for this project's specific needs.
// Creates a <div> element that represents a magnetic word. the parameters are for text content, whether it should be absolutely positioned (for inventory and fridge placements), and the left/top coordinates if it is absolute. 
function createWordElement(word, isAbsolute = false, left = 0, top = 0) {
    const div = document.createElement('div');
    div.textContent = word;
    div.classList.add('word-item');
    div.setAttribute('data-word', word);
    const randomTilt = (Math.random() * 10) - 5; // random tilt between -5 and +5 degrees 
    div.style.transform = `rotate(${randomTilt}deg)`;
        //applying rotations as a CSS property: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals 
    if (isAbsolute) {
        //If isAbsolute is true, position the word absolutely using left and top pixel values. If not, clear any positioning styles so the word flows naturally. This is important because inventory words are absolute (positioned randomly) and fridge words are also absolute (placed exactly where you drop them).
        div.style.position = 'absolute';
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;
        div.style.margin = '0';
    } else {
        div.style.position = '';
        div.style.left = '';
        div.style.top = '';
    }
    div.addEventListener('mousedown', onDragStart);
    return div;
}

// DRAG START -------------------------------------------
//referencing the offset shift explanation from https://javascript.info/mouse-drag-and-drop to calculate the cursor's position relative to the word being dragged, which allows for smooth dragging without the word "jumping" to align its top-left corner with the cursor. Helping me understand the event handling and coordinate calculations needed to implement a natural drag-and-drop experience in the browser, while also looking at pkdvalis's magnet poetry code for practical implementation examples.
// original used onmousemove/onmouseup direct assignment and offsetTop/offsetLeft but here I'm using addEventListener, getBoundingClientRect for accurate cursor offset, and elementsFromPoint for drop zone detection
function onDragStart(e) {
    // Only respond to left‑click (button 0). Right‑click (button 2) is ignored.
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
        //https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault . Prevents default browser behavior (like text selection) when dragging words, and stops the event from bubbling up to parent elements.
    draggedItem = this;
    originalParent = this.parentNode;
        // Remember where this element came from so we can return it if the drop fails
    const rect = this.getBoundingClientRect();
        // Get the element's current position on screen https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
        // Calculate where the mouse clicked relative to the element's top‑left corner
    this.remove();
        // Remove the element from its current parent (creates a "hole" in the container)
    this.style.position = 'fixed';
    this.style.zIndex = '9999';
        // Make the element float on top of everything else

    this.style.left = `${rect.left}px`;
    this.style.top = `${rect.top}px`;
        // Position it exactly where it was before removal (based on screen coordinates
    this.style.margin = '0';
        // Remove any margin that might offset the position
    document.body.appendChild(this);

    // Add global listeners so the drag works even if the mouse leaves the element. I used mousemove and mouseup instead of touch events because I planned this to be a browser game and I didn't want to handle touch complexity so it would be easier to follow pkdvalis's example.
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    isDragging = true; // Flag to prevent multiple drags at once
    addBlur(); // Blur the background while dragging – the counter ensures it stays consistent.
    playSound();
}

// DRAG MOVE ----------------------------------------
// Updates the position of the dragged element to follow the mouse, and highlights any drop zones the mouse is hovering over. The position is calculated based on the initial offset when the drag started, so the word stays "attached" to the cursor at the same point where it was grabbed. The highlightDropZones function checks which elements are currently under the cursor and adds a visual highlight to the fridge or inventory if the dragged item is over them, providing feedback to the player about where they can drop the word.
function onDragMove(e) {
    if (!draggedItem) return;
    draggedItem.style.left = `${e.clientX - dragOffsetX}px`;
    draggedItem.style.top = `${e.clientY - dragOffsetY}px`;
    highlightDropZones(e.clientX, e.clientY);
}
//Separating it into highlightDropZones keeps onDragMove focused on moving the element, and makes the code easier to understand and test.
//This function was written referencing elementsFromPoint from https://developer.mozilla.org/en-US/docs/Web/API/Document/elementsFromPoint and https://javascript.info/mouse-drag-and-drop 
function highlightDropZones(x, y) {
    const under = document.elementsFromPoint(x, y);
    let overFridge = false, overInv = false;
    for (let el of under) { //looping through all elements under the cursor
        if (el === draggedItem) continue;
        if (el.closest('#fridgeDropZone')) overFridge = true; //if the current element (or any of its parents) matches the fridge drop zone's ID, set the flag to true.
        if (el.closest('#inventoryItems')) overInv = true;
    }
    fridgeDropZone.classList.toggle('drag-over', overFridge); //toggle the css to highlight this element
    inventoryContainer.classList.toggle('drag-over', overInv);
}
// DRAG END -----------------------------------------
// Handles the end of a drag operation, determining where the dragged item was dropped and updating the UI accordingly.
//I could have broken it into smaller helpers (like handleFridgeDrop, handleInventoryDrop, handleOutsideDrop) but they all needed access to a lot of similar variables, and I would rather not fix what works. 
function onDragEnd(e) {
    if (!draggedItem) return;
    document.removeEventListener('mousemove', onDragMove); 
    document.removeEventListener('mouseup', onDragEnd);// Remove the global listeners so they don't keep firing

    // Determine if it's over a drop zone
    const word = draggedItem.textContent;
    const under = document.elementsFromPoint(e.clientX, e.clientY);
    let targetZone = null;
    for (let el of under) {
        if (el === draggedItem) continue;
        if (el.closest('#fridgeDropZone')) { targetZone = 'fridge'; break; }
        if (el.closest('#inventoryItems')) { targetZone = 'inventory'; break; }
    }
    // Check if the word came from a popup (to add back if released)
    const fromPopup = draggedItem.dataset.fromPopup === 'true';
    const popupSource = draggedItem.dataset.popupSource || null;

    //FRIDGE ZONE ---------------------
    if (targetZone === 'fridge') {
        const fridgeRect = fridgeWordsContainer.getBoundingClientRect();
        const rect = draggedItem.getBoundingClientRect();
        
        // Convert screen coordinates to coordinates relative to the fridge container
        let left = rect.left - fridgeRect.left;
        let top = rect.top - fridgeRect.top;

        // Clamp the position so the word doesn't overflow the fridge boundaries
        left = Math.max(0, Math.min(left, fridgeRect.width - rect.width));
        top = Math.max(0, Math.min(top, fridgeRect.height - rect.height));
        // Remove the floating dragged item
        draggedItem.remove();
        // Create a new word inside the fridge at the calculated position
        const newWord = createWordElement(word, true, left, top);

        //copy rotation to the new word
        if (draggedItem.style.transform) newWord.style.transform = draggedItem.style.transform;

        // Add it to the fridge container
        fridgeWordsContainer.appendChild(newWord);

        // Wait a tiny bit for the DOM to update, then trigger the reaction
        // I had to add this delay because Firefox would sometimes report the word count
        // as 0 even after appending the word. This fixes that race condition.
        setTimeout(() => {
            triggerReactionIfSentence(word);
        }, 10);
        playSound();
    }
    else if (targetZone === 'inventory') {
        const invRect = inventoryContainer.getBoundingClientRect();
        const rect = draggedItem.getBoundingClientRect();
        let left = rect.left - invRect.left;
        let top = rect.top - invRect.top;
        left = Math.max(0, Math.min(left, invRect.width - rect.width));
        top = Math.max(0, Math.min(top, invRect.height - rect.height));
        draggedItem.remove();
        const newWord = createWordElement(word, true);
        newWord.style.left = `${left}px`;
        newWord.style.top = `${top}px`;
        if (draggedItem.style.transform) newWord.style.transform = draggedItem.style.transform;
        inventoryContainer.appendChild(newWord);
        playSound();
    }
    // --- DROPPED OUTSIDE ANY ZONE ---
    else {
        if (fromPopup) {
            // If it came from a popup and the popup is still open, put it back
            draggedItem.remove();
            if (popupGrid && popupOverlay.style.display !== 'none') {
                const newPopupWord = createPopupWord(word, popupSource);
                popupGrid.appendChild(newPopupWord);
            } else {
                // Popup closed – add to inventory as a fallback so the word isn't lost
                // I admit this feels janky, but it's better than destroying the word.
                const invRect = inventoryContainer.getBoundingClientRect();
                const rect = draggedItem.getBoundingClientRect();
                let left = Math.random() * (invRect.width - 60);
                let top = Math.random() * (invRect.height - 30);
                draggedItem.remove();
                const newWord = createWordElement(word, true);
                newWord.style.left = `${left}px`;
                newWord.style.top = `${top}px`;
                if (draggedItem.style.transform) newWord.style.transform = draggedItem.style.transform;
                inventoryContainer.appendChild(newWord);
            }
        } else {
            // Return to original parent
            if (originalParent === inventoryContainer || originalParent === fridgeWordsContainer) {
                draggedItem.remove();
                const newWord = createWordElement(word, false);
                if (originalParent === fridgeWordsContainer) {
                    // If it was originally on the fridge, place it at a random spot
                    const fridgeRect = fridgeWordsContainer.getBoundingClientRect();
                    const rect = draggedItem.getBoundingClientRect();
                    let left = Math.random() * (fridgeRect.width - 60);
                    let top = Math.random() * (fridgeRect.height - 30);
                    newWord.style.position = 'absolute';
                    newWord.style.left = `${left}px`;
                    newWord.style.top = `${top}px`;
                    newWord.style.margin = '0';
                    fridgeWordsContainer.appendChild(newWord);
                } else {
                    originalParent.appendChild(newWord);
                }
            } else {
                // Fallback: put it in inventory
                draggedItem.remove();
                const newWord = createWordElement(word, false);
                inventoryContainer.appendChild(newWord);
            }
        }
    }
    // Clean up drag state
    draggedItem = null;
    isDragging = false;
    fridgeDropZone.classList.remove('drag-over');
    inventoryContainer.classList.remove('drag-over');

    
    removeBlur(); // Remove blur contribution from drag – the counter handles the rest.

}

// WEIGHTED REACTION PROBABILITY -------------------------------------
// Returns true or false based on a probability that increases with the number of words on the fridge. This makes reactions feel more "earned" as the fridge fills up. 
// A more manual weighted random using Math.random() returns a number between 0 and 1. If the random number is less than the threshold, the function returns true. So for 25%, if Math.random() is less than 0.25, it returns true – a 1 in 4 chance.
// during testing these numbers felt the most natural, as without this function there would be reactions almost everyword which becomes noise. 
function shouldReact(count) {
    if (count <= 0) count = 1; // fallback if count is 0
    if (count === 1) return true;
    if (count >= 2 && count <= 4) return Math.random() < 0.25;
    if (count >= 5 && count <= 7) return Math.random() < 0.45;
    if (count >= 8 && count <= 10) return Math.random() < 0.65;
    if (count >= 11) return Math.random() < 0.85;
    return false;
}

//I wanted it to encourage sentence building rather than just dropping single words. The filler word requirement is intentional – it makes the family react to sentences like "LOVE IS GOOD" rather than just "LOVE". This makes the game feel more poetic and meaningful.
function triggerReactionIfSentence(newWord) {
    //Check probability
    const wordCount = fridgeWordsContainer.querySelectorAll('.word-item').length;
    if (!shouldReact(wordCount)) return;
    //If it's a filler word, do NOT react
    if (FILLER_WORDS.includes(newWord)) return;
    //Check if there's at least one filler word on the fridge so the family reacts to full sentences
    if (!fridgeHasFillerWord()) {
        // Show a hint (using the sprite system) and exit
        showCharacterReaction('neutral', newWord, true);
        return;
    }
    //Determine sentiment and update counters
    const type = getReactionType(newWord);
    // (type will be POSITIVE, NEGATIVE, or NEUTRAL)
    updateCounters(newWord);
    if (checkEnding()) return;
    //Show reaction
    showCharacterReaction(type, newWord);
}

// COUNTERS & ENDING --------------------------------------

function updateCounters(word) {
    const allPositive = ["LOVE","WARM","HAPPY","SWEET","SILLY"];
    const allNegative = ["DARK","BLOOD","POWER","SHADOW","HUNGER","COLD","IRON","VOID","STORM","CRANKY","MOIST","SOGGY","BLAND"];
    if (allPositive.includes(word)) positiveCount++;
    else if (allNegative.includes(word)) negativeCount++;
}

// whichever counter hits 10 first determines the ending
// returns true so the caller knows to stop further reactions
function checkEnding() {
    if (positiveCount >= 10) { showEnding('positive'); return true; }
    if (negativeCount >= 10) { showEnding('negative'); return true; }
    return false;
}

//Positive ending (positiveCount >= 10): The family is amazed by the baby's vocabulary. They start looking up spelling bees. Grandma closes her notebook because she's finally satisfied.
// Negative ending (negativeCount >= 10): The family calls a meeting, removes the magnets, and replaces them with a whiteboard. Grandma is disappointed.
//I chose these endings because I wanted both outcomes to feel like a "reward" for the player's choices. The positive ending is about achievement and potential. The negative ending is about consequences – the family taking away the magnets because they think the words are "too much". It's a way to show that words have power, even for a baby.
function showEnding(type) {
    const overlay = document.getElementById('endingOverlay');
    const textEl = document.getElementById('endingText');
    //The \n is a newline character. Without it, the text would be one long line.
    if (type === 'positive') {
        textEl.textContent = `The family was stunned silent!.\nDad already googling 'junior spelling bee registration 2026 and Grandma simply closed her notebook.\nShe had waited forty years for this and it was enough.`;
    } else {
        textEl.textContent = `The family called a meeting.\nIt lasted four hours.\nYou were not invited.\nThe fridge magnets were replaced with a whiteboard.\nGrandma did not disagree with the decision... just looked a little disappointed.`;
    }
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.add('show');
}

// CHARACTER REACTION (sprite slide‑in) ---------------------------------------
// Selects a random family member, sets their sprite image, displays a speech bubble with their reaction line, and animates it sliding in from the left. After 4 seconds, it slides back out.
function showCharacterReaction(type, word, isHint = false) {
    // Get the list of character names (ROSA, TOM, LILY,...) https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
    // I then pick a random index from that array to select a random character. This feels cleaner than hardcoding an array of names.
    const characterNames = Object.keys(CHARACTER_LINES);
    // Pick a random character from the list
    const randomName = characterNames[Math.floor(Math.random() * characterNames.length)];
    // Get that character's reaction lines
    const lines = CHARACTER_LINES[randomName];
    let line;
    // If this is a hint (no filler words on the fridge), show a special message
    // otherwise, get the appropriate line based on the sentiment type (positive/negative/neutral)
    if (isHint) {
        line = "Add some connecting words (IS, THE, AND) first…";
    } else {
        // type is a string like "POSITIVE", "NEGATIVE", or "NEUTRAL"
        // .toLowerCase() converts it to "positive", "negative", or "neutral"
        // which matches the keys in the CHARACTER_LINES object
        line = lines[type.toLowerCase()];
    }
    // Set the sprite image source to the corresponding family member's PNG
    reactionSpriteImg.src = FAMILY_SPRITES[randomName];
    // Set the text of the speech bubble
    reactionSpriteText.textContent = line;
    // Add the 'active' class to the sprite container, which triggers the slide‑in animation
    reactionSpriteContainer.classList.add('active');
    // Also show the speech bubble
    document.getElementById('reactionBubble').classList.add('active');
    // Clear any previous timeout to prevent overlapping hide timers
    clearTimeout(reactionSpriteContainer._hideTimer);
        // I'm storing the timeout ID on the element itself (reactionSpriteContainer._hideTimer). This way, I can clear the previous timeout if a new reaction happens before the old one finishes. If I used a global variable, it could get overwritten by other functions and cause bugs.
        // I wanted the sprite to stay visible long enough to read the speech bubble, but not so long that it becomes annoying. 4 seconds felt right during testing.    
        reactionSpriteContainer._hideTimer = setTimeout(() => {
        reactionSpriteContainer.classList.remove('active');
        document.getElementById('reactionBubble').classList.remove('active');
    }, 4000);
}
// POPUP FUNCTIONS ----------------------------------
let popupSource = null;
let popupWords = [];

function openPopup(wordList, source) {
    // Opens a popup overlay with a grid of draggable words. The source parameter determines whether it's the cereal or newspaper popup, which affects the styling.
    popupSource = source; //stores which popup opened this (cereal or newspaper) for later use.
    popupWords = wordList.slice(); //Creates a copy of the word list. slice() without arguments creates a shallow copy. If I assigned popupWords = wordList directly, both variables would point to the same array. When I later modify popupWords (e.g., when a word is removed), the original CEREAL_WORDS or NEWSPAPER_WORDS array would also be modified. slice() creates a new array so the original remains intact. This is important because I want the popup to have its own copy of the words, and the original list should stay as a template for future popups.

    const overlay = document.getElementById('popupOverlay');
    const grid = document.getElementById('popupGrid');
    grid.innerHTML = '';
    overlay.className = 'popup-overlay' + (source === 'newspaper' ? ' popup-newspaper' : '');
    overlay.style.display = 'flex';
    popupWords.forEach(word => { //Loops through each word in the list and creates a draggable word element inside the grid.
        const wordEl = createPopupWord(word, source);
        grid.appendChild(wordEl);
    });
}
// creates a word tile for the cereal box / newspaper popup mostly the same as createWordElement but needs two extra data attributes: fromPopup so onDragEnd knows to return it to the popup if dropped outside, and popupSource so it knows which popup it came from (cereal or newspaper)
function createPopupWord(word, source) {
    const div = document.createElement('div');
    div.textContent = word;
    div.classList.add('popup-word');
    div.setAttribute('data-word', word);
    const rot = (Math.random() * 16) - 8; // wider tilt range than inventory words (-8 to +8) so popup words look more scattered and torn
    div.style.setProperty('--rot', rot + 'deg'); // using a CSS variable here instead of inline transform because the popup-word class already has a transform, setting it directly would overwrite it
    div.dataset.fromPopup = 'true';
    div.dataset.popupSource = source;
    div.addEventListener('mousedown', (e) => {
        onDragStart.call(div, e);
        // .call(div, e) manually sets 'this' to the div inside onDragStart needed because onDragStart uses 'this' to refer to the dragged element without .call(), 'this' would be the arrow function's outer context, not the div - MDN Function.prototype.call(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
    });
    return div;
}

function closePopup() {
    popupOverlay.style.display = 'none';
    popupGrid.innerHTML = '';
    popupSource = null;
    popupWords = [];
}

// SENTENCE HELPERS ----------------------------
function fridgeHasFillerWord() {
    // checks if there's at least one connecting word on the fridge (IS, THE, AND etc.) used to gate reactions so the family responds to sentences not just lone words
    const words = fridgeWordsContainer.querySelectorAll('.word-item');
    for (let w of words) if (FILLER_WORDS.includes(w.textContent)) return true;
    return false;
}

function countSentimentOnFridge() {
    // tallies positive and negative words currently on the fridge
    // used to decide the overall tone of the sentence for the reaction

    let pos = 0, neg = 0;
    fridgeWordsContainer.querySelectorAll('.word-item').forEach(el => {
        const type = getReactionType(el.textContent);
        if (type === 'POSITIVE') pos++;
        else if (type === 'NEGATIVE') neg++;
    });
    return { posCount: pos, negCount: neg };
}

// BUILD INVENTORY ------------------------------------
// The inventory is a grid of absolute‑positioned words. I can't just use flexbox because I want the words to stay in place when you remove one (like real magnets on a table). Each word has a fixed position, and when you pick one up, the others don't shift.
// adapted from pkdvalis's scatter placement approach: https://codepen.io/pkdvalis/pen/KwKReKv and cross referencing this other focused codepen https://codepen.io/samme/pen/xxGWvoq where a do...while loop with a maximum attempt counter is used to place elements randomly without overlapping
// filler words get 3 copies each so there are always enough connectors available
function buildInventory() {
    inventoryContainer.innerHTML = ''; // Clear the inventory container
    let wordBag = []; // Create a "bag" of all words with duplicates for filler words

    ALL_WORDS.forEach(word => {
        // Determine how many copies of this word to add
        // Filler words get FILLER_COPIES copies, others get 1
        let copies = FILLER_WORDS.includes(word) ? FILLER_COPIES : 1;
        for (let i = 0; i < copies; i++) {
            wordBag.push(word);
        }
    });
    wordBag = shuffleArray(wordBag); // shuffle so words don't always appear in the same order

    // Get the dimensions of the inventory container
    const containerWidth = inventoryContainer.clientWidth; // clientWidth because I want the words to be positioned inside the content area, not overlapping the padding.
    const containerHeight = inventoryContainer.clientHeight;

    // Keep track of positions already used to avoid overlap
    let usedPositions = [];
    wordBag.forEach(word => {
        // ✅ FIX: Create the word element FIRST
        const wordEl = createWordElement(word, true);
        wordEl.style.position = 'absolute';
        wordEl.style.whiteSpace = 'nowrap';
        
        // Add it to the container temporarily to measure its size
        inventoryContainer.appendChild(wordEl);
        
        // Now measure it
        const width = wordEl.offsetWidth;
        const height = wordEl.offsetHeight;
        
        let left, top, attempts = 0;
        do {
            // keep trying random positions until it finds one that doesn't overlap
            // bail after 100 tries so it doesn't infinite loop on a crowded tray and just use the last position.
            left = 5 + Math.random() * (containerWidth - width - 10);
            top = 5 + Math.random() * (containerHeight - height - 10);
            attempts++;
            if (attempts > 100) break;

        // This checks if the horizontal distance between two words is less than the width of a word. If they're closer than a word's width, they're overlapping horizontally. Combined with the vertical check Math.abs(pos.top - top) < height, this detects if two rectangles overlap.
        } while (usedPositions.some(pos => Math.abs(pos.left - left) < width && Math.abs(pos.top - top) < height));

        // Store this position so we don't overlap it with another word
        usedPositions.push({ left, top });
        // Set its final position
        wordEl.style.left = `${left}px`;
        wordEl.style.top = `${top}px`;
    });
}

// RESET GAME ------------------------------------------
// clears the fridge and inventory, resets counters, closes any open popup,
// and snaps the world back to its starting position
function resetGame() {
    fridgeWordsContainer.innerHTML = '';
    buildInventory();
    familyIconSpan.textContent = '👤';
    reactionTextSpan.textContent = 'Drag words to the fridge! Use IS, THE, AND to make sentences.';
    worldDiv.classList.remove('blurred');
    positiveCount = 0;
    negativeCount = 0;
    endingOverlay.classList.remove('show');
    endingOverlay.style.display = 'none';
    closePopup();
    reactionSpriteContainer.classList.remove('active');
    
    // Reposition the world. Why I put a lot of effort in this section is so that the highchair (inventory bar) sits neatly at the bottom of the screen, while the fridge stays centered. This is crucial because the world is a large image (2748×1200) that the player can pan around – and when the game resets, we need a consistent, comfortable view. The inventory bar is inside the world (.world), so its position is relative to the world’s top‑left corner. To place it at the screen’s bottom, we can’t just set a CSS bottom value – we have to move the entire world so that the inventory’s bottom edge aligns with the viewport bottom.
    if (typeof worldTransform !== 'undefined' && world && viewport) {
        const inventory = document.querySelector('.inventory-nav'); // Get the inventory element

    if (inventory) {
        // Get inventory's position within the world
        const invTop = inventory.offsetTop;
        const invHeight = inventory.offsetHeight;

        // Get the viewport height
        const viewportHeight = viewport.clientHeight;

        // Where we want the bottom of the inventory to be (20px from the viewport bottom)
        const targetInvBottom = viewportHeight - 20;

        // The inventory's current bottom position in world coordinates
        const invWorldBottom = invTop + invHeight;

        // Calculate how far we need to move the world to align the inventory's bottom
        // with the viewport bottom
        let deltaY = targetInvBottom - invWorldBottom;

        // Apply the vertical translation
        worldTransform.y = deltaY;

        // Clamp to world boundaries (so we don't scroll past the top or bottom of the world image)
        const minY = -(world.offsetHeight - viewportHeight);
        worldTransform.y = Math.min(0, Math.max(minY, worldTransform.y));

        // Center horizontally
        const viewportWidth = viewport.clientWidth;
        const worldWidth = world.offsetWidth;
        worldTransform.x = (viewportWidth / 2) - (worldWidth / 2);

        // Clamp horizontally
        const minX = -(worldWidth - viewportWidth);
        worldTransform.x = Math.min(0, Math.max(minX, worldTransform.x));

        // Apply the transform
        setWorldTransform();
    }
        } else { //If the inventory element isn’t found (rare), we fall back to a simple center‑of‑viewport alignment.

            const viewportRect = viewport.getBoundingClientRect();
            const worldWidth = world.offsetWidth;
            const worldHeight = world.offsetHeight;
            worldTransform.x = (viewportRect.width / 2) - (worldWidth / 2);
            worldTransform.y = (viewportRect.height / 2) - (worldHeight / 2);
            const maxX = 0, minX = -(worldWidth - viewportRect.width);
            const maxY = 0, minY = -(worldHeight - viewportRect.height);
            worldTransform.x = Math.min(maxX, Math.max(minX, worldTransform.x));
            worldTransform.y = Math.min(maxY, Math.max(minY, worldTransform.y));
            setWorldTransform();
        }
    
    }
resetBtn.addEventListener('click', resetGame);

// PAN WORLD (horizontal only) -----------------------------------
// I only allow horizontal panning because vertical panning made the highchair float away and felt disorienting. The world is a wide kitchen scene, so left/right movement still feels natural - like you're looking around the room.
let isPanning = false;
let panStartX = 0;
let worldTransform = { x: 0, y: 0 };

function setWorldTransform() {
    // This applies the translation to the world element.
    world.style.transform = `translate(${worldTransform.x}px, ${worldTransform.y}px)`;
}

viewport.addEventListener('mousedown', (e) => {
    // Only start panning if clicking on the background (viewport or world)
    // Not on draggable words or UI elements
    if (e.target === viewport || e.target === world || e.target.classList?.contains('world')) {
        isPanning = true;
        // Store the starting mouse position relative to the world's current translation
        // This prevents the world from "jumping" when you start dragging
        panStartX = e.clientX - worldTransform.x;
        viewport.style.cursor = 'grabbing';
        e.preventDefault(); //Prevent text selection during pan
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    // Calculate new X position based on mouse movement
    // The difference between current mouse position and the start position gives me how far i've moved the world
    worldTransform.x = e.clientX - panStartX;
    
    // Clamp horizontally so the world doesn't scroll past its edges
    // The minimum X is the negative of how much the world extends beyond the viewport
    // The maximum is 0 (world's left edge at viewport's left edge)
    const minX = -(world.offsetWidth - viewport.clientWidth);
    worldTransform.x = Math.min(0, Math.max(minX, worldTransform.x));
    setWorldTransform();
});

window.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        viewport.style.cursor = 'grab'; // Reset cursor to indicate panning is over
    }
});

// ========== BLUR EFFECT ==========
// Uses a counter so multiple sources can keep the blur active without flickering.
// When the counter goes from 0 to 1, the blur is applied. When it returns to 0, it's removed.
// This prevents hover and drag events from fighting each other.

let blurCounter = 0;

function addBlur() {
    blurCounter++;
    if (blurCounter === 1) {
        worldDiv.classList.add('blurred');
    }
}

function removeBlur() {
    blurCounter--;
    if (blurCounter <= 0) {
        blurCounter = 0;
        worldDiv.classList.remove('blurred');
    }
}

// -- Hover on fridge --
fridgeUI.addEventListener('mouseenter', addBlur);
fridgeUI.addEventListener('mouseleave', removeBlur);

// -- Hover on inventory (highchair) --
if (inventoryUI) {
    inventoryUI.addEventListener('mouseenter', addBlur);
    inventoryUI.addEventListener('mouseleave', removeBlur);
}

// -- Dragging over drop zones --
fridgeDropZone.addEventListener('dragenter', addBlur);
fridgeDropZone.addEventListener('dragleave', removeBlur);

inventoryContainer.addEventListener('dragenter', addBlur);
inventoryContainer.addEventListener('dragleave', removeBlur);

// BEGINNING CUTSCENE ----------------------------
const cutscene = document.getElementById('cutscene');
if (CUTSCENE_ENABLED && cutscene) {
    let dragActive = false, startY = 0, currentY = 0;
    cutscene.addEventListener('mousedown', (e) => {
        if (cutscene.classList.contains('dismiss')) return;
        e.preventDefault();
        dragActive = true;
        startY = e.clientY;
        currentY = 0;
        cutscene.style.transition = 'none';
        cutscene.style.transform = 'translateY(0px)';
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragActive) return;
        let delta = e.clientY - startY;
        let newY = Math.min(0, Math.max(-400, delta));
        currentY = newY;
        cutscene.style.transform = `translateY(${newY}px)`;
    });
    window.addEventListener('mouseup', () => {
        if (!dragActive) return;
        dragActive = false;
        cutscene.style.transition = 'transform 0.2s ease-out';
        if (currentY < -150) {
            cutscene.classList.add('dismiss');
            cutscene.style.transform = 'translateY(-100%)';
            cutscene.addEventListener('transitionend', () => {
                cutscene.style.display = 'none';
            }, { once: true });
        } else {
            cutscene.style.transform = 'translateY(0px)';
            setTimeout(() => {
                if (!dragActive) cutscene.style.transition = '';
            }, 250);
        }
        currentY = 0;
    });
} else if (cutscene) {
    cutscene.style.display = 'none';
}

//EVENT LISTENERS FOR CEREAL & NEWSPAPER --------------------------------
document.getElementById('cerealBox').addEventListener('click', () => {
    openPopup(CEREAL_WORDS, 'cereal');
});
document.getElementById('newspaper').addEventListener('click', () => {
    openPopup(NEWSPAPER_WORDS, 'newspaper');
});
popupCloseBtn.addEventListener('click', closePopup);
popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) closePopup();
});

//ENDING RESET ---------------------------
endingResetBtn.addEventListener('click', resetGame);

//START ----------------
resetGame();
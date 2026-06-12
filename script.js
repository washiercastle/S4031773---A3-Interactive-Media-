// Dev shortcuts
const CUTSCENE_ENABLED = false;   // change to false to disable

// WORD LIST (10 words)
const ALL_WORDS = ["LOVE","SMILE","HAPPY","HATE","CRY","UGLY","TABLE","CHAIR","WALK","BLUE"];

const FAMILY = [
    { name: "MOM", icon: "👩" },
    { name: "DAD", icon: "👨" },
    { name: "LILY", icon: "🧒" },
    { name: "MAX", icon: "👦" }
];

function getReactionType(word) {
    const pos = ["LOVE","SMILE","HAPPY"];
    const neg = ["HATE","CRY","UGLY"];
    if (pos.includes(word)) return "POSITIVE";
    if (neg.includes(word)) return "NEGATIVE";
    return "NEUTRAL";
}

const REACTION_MAP = {
    POSITIVE: ["OUR LITTLE ANGEL", "CUTIE WOOTIE SWEETIE PIE", "What an outstanding little guy"],
    NEGATIVE: ["Oh that's quite concerning, who's been teaching him these things???", "No no no baby!!", "Your sister is not that bad :("],
    NEUTRAL: ["Okay... ", "Yes Shakespear", "How cute"]
};

// DOM elements
const fridgeDropZone = document.getElementById('fridgeDropZone');
const fridgeWordsContainer = document.getElementById('fridgeWords');
const inventoryContainer = document.getElementById('inventoryItems');
const familyIconSpan = document.getElementById('familyIconFridge');
const reactionTextSpan = document.getElementById('reactionTextFridge');
const resetBtn = document.getElementById('resetBtn');
const worldDiv = document.getElementById('world'); // for blur effect

// Drag state
let draggedItem = null;
let dragOffsetX = 0, dragOffsetY = 0;
let originalParent = null;

// Create a draggable word element
function createWordElement(word) {
    const div = document.createElement('div');
    div.textContent = word;
    div.classList.add('word-item');
    div.setAttribute('data-word', word);
    div.addEventListener('mousedown', onMouseDown);
    return div;
}

function onMouseDown(e) {
    e.stopPropagation();
    if (e.button !== 0) return;
    draggedItem = this;
    originalParent = this.parentNode;
    const rect = this.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    this.style.position = 'fixed';
    this.style.zIndex = '9999';
    this.style.left = `${e.clientX - dragOffsetX}px`;
    this.style.top = `${e.clientY - dragOffsetY}px`;
    this.style.margin = '0';
    document.body.appendChild(this);
    e.preventDefault();
}

window.addEventListener('mousemove', (e) => {
    if (!draggedItem) {
        fridgeDropZone.classList.remove('drag-over');
        inventoryContainer.classList.remove('drag-over');
        return;
    }
    // Move the dragged element
    draggedItem.style.left = `${e.clientX - dragOffsetX}px`;
    draggedItem.style.top = `${e.clientY - dragOffsetY}px`;

    // Highlight drop zones
    const underCursor = document.elementsFromPoint(e.clientX, e.clientY);
    let overFridge = false, overInventory = false;
    for (let el of underCursor) {
        if (el === draggedItem) continue;
        if (el.closest('#fridgeDropZone')) overFridge = true;
        if (el.closest('#inventoryItems')) overInventory = true;
    }
    fridgeDropZone.classList.toggle('drag-over', overFridge);
    inventoryContainer.classList.toggle('drag-over', overInventory);
});

window.addEventListener('mouseup', (e) => {
    if (!draggedItem) return;
    const word = draggedItem.textContent;

    // Get all elements under cursor, ignoring the dragged item itself
    const underCursor = document.elementsFromPoint(e.clientX, e.clientY);
    let targetZone = null; // 'fridge', 'inventory', or null

    for (let el of underCursor) {
        if (el === draggedItem) continue; // skip the ghost
        if (el.closest('#fridgeDropZone')) {
            targetZone = 'fridge';
            break;
        }
        if (el.closest('#inventoryItems')) {
            targetZone = 'inventory';
            break;
        }
    }

    if (targetZone === 'fridge') {
        draggedItem.remove();
        const newWord = createWordElement(word);
        fridgeWordsContainer.appendChild(newWord);
        triggerReaction(word);
    }
    else if (targetZone === 'inventory') {
        draggedItem.remove();
        const newWord = createWordElement(word);
        inventoryContainer.appendChild(newWord);
        showInventoryMessage(word);
    }
    else {
        // Return to original container
        draggedItem.style.position = '';
        draggedItem.style.left = '';
        draggedItem.style.top = '';
        draggedItem.style.zIndex = '';
        if (originalParent) originalParent.appendChild(draggedItem);
    }

    // Clean up
    draggedItem = null;
    originalParent = null;
    // Remove visual highlights
    fridgeDropZone.classList.remove('drag-over');
    inventoryContainer.classList.remove('drag-over');
});

function triggerReaction(word) {
    const randomFamily = FAMILY[Math.floor(Math.random() * FAMILY.length)];
    const type = getReactionType(word);
    const phrase = REACTION_MAP[type][Math.floor(Math.random() * REACTION_MAP[type].length)];
    familyIconSpan.textContent = randomFamily.icon;
    reactionTextSpan.textContent = `${randomFamily.name}: “${phrase}” (${word})`;
    const box = document.querySelector('.submission-frame');
    if (type === 'NEGATIVE') {
        box.style.backgroundColor = '#ffaaaa';
        setTimeout(() => box.style.backgroundColor = '#e0e0e0', 300);
    } else {
        box.style.backgroundColor = '#e0e0e0';
    }
}

function showInventoryMessage(word) {
    familyIconSpan.textContent = '📦';
    reactionTextSpan.textContent = `“${word}” returned to bable eaty table_. Drag it to fridge anytime.`;
    const box = document.querySelector('.submission-frame');
    box.style.backgroundColor = '#cfe2ff';
    setTimeout(() => box.style.backgroundColor = '#e0e0e0', 400);
}

// Blur effect when hovering fridge
const fridgeUI = document.getElementById('fridgeUI');
fridgeUI.addEventListener('mouseenter', () => worldDiv.classList.add('blurred'));
fridgeUI.addEventListener('mouseleave', () => worldDiv.classList.remove('blurred'));
fridgeDropZone.addEventListener('dragenter', () => worldDiv.classList.add('blurred'));
fridgeDropZone.addEventListener('dragleave', () => {
    if (!fridgeUI.matches(':hover')) worldDiv.classList.remove('blurred');
});

// Reset game
function resetGame() {
    fridgeWordsContainer.innerHTML = '';
    inventoryContainer.innerHTML = '';
    ALL_WORDS.forEach(word => {
        inventoryContainer.appendChild(createWordElement(word));
    });
    familyIconSpan.textContent = '👤';
    reactionTextSpan.textContent = 'Drag words from table to fridge!';
    worldDiv.classList.remove('blurred');
}
resetBtn.addEventListener('click', resetGame);

// ---------- CUTSCENE: PHYSICAL DRAG UP (with toggle) ----------
const cutscene = document.getElementById('cutscene');

if (CUTSCENE_ENABLED && cutscene) {
    let dragActive = false;
    let startY = 0;
    let currentY = 0;

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
    // Cutscene disabled: hide it immediately
    cutscene.style.display = 'none';
}

resetGame(); // initialize inventory on page load
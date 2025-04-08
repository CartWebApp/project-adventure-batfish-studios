let rooms = {};
let currentRoom;
let player;
let isGameLoop = true;
let choicesMade = [];

// Limits a number to be between a min and a max
function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min)
}

// Pauses for a given amount of time (use async function and do "await sleep(ms)")
function sleep(ms=0) {
    return new Promise(rs => setTimeout(rs, ms));
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// halts until element is clicked
async function awaitClick(element) {
    return new Promise(resolve => {
        element.addEventListener('click', () => {
          resolve();
        }, { once: true });
      });
}

class Player {
    constructor() {
        this.inventory = [];
        this.maxHP = 100;
        this.hp = this.maxHP;
    }

    // Adds an item to the players inventory
    addItem(item) {
        this.inventory.push(item);
    }

    // Adds an item to the players inventory
    removeItem(item) {
        this.inventory.splice(this.inventory.indexOf(item), 1);
    }

    // Changes the players hp
    changeHP(amount) {
        this.hp = clamp(this.hp + amount, 0, this.maxHP)
    }
}

// Holds game logic methods
class game {

    // Gives an item to the player's inventory
    getItems(...items) {
        for (const item of items) {
            player.addItem(item);
        }
    }

    // Removes an item from the player's inventory
    takeItem(item) {
        player.removeItem(item);
    }

    // Returns whether the player has an item in their inventory
    hasItem(item) {
        if (player.inventory.contains(item)) {
            return true;
        } else {
            return false;
        }
    }

}

class Room {
    constructor(name) {
        this.name = name;
        this.choices = [];
        this.storyParts = []; // gets displayed when entering a room
    }

    // adds a choice to the room
    addChoice(choice) {
        this.choices.push(choice);
    }

    // adds a story line to the room
    addStory(story, speed=30, variance=30, animation='default') {
        this.storyParts.push({text: story, speed, variance, animation});
    }
}

// parses text for color identifiers, returning clean text and a dictionary of location + color identifiers
// example color identifier: [c:#0011] for green, or [c:] to reset
function parseColors(text) {
    let data = [];
    while (text.includes('[c:')) {
        let index = text.indexOf('[c:');
        let match = text.match(/(\[c:)([^\]]*)(\])/);
        let color = match[2];
        data.push({index, color});
        text = text.substring(0, index) + text.substring(index + match[0].length)
    }
    return {text, data}
}

// returns an element with color formatted text
function formatText(text, colorData) {
    colorData = colorData ?? parseColors(text);
    let colorDataIndex = 0;
    characterIndex = 0;
    let formattedElement = document.createElement('span');
    formattedElement.className = 'finished-text';
    let currentColor = '';
    let wordArray = colorData.text.split(' ')
    for (let word of wordArray) {
        let wordSpan = document.createElement('span')
        wordSpan.className = 'transition-word';
        formattedElement.appendChild(wordSpan)
        for (let char of word) {
            if (characterIndex === colorData.data[colorDataIndex]?.index) {
                currentColor = colorData.data[colorDataIndex].color;
                colorDataIndex += 1;
            }
            let charSpan = document.createElement('span');
            charSpan.textContent = char;
            charSpan.className = `transition-character`;
            charSpan.style.color = currentColor;
            wordSpan.appendChild(charSpan);
            characterIndex++;
        }
        let space = document.createElement('span');
        space.textContent = ' ';
        space.className = `transition-character`;
        wordSpan.appendChild(space);
        if (characterIndex === colorData.data[colorDataIndex]?.index) {
            currentColor = colorData.data[colorDataIndex].color;
            colorDataIndex += 1;
        }
        characterIndex++;
    }
    return formattedElement;
}

// types out text (can be skipped by clicking on element)
async function typeText(text, element, speed=10, variance=0, skippable=true, skipElement=null, animation='none') {
    let skipped = false;

    let skipFunction = () => {
        speed = 0;
        variance = 0;
        skipElement.addEventListener('click', hardSkipFunction);
        element.removeEventListener('click', skipFunction);
    }
    let hardSkipFunction = () => {
        skipped = true;
        element.removeEventListener('click', hardSkipFunction);
    }
    if (skippable) {
        skipElement = skipElement ?? element; // the element the user clicks on to trigger skip
        skipElement.addEventListener('click', skipFunction);
    }

    let formattedElement = formatText(text);
    element.innerHTML = `<span class='finished-text'></span>`;
    for (const word of formattedElement.children) {
        let wordSpan = word.cloneNode(false);
        element.appendChild(wordSpan)
        for (const char of word.children) {
            if (skipped) break;
            let newChar = char.cloneNode(true);
            newChar.classList.add(animation);
            wordSpan.appendChild(newChar);
            await sleep(speed + random(0, variance));
        }
    }

    if (skipped) {
        element.innerHTML = '';
        element.appendChild(formattedElement);
        return;
    }
    
}

// diplays each story part to the dialogue box
async function showStory(story) {
    const dialogueBox = document.getElementById('dialogue-box');
    const storyElement = document.getElementById('story');
    for (const part of story) {
        await typeText(part.text, storyElement, part.speed, part.variance, true, dialogueBox, part.animation);
        await awaitClick(dialogueBox)
    }
}

// repeats every room
async function gameLoop() {
    let currentRoom = rooms['Example'];
    while (isGameLoop) {
        await showStory(currentRoom.storyParts);
    }
}

function createEventListeners() {

}

// initializes the rooms and player
function init() {
    createEventListeners();
    player = new Player();
    let room = new Room('Example');

    // add colors to text by doing [c: + any valid css color + ]. To reset color, just do [c:]
    // EX: [c:red] = [c:#ff0000] = [c:rgb(255,0,0)]
    room.addStory(`This is a [c:red]test[c:] story`);
    room.addStory(`This is a [c:red]test[c:] story [c:#00ff00]continued`, 100, 33, 'impact');
    room.addStory(`[c:#c5c5c5]Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, 10, 3, 'funky');
    room.addStory(`Woah`, 1000, 100, 'shaky');
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect!`, 100, 10, 'blur');
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, 50, 10, 'fade-alternate');
    room.choices.push({
        name: 'Example choice',
        actions: [{ // actions 
            type: 'getItems',
            parameters: ['item1', 'item2']
        }],
        requirements: [{
            type: 'hasItem',
            parameters: ['Example Key']
        }]
    })
    rooms[room.name] = room;
}

window.addEventListener('DOMContentLoaded', () => {
    init();
    gameLoop();
})

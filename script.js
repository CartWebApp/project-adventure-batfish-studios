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

// types out text (can be skipped by clicking on element)
async function typeText(text, element, speed=10, variance=0, skippable=true, skipElement=null, animation='none') {
    let isWriting = true;

    let skipFunction = () => {
        speed = 0;
        skipElement.addEventListener('click', hardSkipFunction);
        element.removeEventListener('click', skipFunction);
    }
    let hardSkipFunction = () => {
        isWriting = false;
        element.removeEventListener('click', hardSkipFunction);
    }
    if (skippable) {
        skipElement = skipElement ?? element; // the element the user clicks on to trigger skip
        skipElement.addEventListener('click', skipFunction);
    }

    element.innerHTML = `<span class='finished-text'></span>`;
    for (const word of text.split(' ')) {
        let wordSpan = document.createElement('span')
        wordSpan.className = 'transition-word';
        element.appendChild(wordSpan)
        for (const textChar of word) {
            if (!isWriting) break;
            let charSpan = document.createElement('span');
            charSpan.textContent = textChar;
            charSpan.className = `transition-character ${animation}`;
            wordSpan.appendChild(charSpan);
            await sleep(speed + random(0, variance));
        }
        if (!isWriting) break;
        let space = document.createElement('span');
        space.textContent = ' ';
        space.className = `transition-character ${animation}`;
        wordSpan.appendChild(space);
    }

    if (!isWriting) {
        element.innerHTML = `<span class='finished-text'>${text}</span>`
        return;
    }
    let lastChar = element.querySelector('.transition-word:last-of-type .transition-character:last-of-type')
    // sets the dialogue to be just text, no spans
    lastChar.addEventListener('animationend', () => {
        element.innerHTML = `<span class='finished-text'>${text}</span>`;
    })
    
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
    room.addStory(`This is test story`);
    room.addStory(`This is test story continued`, 100, 33, 'impact');
    room.addStory(`Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, 10, 3, 'funky');
    room.addStory(`Woah`, 1000, 100, 'shaky');
    room.addStory(`Cooleo! This is a neat blur effect`, 100, 10, 'blur');
    room.addStory(`Or maybe try alternating text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, 50, 10, 'fade-alternate');
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

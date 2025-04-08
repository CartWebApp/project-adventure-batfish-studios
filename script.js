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
        this.story = []; // gets displayed when entering a room
    }

    // adds a choice to the room
    addChoice(choice) {
        this.choices.push(choice);
    }

    // adds a story line to the room
    addStory(choice) {
        this.story.push(choice);
    }
}

// types out text (can be skipped by clicking on element)
async function typeText(text, element, speed=10, variance=0, skippable=true, skipElement=null) {
    let clickListener;
    let isWriting = true;

    let skip = () => { isWriting = false; }
    if (skippable) {
        skipElement = skipElement ?? element; // the element the user clicks on to trigger skip
        clickListener = skipElement.addEventListener('click', skip);
    }

    for (let i = 0; i < text.length; i++) {
        if (isWriting) {
            element.textContent = text.substr(0, i)
            await sleep(speed + random(0, variance));
        }
    }
    
    isWriting = false;
    element.textContent = text;

    if (skippable) element.removeEventListener('click', skip);
    
}

// diplays each story part to the dialogue box
async function showStory(story) {
    const dialogueBox = document.getElementById('dialogue-box');
    const storyElement = document.getElementById('story');
    for (const part of story) {
        await typeText(part, storyElement, 30, 10, true, dialogueBox);
        await awaitClick(dialogueBox)
    }
}

async function gameLoop() {
    let currentRoom = rooms['Example'];
    while (isGameLoop) {
        await showStory(currentRoom.story);
    }
}

function createEventListeners() {

}

function init() {
    createEventListeners();
    let player = new Player();

    let room = new Room('Example');
    room.addStory(`This is test story`);
    room.addStory(`This is test story continued`);
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

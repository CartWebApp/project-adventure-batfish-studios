let rooms = {};
let currentRoom;
let player;
let gameLoop = true;
let choicesMade = [];

// Limits a number to be between a min and a max
function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min)
}

// Pauses for a given amount of time (use async function and do "await sleep(ms)")
function sleep(ms) {
    return new Promise(rs => setTimeout(rs, ms));
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

function gameLoop() {
    let room = new Room('')
}

function init() {
    let player = new Player();

    let room = new Room('Example');
    room.addStory(`This is test story`);
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

window.addEventListener('DOMContentLoaded', init)

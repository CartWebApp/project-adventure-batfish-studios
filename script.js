let rooms = {};
let currentRoom;
let player;
let isGameLoop = true;
let choicesMade = [];
let textController; // makes text writing cancellable
let textControllerSignal;
let textCancelled = false;
let game;

// Limits a number to be between a min and a max
function clamp(num, min, max) {
    return Math.max(Math.min(num, max), min)
}

// Pauses for a given amount of time (use async function and do "await sleep(ms)")
function sleep(ms=0) {
    return new Promise(rs => setTimeout(rs, ms));
}

// pauses for a set time or until a set condition is met
 function cancelableSleep(ms=0, signal) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);
    
        signal?.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new Error("Sleep aborted"));
        });
      });
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

// halts until any element in a list of elements is clicked
async function awaitClickList(elements) {
    return new Promise(resolve => {
        for (const element of elements) {
            element.addEventListener('click', () => {
              resolve();
            }, { once: true });
        }
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
class Game {
    constructor() {

    }

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
        if (player.inventory.includes(item)) {
            return true;
        } else {
            typeText(`You do not have [[c:yellow]${item}[:]]`, document.getElementById('story'));
            return false;
        }
    }

}

class Choice {
    constructor(name, speed=4, variance=1, animation='default') {
        this.name = name;
        this.speed = speed;
        this.variance = variance;
        this.animation = animation;
        this.actions = [];
        this.requirements = [];
    }

    addAction(type, ...parameters) {
        this.actions.push({type, parameters})
    }

    addRequirement(type, ...parameters) {
        this.requirements.push({type, parameters})
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

// parses text for identifiers, returning clean text and a dictionary of location + identifier values
function parseText(text, identifier) {
    let data = [];
    let cleanText = text;
    let specialMatches = [...text.matchAll(new RegExp(String.raw`(\[)(?!\[)(?!${identifier}:)([^:^\]]*:)([^\]]*)(\])`, 'g'))];
    for (const match of specialMatches.reverse()) {
        let index = match.index;
        cleanText = cleanText.substring(0, index) + cleanText.substring(index + match[0].length)
    }
    while (cleanText.includes(`[${identifier}:`)) {
        let match = cleanText.match(new RegExp(String.raw`(\[)(?=${identifier || ':'})(${identifier}:)([^\]]*)(\])`));
        let index = match.index;
        let value = match[3];
        data.push({index, value});
        cleanText = cleanText.substring(0, index) + cleanText.substring(index + match[0].length);
    }
    return {text: cleanText, data}
}


// returns an element with color formatted text
function formatText(text) {
    //to add a style, just put a valid css style in the name and add an identifier
    let textStyles = [
        {name: 'reset', identifier: ''}, // parses for full style resets (removes all styles). Syntax is [-:]
        {name: 'color', identifier: 'c'}, // example color identifier: [c:#0011] for green, or [c:] to reset
        {name: 'fontFamily', identifier: 'ff'}, // example font families identifier: [ff:'Courier New'], or [ff:] to reset
        {name: 'fontSize', identifier: 'fs'}, // example font sizes identifier: [fs:32px], or [fs:] to reset
        {name: 'rotate', identifier: 'rt'}, // example rotation identifier: [rt:180deg], or [rt:] to reset
        {name: 'textShadow', identifier: 'ts'}, // example text shadow identifier: [ts:4px,4px,3px,yellow], or [ts:] to reset
        {name: 'animation', identifier: 'an'}, // example animation identifier: [an:text-blur 1s ease], or [an:] to reset
        {name: 'filter', identifier: 'fi'}, // example filter identifier: [fi:blur(6px)], or [fi:] to reset
    ]

    for (const style of textStyles) {
        let parsedData = parseText(text, style.identifier);
        style.data = parsedData.data;
        style.dataIndex = 0;
        style.currentValue = style.currentValue ?? '';
    }

    let cleanText = parseText(text, 'This returns the clean text because nothing matches this.').text;
    characterIndex = 0;
    let formattedElement = document.createElement('span');
    formattedElement.className = 'finished-text';
    let wordArray = cleanText.split(' ')
    for (let word of wordArray) {
        let wordSpan = document.createElement('span')
        wordSpan.className = 'transition-word';
        formattedElement.appendChild(wordSpan)
        for (let char of word) {
            let charSpan = document.createElement('span');
            charSpan.textContent = char;
            charSpan.className = `transition-character`;
            for (const style of textStyles) {
                if (characterIndex === style.data[style.dataIndex]?.index) {
                    style.currentValue = style.data[style.dataIndex].value;
                    style.dataIndex += 1;
                    if (style.name === 'reset') {
                        for (const style of textStyles) {
                            style.currentValue = '';
                        }
                    }
                }
                charSpan.style[style.name] = style.currentValue;
            }
            wordSpan.appendChild(charSpan);
            characterIndex++;
        }
        let space = document.createElement('span');
        space.textContent = ' ';
        space.className = `transition-character`;
        for (const style of textStyles) {
            if (characterIndex === style.data[style.dataIndex]?.index) {
                style.currentValue = style.data[style.dataIndex].value;
                style.dataIndex += 1;
                if (style.name === 'reset') {
                    for (const style of textStyles) {
                        style.currentValue = '';
                    }
                }
            }
            space.style[style.name] = style.currentValue;
        }
        wordSpan.appendChild(space);
        characterIndex++;
    }
    return formattedElement;
}

// types out text (can be skipped by clicking on element)
async function typeText(text, element, speed=10, variance=0, skippable=true, skipElement=null, animation='none', signal=textControllerSignal) {
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
            if (skipped || textCancelled) break;
            let newChar = char.cloneNode(true);
            newChar.classList.add(animation);
            wordSpan.appendChild(newChar);
            try {
                await cancelableSleep(speed + random(0, variance), signal);
            } catch (error) {
                textCancelled = true;
            }
        }
    }

    if (skipped && !textCancelled) {
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

// diplays each choice to the dialogue box
async function showChoices(choices) {
    const dialogueBox = document.getElementById('dialogue-box');
    const choiceContainer = document.getElementById('choices');
    let choiceElements = [];
    let choiceTexts = [];
    let selectedChoice;

    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        let choiceElement = document.createElement('button');
        choiceElement.className = 'choice';
        choiceElement.id = `choice-${i}`;
        choiceContainer.appendChild(choiceElement);
        choiceElement.addEventListener('click', () => {selectedChoice = choice})
        choiceElements.push(choiceElement);
        choiceTexts.push(choice.name);
        typeText(choice.name, choiceElement, choice.speed, choice.variance, true, dialogueBox, choice.animation, textControllerSignal);
    }

    await awaitClickList(choiceElements);
    choiceContainer.innerHTML = '';
    return selectedChoice;
}

// returns weather all the requirments are met to make a choice
function checkRequirements(choice) {
    for (const requirement of choice.requirements) {
        if (!game[requirement.type](...requirement.parameters)) {
            return false;
        }
    }
    return true;
}


// repeats every room
async function gameLoop() {
    let currentRoom = rooms['Example'];
    while (isGameLoop) {
        await showStory(currentRoom.storyParts);
        let selectedChoice;
        let metReqirements = false;
        while (!metReqirements) {
            selectedChoice = await showChoices(currentRoom.choices);
            textCancelled = true;
            textController?.abort();
            textController = new AbortController();
            textControllerSignal = textController.signal;
            await sleep(10);
            textCancelled = false;
            metReqirements = checkRequirements(selectedChoice);
        }
    }
}

function createEventListeners() {

}

// initializes the rooms and player
function init() {
    createEventListeners();
    player = new Player();
    game = new Game();
    let room = new Room('Example');
    let choice = new Choice('Example choice');

    // add styles to text by doing [identifier: + any valid css color + ]
    // to reset that style, just do [identifier:]. to reset all styles, do [:]
    // EX: [c:red] = [c:#ff0000] = [c:rgb(255,0,0)]
    room.addStory(`This is a [an:text-blur .4s ease][c:red]test[c:] story`);
    room.addStory(`This is a [c:red]test[c:] [fi:blur(1px)]story[fi:] [c:#00ff00][ff:'Courier New'][fs:32px]contin[:]ued`, 100, 33, 'impact');
    room.addStory(`[ts:2px 2px 2px white][c:#c5c5c5]Lorem [rt:90deg]ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et [rt:180deg]dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure [rt:270deg]dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui [rt:]officia deserunt mollit anim id est laborum.`, 10, 3, 'funky');
    room.addStory(`Woah`, 1000, 100, 'shaky');
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect! I like it so much, I think I will put [c:yellow][fs:24px]more[:] text!`, 100, 10, 'blur');
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, 50, 10, 'fade-alternate');

    choice.addAction('getItems', 'item1', 'item2');
    choice.addRequirement('hasItem', 'Example Key');
    room.choices.push(choice);

    rooms[room.name] = room;
}

window.addEventListener('DOMContentLoaded', () => {
    init();
    gameLoop();
})

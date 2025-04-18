let rooms = {};

let currentRoom;
let player;
let isGameLoop = true;
let choicesMade = [];
let textController; // makes text writing cancellable
let textControllerSignal;
let textCancelled = false;
let game;
let currentEnding = 'unset';
let endings = {}; // holds the possible ending names and text
let startingRoom = 'b-start'; // [ 'Example Room' ][ 'b-start' ]

const parsableStyles = [
    {name: 'reset', identifier: ''}, // parses for full style resets (removes all styles). Syntax is [-:]
    {name: 'color', identifier: 'c'}, // example: [c:#0011] for green, or [c:] to reset
    {name: 'fontFamily', identifier: 'ff'}, // example: [ff:'Courier New'], or [ff:] to reset
    {name: 'fontSize', identifier: 'fs'}, // example: [fs:32px], or [fs:] to reset
    {name: 'rotate', identifier: 'rt'}, // example: [rt:180deg], or [rt:] to reset
    {name: 'textShadow', identifier: 'ts'}, // example: [ts:4px,4px,3px,yellow], or [ts:] to reset
    {name: 'animation', identifier: 'an'}, // example: [an:text-blur 1s ease], or [an:] to reset
    {name: 'filter', identifier: 'fi'}, // example: [fi:blur(6px)], or [fi:] to reset
    {name: 'scale', identifier: 'sc'}, // example: [sc:1.5], or [sc:] to reset
    {name: 'opacity', identifier: 'op'}, // example: [op:0.5], or [op:] to reset
]  

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

// returns a random number between 2 numbers, rounded to a given number of decimals
function random(min, max, places=0) {
    return Math.floor(Math.random() * (max - min + 1) * 10**places) / 10**places + min;
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

// waits for an animation to end
async function awaitAnimation(element) {
    return new Promise(resolve => {
        element.addEventListener('animationend', () => {
            resolve();
        }, { once: true });
      });
}

// copies an object's properties to another object
function transferProperties(transferFrom, transferTo) {
    for( [key, value] of Object.entries(transferFrom)) {
        transferTo[key] = value;
    }
}

// checks if a key-value pair exists in an array of objects
// ex: checkPropertyValues([{id: 1}, {id: 2}], 'id', 2) -> true
// ex: checkPropertyValues([{id: 1}, {id: 2}], 'id', 3) -> false
function checkPropertyValues(array, key, value) {
    for (const object of array) {
        if (object[key] && object[key] === value) {
            return true;
        }
    }
    return false;
}

// gets the value of a root property
function getRootVar(propertyName) {
    if (window.getComputedStyle(document.documentElement).getPropertyValue('--' + propertyName) != ''){
        document.documentElement.style.setProperty('--' + propertyName, value);
    }
}

// sets the value of a root property
function setRootVar(propertyName, value) {
    document.documentElement.style.setProperty('--' + propertyName, value);
}

// toggles which is the visible child element of a container (only 1 can be visible)
function setVisibleChild(activeChild, parent) {
    for (const child of parent.children) {
        if (child != activeChild) {
            child.style.display = 'none';
        }
    }
    activeChild.style.display = '';
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
    getItems(items, customMessage='') {
        let messages = []
        for (const item of items) {
            player.addItem(item);
            messages.push(customMessage || `Obtained [[c:var(--item-color)]${item}[:]]`)
        }
        return {messages}
    }

    // Removes an item from the player's inventory
    removeItem(item) {
        player.removeItem(item);
    }

    // changes the current room to a new room
    changeRoom(room) {
        currentRoom = rooms[room];
    }

    // changes the background
    // ex: changeBG('escapeBG.jpg');
    async changeBG(name, transition={}) {
        transition.out = transition.out ?? '[an:fade-out .5s ease]';
        transition.in = transition.in ?? '[an:fade-in .5s ease]';
        transition.waitsOut = transition.waitsOut ?? false;
        transition.waitsIn = transition.waitsIn ?? false;
        clearDialogueText();
        const background = document.getElementById('background-image');
        if (transition.out && transition.waitsOut) {
            game.styleBG(transition.out)
            await awaitAnimation(background);
        } else if (transition.out && !transition.waitsOut) {
            game.styleBG(transition.out)
        }
        if (name) {
            background.src = `imgs/backgrounds/${name}`;
        }
        if (transition.in && transition.waitsIn) {
            game.styleBG(transition.in)
            await awaitAnimation(background);
        } else if (transition.in && !transition.waitsIn) {
            game.styleBG(transition.in)
        }
    }

    // applies styles given by a string of style identifiers to the background
    styleBG(string) {
        applyStyle(document.getElementById('background-image'), generateStyleList(string));
    }

    // initiates an ending
    async ending(endType) {
        isGameLoop = false;
        currentEnding = endings[endType];
        clearDialogueText();
        for (const item of currentEnding.queuelist) {
            if (item.type === 'story') {
                clearText(document.getElementById('story'));
                await showStory([item.value]);
                clearText(document.getElementById('action-output'));
            } else if (item.type === 'choicelist') {
                while (getShownChoices(item.value).length > 0) {
                    showChoices(item.value);
                    let selectedChoice = await tryChoices(document.getElementById('choices'));
                    choicesMade.push(selectedChoice);
                    clearText(document.getElementById('action-output'))
                    clearText(document.getElementById('choices'))
                    if (selectedChoice.text === 'Restart') {
                        attemptActionsWithText(selectedChoice.actions);
                    } else {
                        await attemptActionsWithText(selectedChoice.actions);
                    }
                }
            } else if (item.type === 'actionlist') {
                await attemptActionsWithText(item.value);
            }
        }
        clearDialogueText();
        await sleep(10);
    }

        
    

    async restart() {
        player = new Player();
        currentRoom = startingRoom;
        isGameLoop = true;
        choicesMade = [];
        document.getElementById('history-content').innerHTML = '';
        await sleep(10);
        clearDialogueText();
        document.getElementById('background-image').src = 'imgs/backgrounds/transparent.png'
        gameLoop();
    }

    // Returns whether the player has an item in their inventory
    hasItem(item, customMessage='') {
        if (player.inventory.includes(item)) {
            return true;
        } else {
            let message = customMessage || `You do not have [[c:yellow]${item}[:]]`;
            return {result: false, message};
        }
    }

    madeChoice(choiceId) {
        return checkPropertyValues(choicesMade, 'id', choiceId);
    }

}

// default text object for writing to the page
class textObject {
    constructor(text, options, speed, variance, animation, skippable, waits, waitDelay) {
        this.text = text ?? '';
        this.speed = speed ?? 0;
        this.variance = variance ?? 0;
        this.animation = animation ?? 'none';
        this.skippable = skippable ?? false;
        this.waits = waits ?? false;
        this.waitDelay = waitDelay ?? 0
        this.options = options ?? {};
        transferProperties(this.options, this);
    }
}

class Choice extends textObject {
    constructor(text, options={}, repeatable=false, speed=4, variance=1, animation='default', skippable=true, room=undefined, id='') {
        super(text, options, speed, variance, animation, skippable, true, 0);
        this.hidden = false;
        this.repeatable = repeatable;
        this.room = room;
        this.id = id;
        this.actions = [];
        this.requirements = [];
        transferProperties(this.options, this);
        if (!this.repeatable && this.room) {
            this.addRequirement({mode: 'show', type: 'madeChoice', inverse: true, parameters: [this.id]})
        }
    }

    addAction(options, type, parameters, waits) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters ?? [];
        waits = options.waits ?? false;
        this.actions.push({type, parameters, waits})
    }

    addRequirement(options, mode, type, parameters, inverse=false) {
        mode = options.mode ?? mode;
        type = options.type ?? type;
        inverse = options.inverse ?? inverse; // makes it required to NOT meet the requirement
        parameters = options.parameters ?? parameters ?? [];
        this.requirements.push({mode, type, inverse, parameters})
    }

    hide() {
        this.hidden = true;
    }

}

class Room {
    constructor(name, bg) {
        this.name = name;
        this.bg = bg ?? {};
        this.bg.transition = this.bg.transition ?? {out: '[an:fade-out .5s ease]', in: '[an:fade-in .5s ease]', waitsOut: true, waitsIn: false}
        this.bg.transition.waitsOut = this.bg.transition.waitsOut ?? true;
        this.choices = [];
        this.storyParts = []; // gets displayed when entering a room
        this.actions = [];
        this.queuelist = []; // holds the order that everything in the room should happen
        if (this.bg) { this.addAction({type: 'changeBG', parameters: [this.bg.name, this.bg.transition]}) }
    }

    // adds a choice to the room
    addChoice(choice) {
        this.choices.push(choice);
        const lastInQueue = this.queuelist[this.queuelist.length - 1]
        if (lastInQueue && lastInQueue.type === 'choicelist') {
            lastInQueue.value.push(choice)
        } else {
            this.queuelist.push({type: 'choicelist', value: [choice]});
        }
    }

    // creates a choice
    createChoice(text, options, repeatable, speed, variance, animation, skippable) {
        const id = this.getChoiceId(this.choices.length + 1);
        const choice = new Choice(text, options, repeatable, speed, variance, animation, skippable, this, id);
        this.addChoice(choice);
        return choice;
    }

    // returns the id of a choice given the choice number
    getChoiceId(choiceNumber) {
        return `${this.name}-${choiceNumber}`;
    }

    // adds a story line to the room
    addStory(text, options, speed=20, variance=5, animation='default', waits=true, waitDelay=0, skippable=true) {
        let storyObject = new textObject(text, options, speed, variance, animation, skippable, waits, waitDelay);
        this.storyParts.push(storyObject);
        this.queuelist.push({type: 'story', value: storyObject});

    }

    // adds an action for a room
    addAction(options, type, parameters) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters ?? [];
        const action = {type, parameters};
        this.actions.push(action);

        const lastInQueue = this.queuelist[this.queuelist.length - 1]
        if (lastInQueue && lastInQueue.type === 'actionlist') {
            lastInQueue.value.push(action)
        } else {
            this.queuelist.push({type: 'actionlist', value: [action]});
        }
    }
}

class Ending extends Room {
    constructor(name, bg) {
        super(name, bg);
    }
}

// creates a room and adds it to rooms
function createRoom(name, bg) {
    const newRoom = new Room(name, bg);
    rooms[newRoom.name] = newRoom;
    return newRoom;
}

// creates an ending and adds it to endings
function createEnding(name, bg) {
    const newEnding = new Ending(name, bg);
    endings[newEnding.name] = newEnding;
    return newEnding;
}

// parses a string for style identifiers, returning clean text and a dictionary of location + identifier values
function parseStyles(text, identifier) {
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

function generateStyleList(string) {
    let styleList = JSON.parse(JSON.stringify(parsableStyles));
    for (const style of styleList) {
        let parsedData = parseStyles(string, style.identifier);
        style.data = parsedData.data;
        style.dataIndex = 0;
        style.currentValue = style.currentValue ?? '';
    }
    return styleList;
}

// applies a parsed styleList to an element
function applyStyle(element, styleList, characterIndex) {
    for (const style of styleList) {
        if (style.data[0] && (characterIndex === undefined || characterIndex === style.data[style.dataIndex]?.index)) {
            style.currentValue = style.data[style.dataIndex].value;
            style.dataIndex += 1;
            if (style.name === 'reset') {
                for (const style of styleList) {
                    style.currentValue = '';
                }
            }
        }
        element.style[style.name] = style.currentValue;
    }
}

// returns an element with color formatted text
function formatText(text) {
    //to add a style, just put a valid css style in the name and add an identifier
    let textStyles = generateStyleList(text);

    let cleanText = parseStyles(text, 'This returns the clean text because nothing matches this.').text;
    characterIndex = 0;
    let formattedElement = document.createElement('span');
    let wordArray = cleanText.split(' ')
    for (let i = 0; i < wordArray.length; i++) {
        let word = wordArray[i];
        let wordSpan = document.createElement('span')
        wordSpan.className = 'transition-word';
        formattedElement.appendChild(wordSpan)
        for (let char of word) {
            let charSpan = document.createElement('span');
            charSpan.textContent = char;
            charSpan.className = `transition-character`;
            applyStyle(charSpan, textStyles, characterIndex);
            wordSpan.appendChild(charSpan);
            characterIndex++;
        }
        let space = document.createElement('span');
        space.textContent = ' ';
        space.className = `transition-character`;
        applyStyle(space, textStyles, characterIndex);
        if (i != wordArray.length - 1) {
            wordSpan.appendChild(space);
            characterIndex++;
        }
    }
    return formattedElement;
}

// clears the text in an element
function clearText(element) {
    element.innerHTML = '';
}

// clears the text in all of the dialogue elements
function clearDialogueText() {
    clearText(document.getElementById('story'));
    clearText(document.getElementById('action-output'));
    clearText(document.getElementById('choices'));
}

// types out text (can be skipped by clicking on element)
async function typeText(text, element, speed=10, variance=0, skippable=true, skipElement=null, animation='none', signal=textControllerSignal, waits=false, waitDelay=0) {
    let skipped = false;
    let skipFunction = () => {
        speed = 0;
        variance = 0;
        textController?.abort();
        textController = new AbortController();
        textControllerSignal = textController.signal;
        skipElement.addEventListener('click', hardSkipFunction, {once: true});
    }
    let hardSkipFunction = () => {
        skipped = true;
    }
    if (skippable) {
        skipElement = skipElement ?? element; // the element the user clicks on to trigger skip
        skipElement.addEventListener('click', skipFunction, {once: true});
    }
    let textLine = document.createElement('span');
    textLine.className = 'text-line';
    element.appendChild(textLine);
    let formattedElement = formatText(text);
    for (const word of formattedElement.children) {
        let wordSpan = word.cloneNode(false);
        textLine.appendChild(wordSpan)
        for (const char of word.children) {
            if (skipped || textCancelled) break;
            let newChar = char.cloneNode(true);
            newChar.classList.add(animation);
            wordSpan.appendChild(newChar);
            try {
                await cancelableSleep(speed + random(0, variance), signal);
            } catch (error) {
                let test = null;
            }
        }
    }

    skipElement.removeEventListener('click', skipFunction);
    skipElement.removeEventListener('click', hardSkipFunction);

    if (textCancelled) {
        return
    }

    if (skipped && !textCancelled) {
        textLine.innerHTML = '';
        for (const word of formattedElement.children) {
            textLine.appendChild(word.cloneNode(true));
        }
    }

    
    if (waits && waitDelay) {
        await Promise.race([awaitClick(skipElement), sleep(waitDelay)])
    } else if (waits && !waitDelay) {
        await awaitClick(skipElement);
    } else if (!waits && waitDelay) {
        await sleep(waitDelay);
    }
}

// diplays each story part to the dialogue box
async function showStory(story) {
    const dialogueBox = document.getElementById('dialogue-box');
    const storyElement = document.getElementById('story');
    for (const part of story) {
        clearText(storyElement);
        await typeText(part.text, storyElement, part.speed, part.variance, true, dialogueBox, part.animation, textControllerSignal, part.waits, part.waitDelay);
        const cleanText = parseStyles(part.text, 'This returns the clean text because nothing matches this.').text;
        let textLine = document.createElement('div');
        textLine.textContent = cleanText;
        textLine.classList.add('story-history');
        document.getElementById('history-content').appendChild(textLine);
    }
}

// returns the choices that are displayed
function getShownChoices(choices) {
    let shownChoices = []
    for (const choice of choices) {
        if (!choice.hidden && checkRequirements(choice, 'show').metRequirements) {
            shownChoices.push(choice);
        }
    }
    return shownChoices;
}

// diplays each choice to the dialogue box
async function showChoices(choices) {
    const dialogueBox = document.getElementById('dialogue-box');
    const choiceContainer = document.getElementById('choices');
    let choiceElements = [];
    let choiceTexts = [];

    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        if (choice.hidden || !checkRequirements(choice, 'show').metRequirements) continue;
        let choiceElement = document.createElement('button');
        choiceElement.className = 'choice';
        choiceElement.id = `choice-${i}`;
        choiceElement.object = choice;
        choiceContainer.appendChild(choiceElement);
        choiceElements.push(choiceElement);
        choiceTexts.push(choice.text);
        typeText(choice.text, choiceElement, choice.speed, choice.variance, true, dialogueBox, choice.animation, textControllerSignal);
    }
}

// returns weather all the requirments are met to make a choice
function checkRequirements(choice, mode='use') {
    let metRequirements = true;
    let messages = [];
    let result;
    for (const requirement of choice.requirements) {
        if (requirement.mode != mode) continue;
        if (typeof game[requirement.type] === 'function') {
            result = game[requirement.type](...requirement.parameters)
        } else if (typeof window[requirement.type] === 'function') {
            result = window?.[requirement.type](...requirement.parameters);
        }
        if (typeof result != "object") {
            result = {result};
        }
        if (requirement.inverse) {
            result.result = !result.result;
        }
        metRequirements = result.result && metRequirements;
        if (result.message) {
            messages.push(result.message)
        }
    }
    return {metRequirements, messages};
}

// cancels the writing of text in the dialogue box
async function cancelText() {
    textCancelled = true;
    textController?.abort();
    textController = new AbortController();
    textControllerSignal = textController.signal;
    await sleep(1);
    textCancelled = false;
}

// waits for user to pick a choice
async function selectChoice(choiceContainer) {
    let selectedChoice;
    for (const choiceElement of choiceContainer.children) {
        choiceElement.addEventListener('click', () => {selectedChoice = choiceElement.object})
    }
    await awaitClickList(choiceContainer.children);
    return selectedChoice;
}

// tries to run an action
async function attemptAction(action) {
    if (action.waits) {
        
        // if the function is within the game object, or is a global function
        if (typeof game[action.type] === 'function') {
            return await game[action.type](...action.parameters);
        } else  if (typeof window[action.type] === 'function') {
            return await window?.[action.type](...action.parameters);
        }
    } else {

        // if the function is within the game object, or is a global function
        if (typeof game[action.type] === 'function') {
            return game[action.type](...action.parameters);
        } else  if (typeof window[action.type] === 'function') {
            return window?.[action.type](...action.parameters);
        }
    }
}

// tries to run a list of actions or an action
async function attemptActionsWithText(actions) {
    if (Object.prototype.toString.call(actions) != '[object Array]') actions = [actions];
    for (const action of actions) {
        let actionResult = await attemptAction(action);
        if (actionResult && actionResult?.messages) {
            for (const message of actionResult.messages) {
                typeText(message, document.getElementById('action-output'));
                const cleanText = parseStyles(message, 'This returns the clean text because nothing matches this.').text;
                let textLine = document.createElement('div');
                textLine.textContent = cleanText;
                textLine.classList.add('action-history');
                document.getElementById('history-content').appendChild(textLine);
            }
        }
    }
}

// loops until a choice is selected that has all requirements met
async function tryChoices(choiceContainer) {
    let selectedChoice;
    let metReqirements = false;
    while (!metReqirements) {
        selectedChoice = await selectChoice(choiceContainer);
        await cancelText();
        clearText(document.getElementById('action-output'));
        let requirementsResult = checkRequirements(selectedChoice, 'use');
        metReqirements = requirementsResult.metRequirements;
        for (const message of requirementsResult.messages) {
            typeText(message, document.getElementById('action-output'));
            const cleanText = parseStyles(message, 'This returns the clean text because nothing matches this.').text;
            let textLine = document.createElement('div');
            textLine.textContent = cleanText;
            textLine.classList.add('action-history');
            document.getElementById('history-content').appendChild(textLine);
        }
    }
    const cleanText = parseStyles(selectedChoice.text, 'This returns the clean text because nothing matches this.').text;
    let textLine = document.createElement('div');
    textLine.textContent = cleanText;
    textLine.classList.add('choice-history');
    document.getElementById('history-content').appendChild(textLine);
    return selectedChoice;
}

// repeats every room
async function gameLoop() {
    currentRoom = rooms[startingRoom];
    const choiceContainer = document.getElementById('choices');
    while (isGameLoop) {
        let thisRoom = currentRoom;
        for (const item of currentRoom.queuelist) {
            if (item.type === 'story') {
                clearText(document.getElementById('story'));
                await showStory([item.value]);
                clearText(document.getElementById('action-output'));
            } else if (item.type === 'choicelist') {
                while (isGameLoop && getShownChoices(item.value).length > 0 && thisRoom === currentRoom) {
                    showChoices(item.value);
                    let selectedChoice = await tryChoices(choiceContainer);
                    choicesMade.push(selectedChoice);
                    clearText(document.getElementById('action-output'))
                    clearText(document.getElementById('choices'))
                    await attemptActionsWithText(selectedChoice.actions);
                }
            } else if (item.type === 'actionlist') {
                await attemptActionsWithText(item.value);
            }

            if (thisRoom != currentRoom || !isGameLoop) { break }
        }
        if (thisRoom === currentRoom) {
            await showStory([new textObject('You have hit a dead end. Please add an ending or a way to change rooms here.', {waits: true, waitDelay: 30000})]);
        }
    }
}


// initializes the event listeners in on the page
function createEventListeners() {

    // x button for center menu
    document.getElementById('menu-toggle').addEventListener('click', e => {
        document.getElementById('center-menu').classList.add('hidden');
    })

    document.querySelectorAll('#main-nav button').forEach(button => {
        const toggledElement = document.getElementById(button.id.substring(0, button.id.indexOf('-toggle')));
        const menu = document.getElementById('center-menu');
        button.addEventListener('click', ()=> {
            if (toggledElement.style.display != 'none' && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
            } else {
                menu.classList.remove('hidden');
            }
            setVisibleChild(toggledElement, document.querySelector('#center-menu .menu-content'));
        });
    })
}

// initializes the rooms and player
function init() {
    createEventListeners();
    player = new Player();
    game = new Game();
    generateAllRooms();
    generateEndings();
}

// generates all the rooms
function generateAllRooms() {
    generateExampleRooms();
    generateStartingRooms();
}

// generates the example rooms
function generateExampleRooms() {
    
    // add styles to text by doing [identifier: + any valid css color + ]
    // to reset that style, just do [identifier:]. to reset all styles, do [:]
    // EX: [c:red] = [c:#ff0000] = [c:rgb(255,0,0)]
    // EX: [fi:blur(1px)] gives the text the filter: blur(1px) style
    // current identifiers: [c: color][ff: fontFamily][fs: fontSize][rt: rotate][ts: textShadow][an: animation][fi: filter]

    let room = createRoom('Example Room', {name: 'neutralBG.jpeg'});
    room.addStory(`This is a [an:text-blur 1s ease][c:red]test[c:] story`);
    room.addStory(`This is a [an:text-glow 1s ease infinite alternate][c:red]test[c:] [fi:blur(1px)]story[fi:] [c:#00ff00][ff:'Doto'][fs:24px]continued[:]!`, {speed: 100, variance: 33, animation: 'impact'});
    room.addStory(`[ts:2px 2px 2px white][c:#c5c5c5]Lorem [rt:90deg]ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et [rt:180deg]dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure [rt:270deg]dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui [rt:]officia deserunt mollit anim id est laborum.`, {speed: 10, variance: 3, animation: 'funky'});
    let choice1 = room.createChoice('Pick up item');
    choice1.addAction({type: 'getItems', parameters: [['Example Item']]});
    room.addStory(`Woah`, {speed: 500, variance: 100, animation: 'shaky'});
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect! I like it so much, I think I will put [c:yellow][fs:24px]more[:] text!`, {speed: 100, variance: 10, animation: 'blur'});
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, {speed: 50, variance: 10, animation: 'fade-alternate'});
    room.addStory("Let's have some choices now!", {waits: false, waitDelay: 0});
    let choice2 = room.createChoice('Open door', {repeatable: true});
    choice2.addAction({type: 'changeRoom', parameters: ['Example Room 2']});
    choice2.addAction({type: 'removeItem', parameters: ['Example Expendable Key']});
    choice2.addRequirement({mode: 'use', type: 'hasItem', parameters: ['Example Reusable Key']});
    choice2.addRequirement({mode: 'use', type: 'hasItem', parameters: ['Example Expendable Key']});
    let choice3 = room.createChoice('Pick up key');
    choice3.addAction({type: 'getItems', parameters: [['Example Reusable Key'], "yoyo, you got ye an [[c:yellow]Example Reusable Key[c:]] yo! Also, this is a [an:text-glow 1s ease infinite alternate][c:cyan]custom action message!"]});
    choice3.addRequirement({mode: 'show', type: 'madeChoice', inverse: true, parameters: [room.getChoiceId(3)]});
    let choice4 = room.createChoice('Pick up another key', {repeatable: true});
    choice4.addAction({type: 'getItems', parameters: [['Example Expendable Key']]});
    choice4.addRequirement({mode: 'show', type: 'madeChoice', parameters: [room.getChoiceId(3)]});
    choice4.addRequirement({mode: 'show', type: 'hasItem', inverse: true, parameters: ['Example Expendable Key']});

    room = createRoom('Example Room 2', {name: 'saviorBG.jpeg'});
    room.addStory('You made it into room 2! [fs:32px][an:text-impact 1000ms ease-in][fw:bold][c:yellow]YAY!');
    room.addStory('This room will auto advance to the next room without any choices!');
    room.addAction({type: 'styleBG', parameters: ['[fi:grayscale(.2) blur(1px)]']});
    room.addStory('In 3...', {waitDelay: 1000, waits: false});
    room.addAction({type: 'styleBG', parameters: ['[fi:grayscale(.4) blur(4px)]']});
    room.addStory('2...', {waitDelay: 1000, waits: false});
    room.addAction({type: 'styleBG', parameters: ['[fi:grayscale(.6) blur(8px)]']});
    room.addStory('1...', {waitDelay: 1000, waits: false});
    room.addAction({type: 'changeRoom', parameters: ['Example Room 3']});
    room.addAction({type: 'changeBG', parameters: ['escapeBG.jpeg', {waitsOut: true}]});
    
    room = createRoom('Example Room 3', {transition: {out: '', in: ''}});
    room.addStory('Yay! You are now in room 3!', {waitDelay: 500, waits: false});
    choice1 = room.createChoice('[c:green]Restart', {repeatable: true});
    choice1.addAction({type: 'changeRoom', parameters: ['Example Room']});
}

function generateStartingRooms() {
    let room = createRoom('b-start', {name: 'escapeBG.jpeg'}); // beginning-1
    room.addStory(`Danger is imminent. You, among two others, were the only ones smart enough to take precautions. Now, you stand before your cryopod, ready to bid your conciousness farewell.`);
    room.addStory(`Step into the pod?`, {waits: false});
    let choice1 = room.createChoice("Enter.");
    choice1.addAction({type: 'changeRoom', parameters: ['b-3-hallways']});
    let choice2 = room.createChoice("Chicken out.");
    choice2.addAction({type: 'ending', parameters: ['stayed behind']});
    
    room = createRoom('b-3-hallways', {transition: {out: '', in: ''}}); // beginning-2
    room.addAction({type: 'styleBG', parameters: ['[an:blur-out 5s ease-out,fade-out 5s ease-out][fi:blur(16px)][op:0]']});
    room.addStory(`And so you let yourself fade away, no longer within the world...`, {waits: false, waitDelay: 2000, speed: 70, animation: 'blur'});
    room.addAction({type: 'styleBG', parameters: ['[an:blur-in 2s ease-out,fade-in 2s ease-out][fi:][op:]']});
    room.addAction({type: 'changeBG', parameters: ['neutralBG.jpeg', {out: '', in: ''}]});
    room.addStory(`...until [fw:bold][an:text-glow 1s ease infinite alternate][c: red]now.`, {speed: 100, waits: false, waitDelay: 1000});
    room.addStory(`Your hearing is the first of your senses to return. Alarms blare in your ears, followed by the whoosh of air and a soft click.`);
    room.addStory(`Next comes your sight. Once the steam clears, the cryopod door creaks open to the now run-down lab. Red lights are flashing through the room, presumably the whole building as well.`);
    room.addStory(`Stepping out of the pod, it appears that yours was the only one to be well-maintained. The other two pods are rusty and broken, with the glass shattered and labels long faded.`);
    room.addStory(`In fact, you can barely make out your own name on the scratchy, old label.`);
    room.addStory(`[c:rgb(0, 60, 255)]"Gali."`, {waits: false, waitDelay: 1500, speed: 50});

}

function generateEndings() {
    let ending = createEnding('stayed behind', {name: 'destructionBG.jpeg', transition: {out: '[an:fade-out .5s ease-out][op:0]', in: '[an:fade-in .3s ease-out][fi:grayscale(.6)][sc: 1.5]', waitsOut: true, waitsIn: true}});
    ending.addAction({type: 'styleBG', parameters: ['[an:shrink 30s ease-out][fi:grayscale(.6)]']});
    ending.addStory('[c:#bf1b1b][an:text-shiver .25s ease-in-out infinite alternate]Your loss,[:] I guess.');
    ending.addStory(`You didn't live long enough to tell the story.`, {waits: false});
    let restartChoice = ending.createChoice('Restart');
    restartChoice.addAction({type: 'restart'})
}


window.addEventListener('DOMContentLoaded', () => {
    init();
    gameLoop();
})

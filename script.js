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
let startingRoom = 'b-start';

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

    // initiates an ending
    async ending(endType) {
        isGameLoop = false;
        currentEnding = endings[endType];
        clearDialogueText();
        await showStory(currentEnding.storyParts);
        showChoices(currentEnding.choices);
        await tryChoices(document.getElementById('choices'))
        for (const choice of currentEnding.choices) {
            for (const action of choice.actions) {
                attemptAction(action);
            }
        }
        await sleep(10);
    }

    restart() {
        player = new Player();
        currentRoom = startingRoom;
        isGameLoop = true;
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
        transferProperties(this.options, this)
    }
}

class Choice extends textObject {
    constructor(text, options={}, hidden=false, speed=4, variance=1, animation='default', skippable=true) {
        super(text, options, speed, variance, animation, skippable, true, 0);
        this.hidden = hidden;
        this.actions = [];
        this.requirements = [];
    }

    addAction(options, type, parameters) {
        type = options.type ?? type;
        parameters = options.parameters ?? parameters ?? [];
        this.actions.push({type, parameters})
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
    constructor(name) {
        this.name = name;
        this.choices = [];
        this.storyParts = []; // gets displayed when entering a room
    }

    // adds a choice to the room
    addChoice(choice) {
        this.choices.push(choice);
        choice.id = this.getChoiceId(this.choices.length)
    }

    // returns the id of a choice given the choice number
    getChoiceId(choiceNumber) {
        return `${this.name}-${choiceNumber}`;
    }

    // adds a story line to the room
    addStory(text, options, speed=20, variance=5, animation='default', waits=true, waitDelay=0, skippable=true) {
        this.storyParts.push(new textObject(text, options, speed, variance, animation, skippable, waits, waitDelay));
    }
}

class Ending extends Room {
    constructor(name) {
        super(name);
        let choice = new Choice('restart');
        choice.addAction({type: 'restart'})
        this.addChoice(choice);
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
    if (skipped && !textCancelled) {
        textLine.innerHTML = '';
        for (const word of formattedElement.children) {
            textLine.appendChild(word.cloneNode(true));
        }
    }

    if (waits && !textCancelled) {
        await awaitClick(skipElement)
    } else if (!textCancelled) {
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
    }
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
function attemptAction(action) {
    // if the function is within the game object, or is a global function
    if (typeof game[action.type] === 'function') {
        return game[action.type](...action.parameters);
    } else  if (typeof window[action.type] === 'function') {
        return window?.[action.type](...action.parameters);
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
        }
    }
    return selectedChoice;
}

// repeats every room
async function gameLoop() {
    currentRoom = rooms[startingRoom];
    while (isGameLoop) {
        let thisRoom = currentRoom;
        clearDialogueText();
        await showStory(currentRoom.storyParts);
        while (isGameLoop && thisRoom === currentRoom) {
            showChoices(currentRoom.choices);
            const choiceContainer = document.getElementById('choices');
            let selectedChoice = await tryChoices(choiceContainer);
            choicesMade.push(selectedChoice);
            clearDialogueText();
            for (const action of selectedChoice.actions) {
                let actionResult = attemptAction(action);
                if (actionResult && actionResult?.messages) {
                    for (const message of actionResult.messages) {
                        typeText(message, document.getElementById('action-output'));
                    }
                }
            }
        }
    }
}


//initializes the event listeners in on the page
function createEventListeners() {
    
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
    let room = new Room('Example Room');

    // add styles to text by doing [identifier: + any valid css color + ]
    // to reset that style, just do [identifier:]. to reset all styles, do [:]
    // EX: [c:red] = [c:#ff0000] = [c:rgb(255,0,0)]
    // EX: [fi:blur(1px)] gives the text the filter: blur(1px) style
    // current identifiers: [c: color][ff: fontFamily][fs: fontSize][rt: rotate][ts: textShadow][an: animation][fi: filter]
    room.addStory(`This is a [an:text-blur 1s ease][c:red]test[c:] story`);
    room.addStory(`This is a [an:text-glow 1s ease infinite alternate][c:red]test[c:] [fi:blur(1px)]story[fi:] [c:#00ff00][ff:'Doto'][fs:24px]continued[:]!`, {speed: 100, variance: 33, animation: 'impact'});
    room.addStory(`[ts:2px 2px 2px white][c:#c5c5c5]Lorem [rt:90deg]ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et [rt:180deg]dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure [rt:270deg]dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui [rt:]officia deserunt mollit anim id est laborum.`, {speed: 10, variance: 3, animation: 'funky'});
    room.addStory(`Woah`, {speed: 500, variance: 100, animation: 'shaky'});
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect! I like it so much, I think I will put [c:yellow][fs:24px]more[:] text!`, {speed: 100, variance: 10, animation: 'blur'});
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(59, 107, 77)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, {speed: 50, variance: 10, animation: 'fade-alternate'});
    room.addStory("Let's have some choices now!", {waits: false, waitDelay: 0});
    let choice1 = new Choice('Open door');
    choice1.addAction({type: 'changeRoom', parameters: ['Example Room 2']});
    choice1.addAction({type: 'removeItem', parameters: ['Example Expendable Key']});
    choice1.addRequirement({mode: 'use', type: 'hasItem', parameters: ['Example Reusable Key']});
    choice1.addRequirement({mode: 'use', type: 'hasItem', parameters: ['Example Expendable Key']});
    room.addChoice(choice1);
    let choice2 = new Choice('Pick up key');
    choice2.addAction({type: 'getItems', parameters: [['Example Reusable Key'], "yoyo, you got ye an [[c:yellow]Example Reusable Key[c:]] yo! Also, this is a [an:text-glow 1s ease infinite alternate][c:cyan]custom action message!"]});
    choice2.addRequirement({mode: 'show', type: 'madeChoice', inverse: true, parameters: [room.getChoiceId(2)]});
    room.addChoice(choice2);
    let choice3 = new Choice('Pick up another key');
    choice3.addAction({type: 'getItems', parameters: [['Example Expendable Key']]});
    choice3.addRequirement({mode: 'show', type: 'madeChoice', parameters: [room.getChoiceId(2)]});
    choice3.addRequirement({mode: 'show', type: 'hasItem', inverse: true, parameters: ['Example Expendable Key']});
    room.addChoice(choice3);
    rooms[room.name] = room;

    room = new Room('Example Room 2');
    room.addStory('You made it into room 2! [fs:32px][an:text-impact 1000ms ease-in][fw:bold][c:yellow]YAY!', {waitDelay: 0, waits: false})
    choice1 = new Choice('[c:green]Go back');
    choice1.addAction({type: 'changeRoom', parameters: ['Example Room']});
    room.addChoice(choice1);
    rooms[room.name] = room;
}

function generateStartingRooms() {
    let room = new Room('b-start'); // beginning-1
    room.addStory(`Danger is imminent. You, among two others, were the only ones smart enough to take precautions. Now, you stand before your cryopod, ready to bid your conciousness farewell.`);
    room.addStory(`Step into the pod?`, {waits: false});
    let choice1 = new Choice("Enter.");
    choice1.addAction({type: 'changeRoom', parameters: ['b-3-hallways']});
    room.addChoice(choice1);
    let choice2 = new Choice("Chicken out.");
    choice2.addAction({type: 'ending', parameters: ['stayed behind']});
    room.addChoice(choice2);
    rooms[room.name] = room;

    room = new Room('b-3-hallways'); // beginning-2
    room.addStory(`And so you let yourself fade away, no longer within the world...`, {waits: false, waitDelay: 3000, speed: 70, animation: 'blur'});
    room.addStory(`...until [fs:98px][ff:Rubik Glitch][an:text-glow 1s ease infinite alternate][c: red]now.`, {speed: 100, waits: false, waitDelay: 3500});
    room.addStory(`Your hearing is the first of your senses to return. Alarms blare in your ears, followed by the whoosh of air and a soft click.`);
    room.addStory(`Next comes your sight. Once the steam clears, the cryopod door creaks open to the now run-down lab. Red lights are flashing through the room, presumably the whole building as well.`);
    room.addStory(`Stepping out of the pod, it appears that yours was the only one to be well-maintained. The other two pods are rusty and broken, with the glass shattered and labels long faded.`);
    room.addStory(`In fact, you can barely make out your own name on the scratchy, old label.`);
    room.addStory(`[c:#0330fc]"Gali."`, {waits: false, waitDelay: 3500, speed: 50});

    rooms[room.name] = room;
}

function generateEndings() {
    endings = {};
    let ending = new Ending('stayed behind');
    ending.addStory('[c:#bf1b1b][an:text-shiver .25s ease-in-out infinite alternate]Your loss,[:] I guess.');
    ending.addStory(`You didn't live long enough to tell the story.`, {waits: false});
    endings[ending.name] = ending;
}


window.addEventListener('DOMContentLoaded', () => {
    init();
    gameLoop();
})

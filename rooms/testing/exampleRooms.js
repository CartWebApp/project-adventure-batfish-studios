import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
// add styles to text by doing [identifier: + any valid css color + ]
// to reset that style, just do [identifier:]. to reset all styles, do [:]
// EX: [c:red] = [c:#ff0000] = [c:rgb(255,0,0)]
// EX: [fi:blur(1px)] gives the text the filter: blur(1px) style
// current identifiers: [c: color][ff: fontFamily][fs: fontSize][rt: rotate][ts: textShadow][an: animation][fi: filter][class: class][fst: fontStyle]

    let room = createRoom('Example Hub', { name: 'neutral.jpeg' });
    room.createChoice('Teleporter')
        .addAction({type: 'changeRoom', parameters: ['Example Teleporter Hub']});
    room.createChoice('Example Rooms')
        .addAction({type: 'changeRoom', parameters: ['Example Room']});
    room.createChoice('Particle Testing')
        .addAction({type: 'changeRoom', parameters: ['Example Room Particles']});
    room.createChoice('Battle Testing')
        .addAction({type: 'changeRoom', parameters: ['Example Battle Hub']});
    room.createChoice('Grid Testing')
        .addAction({type: 'changeRoom', parameters: ['Example Grid Hub']});
    room.createChoice('Items')
        .addAction({type: 'changeRoom', parameters: ['Example Room Items']});
    room.createChoice('Audio')
        .addAction({type: 'changeRoom', parameters: ['Example Room Audio']});

    // teleporter hub
    room = createRoom('Example Teleporter Hub')
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Main Story')
        .addAction({type: ()=> {
            game.startingRoom = 'b-start';
            game.restart();
        }});
    room.createChoice('Escape Wasteland')
        .addAction({type: ()=> {
            game.startingRoom = 'e-wasteland-start';
            game.restart();
        }});
        room.createChoice('Escape Wasteland-after')
        .addAction({type: ()=> {
            game.startingRoom = 'e-finalTask';
            game.restart();
        }});

    room = createRoom('Example Room Items');
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Get item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem({name: randomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 12)})
        }, parameters: []});
    room.createChoice('Get long item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem({name: randomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 400)})
        }, parameters: []});
        room.createChoice('Get long item + spaces', {persistant: true})
        .addAction({type: ()=> {
            game.getItem({name: randomString('     abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 400)})
        }, parameters: []});
    room.createChoice('Get many item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem({name: randomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ', 12), min: 10e100})
        }, parameters: []});
    room.createChoice('Get wacky item', {persistant: true})
        .addAction({type: ()=> {
            game.getItem({name: randomString(' 1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFVXYZ~!@#$%^&*()_+=-[]}{\\|";:/?.>,<~', 50), min: 1})
        }, parameters: []});
    

    room = createRoom('Example Room', { name: 'neutral.jpeg' });
    room.addStory(`This is a [an:text-blur 1s ease][c:red]test[c:] story`);
    room.addStory(`This is a [an:text-glow 1s ease infinite alternate][c:red]test[c:] [fi:blur(1px)]story[fi:] [c:#00ff00][ff:'Doto'][fs:24px]continued[:]!`, { speed: 100, variance: 33, animation: 'impact' });
    room.addStory(`[ts:2px 2px 2px white][c:#c5c5c5]Lorem [rt:90deg]ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et [rt:180deg]dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure [rt:270deg]dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui [rt:]officia deserunt mollit anim id est laborum.`, { speed: 10, variance: 3, animation: 'funky' });
    let choice1 = room.createChoice('Pick up item', {maxUses: 1} );
    choice1.addAction({ type: 'getItem', parameters: [{name: 'Example Item', min: 1, max: 10}]});
    room.addStory(`This text only shows if you got at least 8 Example Items!`)
        .addRequirement({ mode: 'show', type: 'hasItem', parameters: ['Example Item', 8] });
    room.addStory(`Woah`, { speed: 500, variance: 100, animation: 'shaky' });
    room.addStory(`[c:rgb(0,255,255)]Cooleo![c:] This is a neat blur effect! I like it so much, I think I will put [c:yellow][fs:24px]more[:] text!`, { speed: 100, variance: 10, animation: 'blur' });
    room.addStory(`Or maybe try [c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]l[c:rgb(136, 255, 0)]t[c:rgb(0, 255, 98)]e[c:rgb(136, 255, 0)]r[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]a[c:rgb(0, 255, 98)]t[c:rgb(136, 255, 0)]i[c:rgb(0, 255, 98)]n[c:rgb(136, 255, 0)]g[c:] text? This can do that too! Lets see how this looks like when it's long: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`, { speed: 50, variance: 10, animation: 'fade-alternate' });
    room.addStory("Let's have some choices now!", { waits: false, waitDelay: 0 });
    let choice2 = room.createChoice('Open door');
    choice2.addAction({ type: 'changeRoom', parameters: ['Example Room 2'] });
    choice2.addAction({ type: 'removeItem', parameters: ['Example Expendable Key'] });
    choice2.addRequirement({ mode: 'use', type: 'hasItem', parameters: ['Example Reusable Key'] });
    choice2.addRequirement({ mode: 'use', type: 'hasItem', parameters: ['Example Expendable Key'] });
    let choice3 = room.createChoice('Pick up key', {maxUses: 1});
    choice3.addAction({ type: 'getItem', parameters: [{name: 'Example Reusable Key', min: 1, max: 1, style: '[class:text-glow green]', desc: "yoyo, you got ye an [[class:text-glow green]Example Reusable Key[class:]] yo! Also, this is a [an:text-glow 1s ease infinite alternate][c:cyan]custom action message!"}] });
    choice3.addRequirement({ mode: 'show', type: 'madeChoice', inverse: true, parameters: [choice3.id] });
    let choice4 = room.createChoice('Pick up another key');
    choice4.addAction({ type: 'getItem', parameters: [{name: 'Example Expendable Key'}] });
    choice4.addRequirement({ mode: 'show', type: 'madeChoice', parameters: [choice3.id] });
    choice4.addRequirement({ mode: 'show', type: 'hasItem', inverse: true, parameters: ['Example Expendable Key'] });
    // choice5, with different syntax (not using a variable)
    room.createChoice('Touch spike', { maxUses: 1 })
        .addAction({ type: 'writeText', parameters: ['[c:yellow]Why did you touch that?', {elementID: 'action-output', waits: false}] })
        .addAction({ type: 'changeHP', parameters: [{min:-10, max:-5}] })
        .addAction({ type: 'changeMaxHP', parameters: [-1, -3] });
    room.createChoice('Look at squeegee')
        .addAction({ type: 'changeHP', parameters: [{min:-10, cause:'squeegee'}] })
        .addAction({ type: 'writeText', parameters: ['I have no way to explain this', {elementID: 'story', clearsText: true}] });

    room = createRoom('Example Room 2', { name: 'savior.jpeg' });
    room.addStory('You made it into room 2! [fs:32px][an:text-impact 1000ms ease-in][fw:bold][c:yellow]YAY!');
    room.addStory('This room will auto advance to the next room without any choices!');
    room.addAction({ type: 'styleBG', parameters: ['[fi:grayscale(.2) blur(1px)]'] });
    room.addStory('In 3...', { waitDelay: 1000, waits: false });
    room.addAction({ type: 'styleBG', parameters: ['[fi:grayscale(.4) blur(4px)]'] });
    room.addStory('2...', { waitDelay: 1000, waits: false });
    room.addAction({ type: 'styleBG', parameters: ['[fi:grayscale(.6) blur(8px)]'] });
    room.addStory('1...', { waitDelay: 1000, waits: false });
    room.addAction({ type: 'changeBG', parameters: ['escape.jpeg', { waitsOut: true }] });
    room.addStory('El fin');
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    

    // particle testing
    room = createRoom('Example Room Particles', { name: 'neutral.jpeg' });
    room.addAction({type: 'changeParticleAnimation', parameters: ['fog', 1, 1]});
    room.addStory('Lets try out some particles!', {waits: false});
    room.createChoice('Speed Up', {persistant: true})
    .addAction({type: 'changeParticleSpeed', parameters: [.5]})
    room.createChoice('Slow Down', {persistant: true})
    .addAction({type: 'changeParticleSpeed', parameters: [-.5]});
    room.createChoice('Strengthen', {persistant: true})
    .addAction({type: 'changeParticleStrength', parameters: [.5]});
    room.createChoice('Weaken', {persistant: true})
    .addAction({type: 'changeParticleStrength', parameters: [-.5]});
    let fog = room.createChoice('Fog', {persistant: true})
    fog.addAction({type: 'changeParticleAnimation', parameters: ['fog', 1, 1]});
    let ashes = room.createChoice('Ashes', {persistant: true})
    ashes.addAction({type: 'changeParticleAnimation', parameters: ['ashes', 1, 1]});
    let smoke = room.createChoice('Smoke', {persistant: true})
    smoke.addAction({type: 'changeParticleAnimation', parameters: ['smoke top', 1, 1]});
    // smoke.addRequirement({ mode: 'show', type: 'madeChoice', parameters: [ashes.id] })
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']})
        .addAction({type: 'changeParticleAnimation', parameters: ['none', 1, 1]})
        .addAction({type: 'changeBG', parameters: ['transparent.png', {}, 'background-image-2']})
        .addRequirement({ mode: 'show', type: 'madeChoice', parameters: [smoke.id] })


    // battle testing
    room = createRoom('Example Battle Hub');
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Enemy Test')
        .addAction({type: 'changeRoom', parameters: ['Example Battle 1']});
    room.createChoice('Team Test')
        .addAction({type: 'changeRoom', parameters: ['Example Battle 2']});
    room.createChoice('Random Encounter Test')
        .addAction({type: 'changeRoom', parameters: ['Example Battle 3']});

    // battle 1
    room = createRoom('Example Battle 1', { name: 'neutral.jpeg' });
    room.addAction({ type: 'getItem', parameters: [{name: 'Lume Fruit', min: 2, max: 3}], waits: true});
    room.addAction({type: 'encounter', parameters: [{
        enemyPool: [
            {id: 'Example Enemy', overrides: {name: 'JOJO'}},
            {id: 'ThisNameDoesNotMatterAsLongAsItsAPropertyNameInItemData'}
        ],
        rewardPool: [
            {name: 'Example Reward', min: 1, max: 5},
            {name: 'Example Reward 2', min: 1, max: 5},
            {name: 'missingNo', min: 1, max: 1}
        ], 
        groupName: 'a couple of example enemies'
    }],
    waits: true, chance: 100})
    room.addAction({type: 'encounter', parameters: [{
        enemyPool:[
            new Enemy({name: 'Weak Enemy', hp: 10, strength: 2, agility: 2}),
            new Enemy({name: 'OP Enemy', hp: 200, strength: 100, agility: 100, desc: `You [fst:italic]really[:] don't want to mess with this guy`}),
            new Enemy({name: 'Enemy 3', hp: 5, strength: 1, agility: 1}),
            new Enemy({name: 'Enemy 4', hp: 5, strength: 1, agility: 4}),
            new Enemy({name: 'Enemy 5', hp: 5, strength: 1, agility: 10}),
        ], 
        rewardPool: [
            {name: 'Wacky Thing', min: 1, max: 1},
            {name: 'Super Syrum', min: 1, max: 1}
        ],
        groupName: 'The Wacky Gang'
    }], waits: true})
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});

    // battle 2
    room = createRoom('Example Battle 2');
    room.addAction({type: 'encounter', parameters: [{
        id: 'ExampleTeam1'
    }], waits: true})

    // grid testing
    room = createRoom('Example Grid Hub');
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Grid 1 x 6')
        .addAction({type: 'changeRoom', parameters: ['example-grid-1-start']});
    room.createChoice('Grid 20 x 20')
        .addAction({type: 'changeRoom', parameters: ['example-grid-2-start']});

    let grid = new RoomGrid({name: 'example-grid-1', width: 1, height: 6, showCoordinates: true})
    room = grid.generateRoom([0, 2]);
    room.addStory('This story should show twice.', {maxUses: 2})
    grid.generateGrid();

    grid = new RoomGrid({name: 'example-grid-2', width: 20, height: 20, showCoordinates: true, entrance: [10, 10], directionMessages: {east: 'Move East', north: 'Head North', west: 'Shimmy West'}})
    grid.setDefaultRoom(new Room('', {name: 'neutral.jpeg'}))
    grid.addQueuelist('start', createQueuelist([
        new StoryObject(`This text should have a 5% chance of appearing at the start of any room`),
    ]), [
        new Requirement({mode: 'show', type: 'chanceRoll', parameters: [5]})
    ])
    grid.addQueuelist('end', createQueuelist([
        new StoryObject(`This text should have a 10% chance of at the end of any room`),
    ]), [
        new Requirement({mode: 'show', type: 'chanceRoll', parameters: [10]})
    ])
    room = grid.generateRoom(null, {name: 'transparent.png'}, 50);
    room.addStory('This room instance was randomly placed');
    room = grid.generateRoom([0,0], {name: 'savior.jpeg'});
    room.addStory('You found the exit!', {waits: false});
    room.createChoice('Return to hub', {classList: ['rainbow-overlay'], color: 'yellow'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Stay')
        .addAction({type: 'leaveChoice', parameters: []});
    grid.generateGrid();

    // audio testing
    room = createRoom('Example Room Audio');
    room.createChoice('Back', {color: '[c:var(--back-color)]'})
        .addAction({type: 'changeRoom', parameters: ['Example Hub']});
    room.createChoice('Play Battle Music', {persistant: true})
        .addAction({type: 'changeSong', parameters: ['battle_stereo']});
    room.createChoice('Play Exploring Music', {persistant: true})
        .addAction({type: 'changeSong', parameters: ['explore_stereo']});
    room.createChoice('Play Main Music', {persistant: true})
        .addAction({type: 'changeSong', parameters: ['main_stereo']});
    room.createChoice('Low Pitch', {persistant: true})
        .addAction({type: 'changeSongPitch', parameters: [.5, 400], skipsWait: true});
    room.createChoice('Normal Pitch', {persistant: true})
        .addAction({type: 'changeSongPitch', parameters: [1, 400], skipsWait: true});
    room.createChoice('High Pitch', {persistant: true})
        .addAction({type: 'changeSongPitch', parameters: [2, 400], skipsWait: true});
}
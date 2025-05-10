
import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement, Choice, Action } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
    let room = createRoom(`s-start`, {name: 'savior.jpeg'});
    room.addStory(`The world isn't meant for saving at the moment. [c:var(--actions)][fst:italic](If only there were someplace to read up on what would happen if it was...)`);
    let choice1 = room.createChoice("Go back.");
    choice1.addAction({ type: 'changeRoom', parameters: ['b-return'] });
    // room.addAction({type: 'changeParticleAnimation', parameters: ['smoke top', 2, 2]});
    // room.addStory(`Heading [c:var(--savior)]straight, [c:]the memories start flooding right back to you. The buzz of the fluorescent lights overhead, .`);

}
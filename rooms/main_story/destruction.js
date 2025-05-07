
import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement, Choice, Action } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
    let room = createRoom(`d-start`, {name: 'destruction.jpeg'});
    room.addStory(`Heading to the [c:var(--destruction)]right, [c:]you can hear the chants of several people. Perhaps you aren't that alone after all.`);
    room.addStory(`It's quite uniform, too. Rhythmic thuds echo through the building, a single light shining through a doorway at the end of the hall.`);
    room.addStory(`Approaching the door, you peek in to see a large, inter-species group of survivors, all donning dark masks, cloaks, hoods, and hats. There's a line of them running out of the broken window, hauling out looted supplies and equipment one by one.`);
    room.addStory(`Most, if not all of them are armed to the teeth, and they all seem to be in a trance, chanting in unison as they work.`);
    room.addStory(`Among them, [c:var(--character)]one [c:]appears to have much more authority than the others.`);
    room.addStory(`[c:var(--character)]A large, hulking figure [c:]with a massive shotgun strapped to their back, and a pair of glowing red eyes that seem to pierce through the darkness.`);
    room.addStory(`Their exoskeleton is visibly cracked, paired with four large, leathery wings. You can see the figure is wearing a mask with a different insignia than the rest, but you can't make out any of their features.`);
    let choice1 = room.createChoice(`Approach the group.`);
    choice1.addAction({type: 'changeRoom', parameters: ['d-looting']});
    let choice2 = room.createChoice(`Get out of there.`);
    choice2.addAction({type: 'changeRoom', parameters: ['b-return']});

    room = createRoom(`d-looting`, {name: 'destruction.jpeg'}); 
    room.addStory(`You step into the room, immediately alerting the others to your presence.`); 
    room.addStory(`The group stops chanting instantly. They all turn to you, their eyes glowing red as they stare you down.`);
    room.addStory(`[c:var(-character)]The largest of them all steps forward, towering over you. All four [fst:italic][c:var(--destruction)](four!?) [c:][fst:]of the guns strapped to their body clank against them as they move.`);
    room.addStory(`The only sounds among you are your own heavy breathing and the light buzz of the beast's wings.`);
    choice1 = room.createChoice(`Explain yourself.`);
    choice1.addAction({type: 'changeRoom', parameters: ['d-explain']});
    choice2 = room.createChoice(`Refuse to be intimidated by this riff-raff.`);
    choice2.addAction({type: 'changeRoom', parameters: ['d-fight']});
    choice2.addAction({type: 'addEnemy', parameters: [new Enemy('demon', 'Demon', 100, 100, 0, 0, 0, 0, 0, 0, 0)]});

}
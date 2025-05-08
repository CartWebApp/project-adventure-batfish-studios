
import {game, createRoom, RoomGrid, Room, createQueuelist, StoryObject, Requirement, Choice, Action } from '../../scripts/GameLogic.js';
import { Enemy } from '../../scripts/Enemies.js';
export let roomGenerators = [generate];

function generate() {
    let room = createRoom(`d-start`, {name: 'destruction.jpeg'});
    room.addAction({type: 'changeBG', parameters: ['transparent.png', {}, 'background-image-2']})
    room.addAction({type: 'styleBG', parameters: ['', 'background-image-2']});
    room.addAction({type: 'changeParticleAnimation', parameters: ['none']});
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
    let choice3 = room.createChoice(`Get out of here NOW.`);
    choice3.addAction({type: 'changeRoom', parameters: ['b-return']});

    room = createRoom(`d-explain`, {name: 'destruction.jpeg'});
    room.addStory(`Relieved to see other survivors, you start to rant and rave about how you'd just woke up all alone in a strange place, and how you weren't sure if anyone was left on the planet.`);
    room.addStory(`You continue on with your rambling, frantically over-explaining your situation as the group stares at you blankly.`);
    room.addStory(`[c:var(--character)]The hulking figure [c:]seems to be the only one who is actually listening to you, and they nod along as you speak.`);
    room.addStory(`Just as you gasp for a breath, they raise a hand to silence you.`);
    room.addStory(`[c:var(--dialogue)][fs:30px]"Enough."`, {speed: 250, waits: false, waitDelay: 3000});
    room.addStory(`[c:var(--character)]The figure [c:]speaks in a deep, gravelly voice, their words booming in your ears.`);
    room.addStory(`...which immediately melts away as they pull their mask down, revealing chittering mandibles and a pair of large, black orbs for eyes.`);
    room.addStory(`[c:var(--dialogue)]"...You the feller thet wuz all up in'net freezer pod?"`);
    room.addStory(`You nod, and the figure seems to relax slightly, chuckling to themself.`);
    room.addStory(`[c:var(--dialogue)]"Wull, ain't thet a sight 'ta behold! The one time I skedaddle right awn 'ome, 'n lookit thet!"`);
    room.addStory(`[c:var(--dialogue)]"I wuz all chilled up in thet pod on'na [c:var(--destruction)]right, [c:var(--dialogue)]'n I reckon you's wuz in wunna'em too. Ain't no one else 'round here, 'cept fer me 'n muh crew."`);
    room.addStory(`The creature offers one of six hands to you, grabbing yours before you can react.`);
    room.addStory(`[c:var(--dialogue)]"Name's [c:var(--character)]Palmetto.[c:var(--dialogue)]"`);
    room.addStory(`[c:var(--actions)][fst:italic]You and [c:var(--character)]Palmetto [c:var(--actions)]are now acquainted.`)
    room.addStory(`[c:var(--character)]Palmetto[c:var(--dialogue)] gestures to the group, who are still staring at you blankly.`);
    room.addStory(`[c:var(--character)]"We's all a bit...with 'er own cautions 'n such, but we's ain't hostile. Ain't no reason 'ta be."`);
    room.addStory(`[c:var(--character)]"Us'n just tryin' 'ta make it through this mess, same's you."`);
    room.addStory(`He gives you his best approximation of a smile, and you can't help but feel a little more at ease.`);
    room.addStory(`[c:var(--dialogue)]"Real shame 'ya had 'ta wake up in'na middle'a all the mess, though."`);
    room.addStory(`[c:var(--dialogue)]"Y'know, I wuz there thet day. Woke up inna pod, came crawlin' out widd'et other gal, 'n we's wuz waitin' on ya 'ta pop out too."`);
    room.addStory(`[c:var(--dialogue)]"'N then. y'know..."`);
    room.addStory(`[c:var(--dialogue)]"'Ya didn't."`);
    room.addStory(`Sensing your discomfort, [c:var(--character)]Palmetto[c:] quickly changes the subject.`);
    room.addStory(`[c:var(--dialogue)]"Ah, well, ain't no use dwellin' on the past. We's all here now, ain't we?"`);
    room.addStory(`[c:var(--dialogue)]"Wut's 'nuther few years, anyways?"`);
    choice1 = room.createChoice(`Define "A few" years.`);
}
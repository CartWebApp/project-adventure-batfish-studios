
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
    room.addStory(`[c:var(--character)]Palmetto[c:] gestures to the group outside.`);
    room.addStory(`[c:var(--dialogue)]"We's all a bit...with 'er own cautions 'n such, but we's ain't hostile. Ain't no reason 'ta be."`);
    room.addStory(`[c:var(--dialogue)]"Us'n just tryin' 'ta make it through this mess, same's you, uh..."`);
    room.addStory(`[c:var(--Gali)]Gali, [c:]you state.`);
    room.addStory(`He gives you his best approximation of a smile at that, and you can't help but feel a little more at ease.`);
    room.addStory(`[c:var(--dialogue)]"Real shame 'ya had 'ta wake up in'na middle'a all the mess, though."`);
    room.addStory(`[c:var(--dialogue)]"Y'know, I wuz there thet day. Woke up inna pod, came crawlin' out widd'et other gal, 'n we's wuz waitin' on ya 'ta pop out too."`);
    room.addStory(`[c:var(--dialogue)]"'N then. y'know..."`);
    room.addStory(`[c:var(--dialogue)]"'Ya didn't."`);
    room.addStory(`Sensing your discomfort, [c:var(--character)]Palmetto[c:] quickly changes the subject.`);
    room.addStory(`[c:var(--dialogue)]"Ah, well, ain't no use dwellin' on the past. We's all here now, ain't we?"`);
    room.addStory(`[c:var(--dialogue)]"Wut's 'nuther few years, anyways?"`);
    choice1 = room.createChoice(`Define "A few" years.`);
    room.addStory(`You hear [c:var(--character)]Palmetto [c:] quietly hiss, wings fluttering behind him.`)
    room.addStory(`[c:var(--dialogue)]"Wull, it ain't [fst:italic]thet [fst:]bad!"`);
    room.addStory(`He lands a hearty pat on your back.`);
    room.addStory(`[fw:bold][fs:30px][c:var(--dialogue)][an:text-shiver .65s ease-in-out infinite alternate]"Fifteen years [fw:][an:]ain't got nuthin' awn ya!"`, {speed: 65});
    room.addStory(`His mandibles chitter with delight as he throws an arm around you, giving you no time to let that settle in.`);
    room.addStory(`[c:var(--dialogue)]"The 'port'n thing now's thet'churr outta there. [c:var(--Gali)]Project Permafrost[c:var(--dialogue)] ain't no more!"`);
    room.addStory(`With that, Palmetto drags you to the window, boosting you up as you hop out of it.`);
    // room.addAction({type: ""});
    room.addAction({type: 'changeRoom', parameters: ['d-outside']})
    
    room = createRoom('d-outside', {name: 'destruction.jpeg'});
    room.addAction({type: 'changeParticleAnimation', parameters: ['ashes', 2, 2]});
    room.addStory(`You look to the crowd of bandits as you start walking up to them. They're currently in the middle of carrying the looted pile over to a caravan of giant, dusty, rodent-like creatures. Upon tapping their heads, they open their mouths, allowing the crew to start shoving all sorts of supplies into the critters' cheeks. [c:var(--actions)][fst:italic][fs:15px](Eww...)`);
    room.addStory(`They all turn to face you two immediately. In the distance, a stray survivor is running off into the distance, dragging one foot behind them.`);
    room.addStory(`[c:var(--character)]Palmetto [c:]grunts, his mandibles clicking quietly.`);
    room.addStory(`[c:var(--dialogue)]"We git pests r'awn here all'a time. Dun' worruh 'bout it, pal. We gotcha covered."`);
    room.addStory(`Wallking up to the biggest of the fuzzy creatures, a blonde furred fella with beads in its braids, [c:var(--character)]Palmetto [c:]scritches its chin. In return, it politely spits out a big 'ol hunk of rusty metal and bolts in front of you two.`);
    room.addStory(`His fist clangs against the top of it rather loudly. He grins(?), pushing it across the dirt until it lands at your feet.`);
    room.addStory(`Wiping the dust off of it, you find that it appears to be a small, round ball with a screen on it. It has two little arms and legs, and a tiny little face that looks like it's made out of pixels.`);
    room.addStory(`It chirps for a moment, rattling loudly before its head whirrs to look at you.`);
    room.addStory(`[c:var(--dialogue)]"XCFU-2B?`);
    room.addStory(`Before you can keep gawking at the sight, [c:var(--character)]Palmetto[c:] snaps his fingers in your face to grab your attention back.`);
    room.addStory(`[c:var(--dialogue)]"Thet's a lil' welcome gift fer ya. All'n me. We's cleared out all'et junk in its brain al'riddy, so's yer all welcome."`);
    room.addStory(`He turns around, a low hiss emanating from within him. One of the crew members nods, with the rest clambering onto the rodents.`);
    room.addStory(`[c:var(--dialogue)]"Now we's dun' rilly got a Carrybeast fer ya, but'm sure we kin work it out. Ye' jus' gotta hop on up 'ere on Marisol fer now."`);
    room.addStory(`When he sees that you aren't instantly following his lead[c:var(--character)]Palmetto [c:]squints, eyeing you intensely.`);
    room.addStory(`On cue, two of his lackeys step away from their own Carrybeasts. The two of them, cloaks crudely labeled "Aardvark" and "Roox" draw their weapons.`)
    room.addStory(`[c:var(--dialogue)]"Yer comin' with, aint'cha?"`);
    choice1 = room.createChoice(`Take the bot and run.`);
    choice1.addAction({type: 'changeRoom', parameters: ['s-start']});
}
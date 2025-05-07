// will import rooms from rooms folder, then export a function that runs them all

import * as exampleRooms from "../rooms/testing/exampleRooms.js";
import * as beginningRooms from "../rooms/main_story/beginning.js";
import * as destructionRooms from "../rooms/main_story/destruction.js";
import * as escapeRooms from "../rooms/main_story/escape.js";
import * as saviorRooms from "../rooms/main_story/savior.js";
import * as endings from "../rooms/endings.js";
let roomFiles = [exampleRooms, beginningRooms, destructionRooms, escapeRooms, saviorRooms, endings]

export function generateRooms() {
    for (const roomFile of roomFiles) {
        for (const roomGenerator of roomFile.roomGenerators) {
            roomGenerator();
        }
    }
}
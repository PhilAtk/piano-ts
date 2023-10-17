# PianoTS

## What is this?
PianoTS is a simple implementation of a Grand Staff renderer. It uses WebMIDI to capture input from a MIDI device, and display the depressed notes on the generated staff.

At the time of writing, it currently assumes the key of C, with some minor (bugged) support for accidentals

Do note that, by default, Firefox requires an addon to run WebMIDI on locally served HTML files. For this reason, Chrome is recommended for local use.

After the page has loaded, select your desired MIDI input device from the dropdown list. If you do not see your device, make sure it is connected, and press "Refresh MIDI Device List" on the page.

Try it out on the [Github Page](https://philatk.github.io/piano-ts/)

## How to Use
PianoTS is currently intended to be run as a single page application. To build, simply clone the repository, then run:
```
npm install
npx tsc
```
in the cloned directory.

Alternatively, a docker-compose is provided that will transpile and host the static files necessary to run

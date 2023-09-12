// MIDI ==============================================================

let _midi: WebMidi.MIDIAccess;
let _midi_input: WebMidi.MIDIInput;

// TODO: Check that the currently selected MIDI is still connected?
let _select_midi = <HTMLSelectElement>document.getElementById("midi_select");

function midi_populate_select()
{
	// Empty the <select> element
	_select_midi.childNodes
		.forEach(child => {
			_select_midi.removeChild(child);
		})

	// Populate it again
	console.log("Loading MIDI Inputs...");
	_midi.inputs.forEach(input => {

		input.removeEventListener("midimessage", <EventListenerOrEventListenerObject>midiMessageReceived);

		if (input.name) {
			console.log("Found: " + input.name);

			var input_option = document.createElement('option');
			input_option.value = input.name; // midi_listen_to_input needs this
			input_option.innerHTML = input.name;
			input_option.setAttribute("value", input.name)

			_select_midi.appendChild(input_option);
		}
	})

	_cur_notes = [];

	// Listen to the default device
	midi_listen_to_selected_input();
}

function midi_setup()
{
	function midi_success(midiAccess: WebMidi.MIDIAccess) {
		_midi = midiAccess;
		console.log("MIDI ready!");
	
		midi_populate_select();
	}
	
	function midi_fail(msg: string) {
		console.error(`Failed to get MIDI access - ${msg}`);
	}

	navigator.requestMIDIAccess().then(midi_success, midi_fail);
}

midi_setup(); // Call on page load to request access

let _cur_notes: number[] = [];
let _last_note: number;
let _notes_span = <HTMLSpanElement>document.getElementById("active_notes");

function note_display_update() {
	_notes_span.innerHTML = _cur_notes.toString();
	render_sheet();
}

function midi_push_note(key: number, velocity: number)
{
	console.log(`note on: pitch:${key}, velocity: ${velocity}`);

	_cur_notes.push(key);
	_cur_notes.sort(); // TODO: Does this matter?
	_last_note = key; // TODO: Calculate this more appropriately for chords

	note_display_update();
}

function midi_remove_note(key: number, velocity: number)
{
	console.log(`note off: pitch:${key}, velocity: ${velocity}`);

	_cur_notes = _cur_notes.filter(num => num != key);

	note_display_update();
}

function midiMessageReceived(event: WebMidi.MIDIMessageEvent)
{
	// MIDI commands we care about. See
	// http://webaudio.github.io/web-midi-api/#a-simple-monophonic-sine-wave-midi-synthesizer.
	const NOTE_ON = 9;
	const NOTE_OFF = 8;

	const cmd = event.data[0] >> 4;
	const key = event.data[1];
	const velocity = (event.data.length > 2) ? event.data[2] : 1;

	// Note that not all MIDI controllers send a separate NOTE_OFF command for every NOTE_ON.
	if (cmd === NOTE_OFF || (cmd === NOTE_ON && velocity === 0)) {
		midi_remove_note(key, velocity);
	}

	else if (cmd === NOTE_ON) {
		midi_push_note(key, velocity);
	}
}

function midi_listen_to_selected_input()
{	
	_midi.inputs.forEach(input => {
		if (input.name == _select_midi.value) {
			input.addEventListener("midimessage", midiMessageReceived);
			console.log(`Listening to ${input.name}`);
		}

		// Stop listening to every input that isn't the selected one
		else {
			input.removeEventListener("midimessage", <EventListenerOrEventListenerObject>midiMessageReceived);
		}
	})

	_cur_notes = [];
}

_select_midi.addEventListener("change", midi_listen_to_selected_input);

// Draw ==================================================================

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

let _canvas = <HTMLCanvasElement>document.getElementById("staff");
_canvas.width = CANVAS_WIDTH;
_canvas.height = CANVAS_HEIGHT;

let _staff = <CanvasRenderingContext2D>_canvas.getContext("2d");

const MID_C_HEIGHT = CANVAS_HEIGHT/2;

const LINE_MARGIN = 50;
const LINE_LENGTH = CANVAS_WIDTH - (2*LINE_MARGIN);

const LINE_SPACING = 10;
const NOTE_HEIGHT = LINE_SPACING / 2;
const NOTE_WIDTH = LINE_SPACING / 4;

const NOTE_MARGIN = 50;

const NOTE_X = LINE_MARGIN + NOTE_MARGIN;

enum note_letter {
	C,
	D,
	E,
	F,
	G,
	A,
	B
}

enum note_name {
	C = 0,
	Db = 1,
	D = 2,
	Eb = 3,
	E = 4,
	F = 5,
	Fs = 6,
	G = 7,
	Ab = 8,
	A = 9,
	Bb = 10,
	B = 11
}

enum Mode {
	Ion = 0,
	Dor = 2,
	Phr = 4,
	Lyd = 5,
	Mix = 7,
	Aeo = 9,
	Loc = 11
}

enum accidental {
	flat = 1,
	natural = 0,
	sharp = -1
}

let _key = note_name.C;
let _mode = Mode.Ion;
let _note_accidentals = [0, 0, 0, 0, 0, 0, 0,];
let _num_accidentals = 0;

let top_line: number;
let bottom_line: number;

function generate_accidentals() {
	function circ5_dist_from_c(note: note_name) {
	    console.log(`Distance for note: ${note}`);
	    switch ((12 + note) % 12) {
		case note_name.Fs:
		    return 6;
		case note_name.Db:
		    return -5;
		case note_name.Ab:
		    return -4;
		case note_name.Eb:
		    return -3;
		case note_name.Bb:
		    return -2;
		case note_name.F:
		    return -1;
		case note_name.C:
		    return 0;
		case note_name.G:
		    return 1;
		case note_name.D:
		    return 2;
		case note_name.A:
		    return 3;
		case note_name.E:
		    return 4;
		case note_name.B:
		    return 5;
		default:
		    return 0;
	    }
	}
	let num_accidentals = circ5_dist_from_c(_key - _mode);
	_num_accidentals = num_accidentals;
	_note_accidentals = [0, 0, 0, 0, 0, 0, 0,];
	let index = 0;
	if (num_accidentals < 0) {
	    index = note_letter.B;
	    while (num_accidentals != 0) {
		_note_accidentals[index] = accidental.flat;
		index = (index + 3) % 7;
		num_accidentals++;
	    }
	}
	else if (num_accidentals > 0) {
	    index = note_letter.F;
	    while (num_accidentals != 0) {
		_note_accidentals[index] = accidental.sharp;
		index = (index + 4) % 7;
		num_accidentals--;
	    }
	}
    }

function get_accidental(note: number) {
	function check_midi_in_key(note: number) {
	    switch ((note + 24 - _key - _mode) % 12) {
		case 0:
		    return true;
		case 2:
		    return true;
		case 4:
		    return true;
		case 5:
		    return true;
		case 7:
		    return true;
		case 9:
		    return true;
		case 11:
		    return true;
		default:
		    break;
	    }
	    return false;
	}

	if (check_midi_in_key(note)) {
	    return accidental.natural;
	}

	else if (_last_note < note) {
	    return accidental.sharp;
	}

	else {
	    return accidental.flat;
	}
}

function render_sheet() {
	_staff.clearRect(0, 0, _canvas.width, _staff.canvas.height);

	// Draw the Treble Staff
	let height = MID_C_HEIGHT - LINE_SPACING;
	for (let i=0; i<5; i++) {
		// Draw the Treble Staff
		_staff.beginPath();
		_staff.moveTo(LINE_MARGIN, height);
		_staff.lineTo(LINE_MARGIN + LINE_LENGTH, height);
		_staff.stroke();

		height = height - LINE_SPACING;
	}
	top_line = height;
	
	// Draw the Bass Staff
	height = MID_C_HEIGHT + LINE_SPACING;
	for (let i=0; i<5; i++) {
		_staff.beginPath();
		_staff.moveTo(LINE_MARGIN, height);
		_staff.lineTo(LINE_MARGIN + LINE_LENGTH, height);
		_staff.stroke();

		height = height + LINE_SPACING;
	}
	bottom_line = height;
	
	function draw_notes() {
		function dist_from_C4(key: number) {
			let octaves = Math.floor((key - 60) / 12);
			let semitones = key % 12;
			let lines = 0;
			
			switch (semitones) {
				case 1:
				case 2:
			    		lines = 1;
			    		break;
				case 3:
				case 4:
			    		lines = 2;
			    		break;
				case 5:
			    		lines = 3;
			    	break;
				case 6:
				case 7:
			    		lines = 4;
			    		break;
				case 8:
				case 9:
			    		lines = 5;
			    		break;
				case 10:
				case 11:
			    		lines = 6;
			    		break;
				default:
			    	break;
		    }

		    return octaves * 7 + lines;
		}

		function draw_ledger_line_at_height(height: number) {
			_staff.beginPath();
			_staff.moveTo(NOTE_X - NOTE_WIDTH * 4, height);
			_staff.lineTo(NOTE_X + NOTE_WIDTH * 4, height);
			_staff.stroke();
		}

		function draw_note_at_height(height: number) {
			_staff.moveTo(NOTE_X + NOTE_WIDTH * 2, height);
			_staff.ellipse(NOTE_X, height, NOTE_HEIGHT, NOTE_WIDTH, 0, 0, 2 * Math.PI);
			_staff.stroke();
		}

		function draw_flat(x: number, y: number) {
			_staff.fillText("b", x, y);
		}

		function draw_sharp(x: number, y: number) {
			_staff.fillText("#", x, y);
		}

		// The important part
		_cur_notes.forEach(key => {
			let dist_from_c4 = dist_from_C4(key);
		    	let height = MID_C_HEIGHT - (LINE_SPACING * dist_from_c4 / 2);

		    	if (key == 60) {
				draw_ledger_line_at_height(height);
		    	}

			else if (key <= 40) {
				for (let line_height = bottom_line; line_height <= height; line_height += LINE_SPACING) {
					draw_ledger_line_at_height(line_height);
				}
			}

			else if (key >= 80) {
				for (let line_height = top_line; line_height >= height; line_height -= LINE_SPACING) {
					draw_ledger_line_at_height(line_height);
				}
			}

		    	switch (get_accidental(key)) {
				case -1:
					draw_sharp(NOTE_X + NOTE_WIDTH * 2, height);
					break;
				case 1:
					draw_flat(NOTE_X + NOTE_WIDTH * 2, height);
					break;
				default:
					break;
			}

		    	draw_note_at_height(height);
		});
	}

	draw_notes();
}

// Render once on page load
render_sheet();
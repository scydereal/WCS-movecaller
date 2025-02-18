import sys, random, time, subprocess, threading, copy, random

# python3 dancerandomizer.py <= this will use default bpm, ~90
# python3 dancerandomizer.py 70
# python3 dancerandomizer.py 170
# python3 dancerandomizer.py freq <= this will analyze frequencies of MOVE_LIBRARY as currently defined, since transition necessities make frequencies non-obvious. The second int in the MOVE_LIBRARY values are tweaked to make the true, in-practice frequencies even. Multiply them (instead of editing the int itself) to bump moves up or down


# +++
MOVE_LIBRARY = { # value: [count, frequency]. Frequencies are different due to transition necessities - these actually sum up to roughly the same frequency per move once accounted for.

    "left side pass": [6, 1],
    "under arm turn": [6, 0.8],
    "basic whip": [8, 1],
    "basket whip": [8, 2],
    "sugar push": [6, 0.8],
    "sugar tuck": [6, 0.7*0],
    "traveling tuck": [6, 1*0],
    "inside turn": [6, 1], # the one where you sway your hand to signal, follow goes widdershins
    "outside turn": [6, 1*0], # the fast double clockwise one I can't do without shoes
    "compression tuck": [6, 2*0],
    "free turn": [6, 2*0], # like inside turn, but start with opp hand connection, let go. hard on belly w/o shoes
    "roll in roll out": [6, 2*0], # like inside turn, but start with opp hand connection, let go
}

# transition necessities
NEEDS_UNTWIST = ["sugar tuck", "compression tuck"] # must be succeeded with an untwister
PROVIDES_UNTWIST = ["under arm turn", "sugar push", "sugar tuck", "inside turn"] # ... DOES sugar tuck provide untwist?

PROVIDES_HAND = ["left side pass", "basic whip", "sugar push"]
NEEDS_HAND = ["basket whip", "compression tuck", "free turn", "roll in roll out"] # both or opp hand needed, must be preceded by a provider (ie a move where the follow can see in time that the lead wants the hand)

PREFERS_WIDDER_AFTER = ["outside turn"]
PREFERS_CLOCKWISE_AFTER = ["inside turn", "free turn"]
PROVIDES_WIDDER = ["under arm turn", "inside turn", "free turn"]
PROVIDES_CLOCKWISE = ["basic whip", "sugar tuck", "traveling tuck", "outside turn", "compression tuck"]

# +++ Experimental: trying a transition matrix instead

def normalize(arr):
    total = float(sum(arr))
    return [x / total for x in arr]

def unnormalize(arr):
    return [round(x*sum(target_freqs), 1) for x in arr]

num_moves = len(MOVE_LIBRARY)
int_to_move = {}
move_to_int = {None: random.randrange(num_moves)}
int_arr = list(range(num_moves))
for i, m in enumerate(MOVE_LIBRARY):
    int_to_move[i] = m
    move_to_int[m] = i
target_freqs = [MOVE_LIBRARY[int_to_move[i]][-1] for i in int_arr]

def generate_initial_tm():
    transition_matrix = [copy.deepcopy(target_freqs) for _ in int_arr]
    for m in NEEDS_UNTWIST:
        i = move_to_int[m]
        for succ in MOVE_LIBRARY:
            if succ not in PROVIDES_UNTWIST:
                j = move_to_int[succ]
                transition_matrix[i][j] = 0
    for m in NEEDS_HAND:
        j = move_to_int[m]
        for pred in MOVE_LIBRARY:
            if pred not in PROVIDES_HAND:
                i = move_to_int[pred]
                transition_matrix[i][j] = 0

    # surprisingly, these 'preferences' are preserved after iteratively_update_tm, which... may mean that the func isn't very good
    for m in PREFERS_CLOCKWISE_AFTER:
        i = move_to_int[m]
        for succ in PROVIDES_CLOCKWISE:
            j = move_to_int[succ]
            transition_matrix[i][j] *= 3
    for m in PREFERS_WIDDER_AFTER:
        i = move_to_int[m]
        for succ in PROVIDES_WIDDER:
            j = move_to_int[succ]
            transition_matrix[i][j] *= 3
    return transition_matrix

def choose_next_move_index(prev_move_index, transition_matrix):
    weights = transition_matrix[prev_move_index]
    next_move_index = random.choices(int_arr, weights=weights, k=1)[0]
    return next_move_index

# return array of actual move frequencies when you play it out with the TM
def simulate_frequencies(transition_matrix):
    SIMS_PER_MOVE = 1000
    bins = [0] * num_moves
    move = random.randrange(0, num_moves)
    for i in range(num_moves*SIMS_PER_MOVE):
        bins[move] += 1
        move = choose_next_move_index(move, transition_matrix)
    return normalize(bins)

def print_matrix(tm):
    print("   LeSP UnAT BasW Bask Push Tuck Trav Insd Outs CmpT Free")
    for i in range(num_moves):
        print(int_to_move[i][:3], unnormalize(tm[i]))

def iteratively_update_tm(transition_matrix):
    move_flexibility = [sum(1 for x in transition_matrix[i] if x > 0) for i in int_arr]
    for iter in range(4):
        freqs = simulate_frequencies(transition_matrix) # [f1, f2 ...]
        # naively: we adjust by column, then normalize by row, in each iteration. but:
        # we want to make a bigger column adjustment in rows where the previous move (the row move)
        # is relatively unconstrained, ie its move_flexibility is high.
        for j, f in enumerate(freqs):
            adjust = target_freqs[j]/(f+0.000001)
            for i in range(num_moves):
                meta_adjust = 0.8*move_flexibility[i]/num_moves
                transition_matrix[i][j] *= adjust**meta_adjust
        for i in range(num_moves):
            transition_matrix[i] = normalize(transition_matrix[i])
        print("iter", iter, unnormalize(freqs))
    return transition_matrix

transition_matrix = generate_initial_tm()
transition_matrix = iteratively_update_tm(transition_matrix)
print_matrix(transition_matrix)

def transition(prev_move, transition_matrix):
    i = move_to_int[prev_move]
    succ = choose_next_move_index(i, transition_matrix)
    return int_to_move[succ]

# +++ Sound consts

# Also tried Morse for an 'and' but it was too long
DEFAULT_SOUND = "Tink.aiff"
FIRST_BEAT_UNDERLAY = "Pop.aiff"
DEFAULT_BEAT_VOL = 3 # default is 1, too quiet compared to system say, which is harder to volume-tune
FIRST_BEAT_VOL = 7

# +++ beat

BPM = 90 # Default
if len(sys.argv) > 1 and sys.argv[1].isdigit():
    # user input bpm flattened to a [10, 180] range; if they put in 1000 we're
    # going to be shooting off a LOT of subprocesses + threads
    BPM = max(10, min(int(sys.argv[1]), 180))
beat_duration = 60 / BPM

def play_first_two():
    # on -v: "Apple does not define a value range for this, but it appears to accept 0=silent, 1=normal (default) and then up to 255=Very loud."
    subprocess.Popen(["afplay", "-v", str(FIRST_BEAT_VOL), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    subprocess.Popen(["afplay", "-v", str(FIRST_BEAT_VOL), f"/System/Library/Sounds/{FIRST_BEAT_UNDERLAY}"])
    time.sleep(beat_duration)
    subprocess.Popen(["afplay", "-v", str(DEFAULT_BEAT_VOL), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    time.sleep(beat_duration)
def play_two():
    subprocess.Popen(["afplay", "-v", str(DEFAULT_BEAT_VOL), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    time.sleep(beat_duration)
    subprocess.Popen(["afplay", "-v", str(DEFAULT_BEAT_VOL), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    time.sleep(beat_duration)
def play_triple():
    subprocess.Popen(["afplay", "-v", str(DEFAULT_BEAT_VOL), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    time.sleep(beat_duration * 0.5)
    subprocess.Popen(["afplay", "-v", str(DEFAULT_BEAT_VOL-2), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    time.sleep(beat_duration * 0.5)
    subprocess.Popen(["afplay", "-v", str(DEFAULT_BEAT_VOL), f"/System/Library/Sounds/{DEFAULT_SOUND}"])
    time.sleep(beat_duration)
def play_six_count(done_event):
    play_first_two()
    play_triple()
    play_triple()
    done_event.set()
def play_eight_count(done_event):
    play_first_two()
    play_triple()
    play_two()
    play_triple()
    done_event.set()
def announce_move(move):
    print(f"Next move: {move}")
    subprocess.Popen(["say", move])

def choose_next_move(prev_move):
    freqmap = copy.deepcopy(MOVE_LIBRARY)
    candidates = list(freqmap.keys())
    
    if prev_move not in PROVIDES_HAND:
        candidates = [m for m in candidates if m not in NEEDS_HAND]
    if prev_move in NEEDS_UNTWIST:
        candidates = PROVIDES_UNTWIST
    elif prev_move in PROVIDES_HAND:
        for m in NEEDS_HAND:
            freqmap[m][-1] *= 3
    elif prev_move in PREFERS_WIDDER_AFTER:
        for m in PROVIDES_WIDDER:
            freqmap[m][-1] *= 3
    elif prev_move in PREFERS_CLOCKWISE_AFTER:
        for m in PROVIDES_CLOCKWISE:
            freqmap[m][-1] *= 3

    moveweights = list(map(lambda m: freqmap[m][-1], candidates))
    chosen_move = random.choices(candidates, weights=moveweights, k=1)
    return chosen_move[0]

def reanalyze_frequencies():
    SIMS_PER_MOVE = 1000
    actual_freq_bin = {m: 0 for m in list(MOVE_LIBRARY.keys())}
    move = None
    for i in range(len(MOVE_LIBRARY)*SIMS_PER_MOVE):
        move = choose_next_move(move)
        actual_freq_bin[move] += 1
    for m in actual_freq_bin:
        print(m, actual_freq_bin[m]/float(SIMS_PER_MOVE))

def dance_fools_dance(transition_matrix):
    move = None
    beats = 6
    try:
        while True:
            playfunc = play_six_count if beats == 6 else play_eight_count # might add more later if we get to complex moves

            # kick off metronome for this move
            done_event = threading.Event()
            thread = threading.Thread(target=playfunc, args=(done_event,), daemon=True)
            thread.start()

            # choose and announce next move, wait til metronome done
            # move = choose_next_move(move)
            move = transition(move, transition_matrix)
            beats = MOVE_LIBRARY[move][0]
            time.sleep(beat_duration*2)
            announce_move(move)
            done_event.wait()
    except KeyboardInterrupt:
        print("\n\nThe fools are released from their dance hell")

if len(sys.argv) > 1 and sys.argv[1] == 'freq':
    reanalyze_frequencies()
    exit(0)

dance_fools_dance(transition_matrix)
function createRandoms(n, min = -1, max = 1) {
    const range = max - min;
    return new Float32Array(n).map(x => Math.random() ** 4 * range + min);
}

export interface OscData {
    gainNode: GainNode;
    oscNode: OscillatorNode;
    reset(): void;
    setVolume(x: number): void;
    setFreq(x: number): void;
}

export class Oscillators {
    audioCtx: AudioContext;
    children: OscData[];
    constructor() {
        this.audioCtx = new AudioContext({
            latencyHint: "interactive",
        });
        addEventListener("keydown", () => this.audioCtx.resume());
        addEventListener("mousedown", () => this.audioCtx.resume());

        this.children = [];
    }

    add(phases = 20): OscData {
        const gainNode: GainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(this.audioCtx.destination);

        const oscNode = this.audioCtx.createOscillator();
        oscNode.setPeriodicWave(this.audioCtx.createPeriodicWave(createRandoms(phases), createRandoms(phases)));
        oscNode.connect(gainNode);
        oscNode.frequency.value = 10
        oscNode.start();

        const parent = this;

        const child = {
            gainNode, oscNode,
            reset() {
                oscNode.setPeriodicWave(parent.audioCtx.createPeriodicWave(createRandoms(phases), createRandoms(phases)));
            },
            setVolume(x: number) {
                const node = gainNode.gain;
                node.setValueAtTime(node.value, parent.audioCtx.currentTime);
                node.linearRampToValueAtTime(x, parent.audioCtx.currentTime + 0.1);
            },
            setFreq(x: number) {
                const node = oscNode.frequency;
                node.setValueAtTime(node.value, parent.audioCtx.currentTime);
                node.linearRampToValueAtTime(x, parent.audioCtx.currentTime + 0.1);
            },
        };
        this.children.push(child);
        return child;
    }
}
import {LoDashStatic} from "lodash";

import {Vector2D, vec, vadd, vmod, vdeadzone, vunit, vtodeg, vrotrad, vlength, vmul, vproject, vscalarproject, vsub, vdecrease, vincrease, vmost, most} from "./vectors";
import {PCMPlayer} from "./sound";

const _: LoDashStatic = window._;


const canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
document.body.append(canvas)
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

interface Inputs {
    l: Vector2D;
    r: Vector2D;
    lt: number;
    rt: number;
    lb: boolean;
    rb: boolean;
}

interface StepData {
    timeDeltaMs: number;
    inputs: Inputs;
}

class GameObject {
    parent: GameObject | undefined;

    step(data: StepData) {}

    render() {}
}

class GameGraph extends GameObject {
    parent: GameObject | undefined;
    children: GameObject[];
    constructor() {
        super();
        this.children = []
    }

    add(obj: GameObject) {
        this.children.push(obj);
        obj.parent = this;
    }

    step(data: StepData) {
        this.children.forEach(child => child.step(data));
    }

    render() {
        this.children.forEach(child => child.render());
    }
}

function withTransform(f: Function) {
    const t = ctx.getTransform();
    f();
    ctx.setTransform(t);
}

const datasets = {
    vel: [],
    x1: [],
    x2: [],
    x3: [],
}

let randoms = new Float32Array(1000).map(x => Math.random());

addEventListener("mousedown", () => randoms = new Float32Array(1000).map(x => Math.random()));

class PlayerObject extends GameObject {
    pos: Vector2D;
    vel: Vector2D;
    wheelPos: number;
    dir: Vector2D;
    wheelVel: Vector2D;
    tireAcc: Vector2D;
    shaftRpm: number;
    throttle: number;
    gear: number;

    soundI: number;
    soundJ: number;

    constructor() {
        super();
        this.pos = vec(canvas.width / 2, canvas.height / 2);
        this.vel = vec(0, 0);
        this.wheelPos = 0;
        this.dir = vec(0, 1);
        this.shaftRpm = 0;
        this.throttle = 0;
        window["player"] = this;
        this.soundI = 0;
        this.soundJ = 0;
        this.gear = 1;
    }

    step(data: StepData) {
        this.throttle = data.inputs.rt * 0.1 + this.throttle * 0.9;
        if (window["soundPlayer"]) {
            const soundPlayer = window["soundPlayer"];
            // data.timeDeltaMs * sound.option.sampleRate / 1000
            const samplesNeeded = 
            (
                data.timeDeltaMs + 100 -
                (soundPlayer.startTime - soundPlayer.audioCtx.currentTime) * 1000
             ) * soundPlayer.option.sampleRate / 1000
            if (samplesNeeded > 0) {
                const rpm = this.shaftRpm;
                const rsmpl = Math.floor(randoms[0] * 200 + 50);
                const samples = new Float32Array(samplesNeeded
                    ).map((x, i) =>
                        (0.5 + randoms[Math.floor((this.soundI +=  Math.PI * (250 + rpm * 30) / 8000)) % rsmpl] * 0.5) * 0.5
                        + (0.5 + randoms[rsmpl + Math.floor((this.soundJ +=  Math.PI * (250 + rpm * 30) / 8000)) % rsmpl] * 0.5) * (this.throttle * 0.5)
                );
                soundPlayer.feed(samples)
            }
            datasets.x2.push(this.shaftRpm);
            datasets.x3.push(this.throttle * 20);
            // console.log(samples.length);
        }
        const velLength = vlength(this.vel);
        this.wheelPos = - vdeadzone(data.inputs.l, 0.1).x * 0.8 / Math.max(1, velLength / 5);
        this.dir = vrotrad(this.dir, this.wheelPos * Math.PI / 180 * vlength(this.vel) * 1.0);

        const enginePower = this.throttle;
        this.shaftRpm += enginePower;
        this.shaftRpm = Math.min(200, this.shaftRpm);
        this.shaftRpm *= 0.995;
        this.shaftRpm = Math.max(0, this.shaftRpm);

        // (back) wheel friction with road (minus axle friction)
        let x1: Vector2D;
        let x2: Vector2D;
        let x3: Vector2D;
        this.wheelVel = vproject(this.vel, this.dir);
        const rpmLurch = this.shaftRpm - vlength(this.wheelVel);
        const axleFriction = 0.004;
        this.wheelVel = vdecrease(this.wheelVel, axleFriction + data.inputs.lt * 2);
        this.wheelVel = vadd(this.wheelVel, vmul(vunit(this.dir), Math.max(rpmLurch, rpmLurch) * 0.1));
        this.shaftRpm -= rpmLurch * 0.1;
        this.tireAcc = vsub(this.wheelVel, this.vel);
        this.vel = vadd(this.vel, vmul(this.tireAcc, 1));

        this.pos = vadd(this.pos, this.vel);
        this.pos = vmod(this.pos, vec(canvas.width, canvas.height));

        //datasets.vel.push(vlength(this.vel));
        //datasets.x1.push(this.rpm);
        //datasets.x2.push((vlength(x2) - vlength(x1)) * 10);
        //datasets.x3.push((vlength(x3) - vlength(x2)) * 10);
    }

    render() {
        ctx.fillStyle = "black";
        withTransform(() => {
            ctx.translate(this.pos.x, this.pos.y);
            withTransform(() => {
                ctx.rotate(vtodeg(this.dir));
                ctx.translate(-10, 0);
                ctx.fillRect(-5, -6, 10, 2);
                ctx.fillRect(-5,  4, 10, 2);

                ctx.translate(15, 0);
                ctx.rotate(this.wheelPos);
                ctx.fillRect(-5, -4, 10, 2);
                ctx.fillRect(-5,  2, 10, 2);
            });
        });

        function strokeData(data) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            data.slice(-500).forEach((x, i) => {
                ctx.lineTo(i, x);
            });
            ctx.stroke();
        }
        withTransform(() => {
            ctx.translate(0, 200);
            ctx.strokeStyle = "red";
            strokeData(datasets.vel);
            ctx.strokeStyle = "green";
            strokeData(datasets.x1);
            ctx.strokeStyle = "blue";
            strokeData(datasets.x2);
            ctx.strokeStyle = "brown";
            strokeData(datasets.x3);
        });

        function strokeVec(vec) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(vec.x, vec.y);
            ctx.stroke();
        }
        /*
        ctx.strokeStyle = "red";
        strokeVec(vmul(this.wheelVel, 20));
        ctx.strokeStyle = "green";
        strokeVec(vmul(this.tireAcc, 20));
        ctx.strokeStyle = "blue";
        strokeVec(vmul(this.vel, 20));
        ctx.strokeStyle = "brown";
        strokeVec(vmul(this.dir, 20));
        strokeVec(vmul(vproject(this.vel, this.dir), 20));
        */
    }
}

const keyStates = {}
document.addEventListener("keydown", (e) => keyStates[e.code] = true);
document.addEventListener("keyup", (e) => keyStates[e.code] = false);

const objectGraph = new GameGraph();
objectGraph.add(new PlayerObject());

let lastStepTimeMs: number = 0;
const maxFrameDelta = 100;

window.addEventListener("mousedown", () => {
    if (!window["soundPlayer"]) {
        window["soundPlayer"] = new PCMPlayer({"encoding": "32bitFloat"})
    }
});

function step() {
    const gamepad = navigator.getGamepads()[0];

    const nowMs = new Date().getTime();
    const timeDeltaMs = Math.min(
        nowMs - lastStepTimeMs, maxFrameDelta
    );
    lastStepTimeMs = nowMs;

    // KeyD ArrowRight
    function keyDiff(plusKey: string, minusKey?: string) {
        return (keyStates[plusKey] ? 1 : 0) - (minusKey ? (keyStates[minusKey] ? 1 : 0) : 0)
    }
    let inputs: Inputs = {
        l: { x: keyDiff("KeyD", "KeyA"), y: keyDiff("KeyW", "KeyS"), },
        lt: keyDiff("Space"),
        r: { x: keyDiff("ArrowRight", "ArrowLeft"), y: keyDiff("ArrowUp", "ArrowDown") },
        rt: keyDiff("ShiftLeft"),
        lb: !!keyStates["KeyQ"],
        rb: !!keyStates["KeyE"],
    };
    if (gamepad) {
        inputs = {
            l: vmost(inputs.l, { x: gamepad.axes[0], y: gamepad.axes[1]}),
            lt: most(inputs.lt, gamepad.buttons[6].value),
            r: vmost(inputs.r, { x: gamepad.axes[2], y: gamepad.axes[3] }),
            rt: most(inputs.rt, gamepad.buttons[7].value),
            lb: inputs.lb || gamepad.buttons[4].pressed,
            rb: inputs.rb || gamepad.buttons[5].pressed,
        }
    }

    ctx.resetTransform();
    ctx.fillStyle = "white";
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    objectGraph.step({timeDeltaMs: timeDeltaMs, inputs: inputs});
    objectGraph.render();

    setTimeout(step, 1000 / 100);
}

step();

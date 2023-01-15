import {LoDashStatic} from "lodash";

import {Vector2D, vec, vadd, vmod, vdeadzone, vunit, vtodeg, vrotrad, vlength, vmul, vproject, vscalarproject, vsub, vdecrease, vincrease, vmost, most} from "./vectors";

import {OscData, Oscillators} from "./oscillatorSounds";

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

class PlayerObject extends GameObject {
    gearRatios: number[];
    pos: Vector2D;
    vel: Vector2D;
    wheelPos: number;
    dir: Vector2D;
    wheelVel: Vector2D;
    tireAcc: Vector2D;
    shaftRpm: number;
    throttle: number;
    rpm: number;
    gear: number;
    canShift: boolean;

    soundI: number;
    soundJ: number;

    engineOsc: OscData;
    throttleOsc: OscData;
    brakeOsc: OscData;

    oscs: Oscillators;

    constructor() {
        super();
        this.gearRatios = [10, 4, 2, 1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/7];

        this.pos = vec(canvas.width / 2, canvas.height / 2);
        this.vel = vec(0, 0);
        this.wheelPos = 0;
        this.dir = vec(0, 1);
        this.shaftRpm = 0;
        this.throttle = 0;
        this.soundI = 0;
        this.soundJ = 0;
        this.gear = 1;
        this.rpm = 0;
        this.canShift = true;

        this.oscs = new Oscillators();
        this.engineOsc = this.oscs.add();
        this.throttleOsc = this.oscs.add();
        this.brakeOsc = this.oscs.add(2000);
        this.brakeOsc.setFreq(0.3);

        window["player"] = this;

        addEventListener("mousedown", () => {
            this.engineOsc.reset();
            this.throttleOsc.reset();
            this.brakeOsc.reset();
        });
    }

    step(data: StepData) {
        this.throttle = data.inputs.rt * 0.1 + this.throttle * 0.9;

        if (!data.inputs.lb && !data.inputs.rb) {
            this.canShift = true;
        }
        if (this.canShift) {
            if (data.inputs.lb) {
                this.gear = Math.max(1, this.gear - 1);
                this.canShift = false;
            }
            if (data.inputs.rb) {
                this.gear = Math.min(5, this.gear + 1);
                this.canShift = false;
            }
        }

        this.rpm = (this.rpm * 0.9 + 0.1 * (Math.max(0, 2 * this.shaftRpm * this.gearRatios[this.gear]) + 5))

        if (true) {
            this.engineOsc.setFreq(this.rpm);
            this.engineOsc.setVolume(1);
            this.throttleOsc.setFreq(this.rpm);
            this.throttleOsc.setVolume(this.throttle);
            this.brakeOsc.setVolume(data.inputs.lt * Math.min(1, vlength(this.vel) / 10) * 4);
            this.brakeOsc.setFreq(0.1 + vlength(this.vel) / 500);

            datasets.x1.push(this.rpm);
            datasets.x2.push(this.shaftRpm);
            datasets.x3.push(this.throttle);
            datasets.vel.push(vlength(this.vel));
        }
        const velLength = vlength(this.vel);
        this.wheelPos = - vdeadzone(data.inputs.l, 0.1).x * 2.0 / Math.max(2.0, velLength * 1.0);
        this.dir = vrotrad(this.dir, this.wheelPos * Math.PI / 180 * vlength(this.vel) * 2.0);

        const enginePower = this.throttle / 4;
        const minRpm = 30;
        const maxRpm = 200;
        if (this.rpm < minRpm) {
            this.shaftRpm += enginePower * this.rpm / minRpm;
        } else {
            if (this.rpm < maxRpm) {
                this.shaftRpm += Math.min(enginePower, maxRpm - this.rpm);
            } else {
                this.shaftRpm -= Math.max(1, Math.min(this.rpm - maxRpm, this.rpm - this.shaftRpm)) * 0.01;
            }
            
        }
        this.shaftRpm *= 0.999;
        this.shaftRpm = Math.max(0, this.shaftRpm);

        // (back) wheel friction with road (minus axle friction)
        const roadSpeedInTireDir = vproject(this.vel, this.dir);
        const axleFriction = 0.004;
        const breakFriction = data.inputs.lt * 2;
        this.wheelVel = vdecrease(roadSpeedInTireDir, axleFriction + breakFriction);
        const lurchCoef = 0.02;
        const rpmLurch = this.shaftRpm * 1.0 - vlength(roadSpeedInTireDir);
        this.wheelVel = vadd(this.wheelVel, vmul(vunit(this.dir), Math.max(rpmLurch, rpmLurch) * lurchCoef));
        this.shaftRpm -= rpmLurch * lurchCoef;
        this.tireAcc = vsub(this.wheelVel, this.vel);
        // apply tire force to vel unless it skids
        this.vel = vadd(this.vel, vmul(this.tireAcc, vlength(this.tireAcc) > 1 ? 0.1 : 0.3));
        // datasets.x2.push((vlength(this.tireAcc)));

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

        function strokeData(col: string, data: number[], i: number) {
            if (data.length === 0) return;
            ctx.strokeStyle = col;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const showData: number[] = data.slice(-500);
            const minData = _.min(showData);
            const dataRange = _.max(showData) - minData;
            let val = _.mean(showData.slice(0, 10));
            showData.forEach((x, i) => {
                val = val * 0.8 + x * 0.2;
                ctx.lineTo(i, (val - minData) / dataRange * 100);
            });
            ctx.stroke();
            const lastData = val;
            const fmt = new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 });
            withTransform(() => {
                ctx.scale(1, -1);
                ctx.strokeText(fmt.format(lastData), Math.min(450, data.length), i * 20)
            });
        }
        if (false) {
            withTransform(() => {
                ctx.translate(0, 200);
                strokeData("red", datasets.vel, 0);
                strokeData("green", datasets.x1, 1);
                strokeData("blue", datasets.x2, 2);
                strokeData("brown", datasets.x3, 3);
            });
        }

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
function step() {
    const gamepad = navigator.getGamepads()[0];

    const nowMs = new Date().getTime();
    const timeDeltaMs = Math.min(
        nowMs - lastStepTimeMs, maxFrameDelta
    );
    lastStepTimeMs = nowMs;

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

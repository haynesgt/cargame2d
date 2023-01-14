import {LoDashStatic} from "lodash";

import {Vector2D, vec, vadd, vmod, vdeadzone, vunit, vtodeg, vrotrad, vlength, vmul, vproject, vscalarproject, vsub, vdecrease, vincrease} from "./vectors";

const _: LoDashStatic = window._;


const canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
document.body.append(canvas)
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

interface Inputs {
    l: Vector2D;
    r: Vector2D;
    lb: number;
    rb: number;
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

class PlayerObject extends GameObject {
    pos: Vector2D;
    vel: Vector2D;
    wheelPos: number;
    dir: Vector2D;
    wheelVel: Vector2D;
    tireAcc: Vector2D;
    rpm: number;

    constructor() {
        super();
        this.pos = vec(canvas.width / 2, canvas.height / 2);
        this.vel = vec(0, 0);
        this.wheelPos = 0;
        this.dir = vec(0, 1);
        this.rpm = 0;
        window["player"] = this;
    }

    step(data: StepData) {
        const velLength = vlength(this.vel);
        this.wheelPos = - vdeadzone(data.inputs.l, 0.1).x * 0.8 / Math.max(1, velLength / 5);
        this.dir = vrotrad(this.dir, this.wheelPos * Math.PI / 180 * vlength(this.vel) * 1.0);

        const enginePower = data.inputs.rb;
        this.rpm += this.rpm < 50 ? enginePower : 0;
        this.rpm *= 0.999;
        this.rpm = Math.max(0, this.rpm);

        // (back) wheel friction with road (minus axle friction)
        let x1: Vector2D;
        let x2: Vector2D;
        let x3: Vector2D;
        this.wheelVel = vproject(this.vel, this.dir);
        const rpmLurch = this.rpm - vlength(this.wheelVel);
        this.wheelVel = vdecrease(this.wheelVel, 0.001 + data.inputs.lb * 2);
        this.wheelVel = vadd(this.wheelVel, vmul(vunit(this.dir), Math.max(rpmLurch, rpmLurch) * 0.1));
        this.rpm -= rpmLurch * 0.1;
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

const objectGraph = new GameGraph();
objectGraph.add(new PlayerObject());

let lastStepTimeMs: number = 0;
const minFps = 10;
function step() {
    const gamepad = navigator.getGamepads()[0];

    const nowMs = new Date().getTime();
    const timeDeltaMs = Math.min(
        nowMs - lastStepTimeMs, 1000 / minFps
    );
    lastStepTimeMs = nowMs;

    let inputs: Inputs;
    if (gamepad) {
        inputs = {
            l: { x: gamepad.axes[0],y: gamepad.axes[1]},
            lb: gamepad.buttons[6].value,
            r: { x: gamepad.axes[2],y: gamepad.axes[3] },
            rb: gamepad.buttons[7].value,
    }
    } else {
        inputs = { l: { x: 0, y: 0 }, r: { x: 0, y: 0 }, lb: 0, rb: 0 };
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

import {LoDashStatic} from "lodash";

import {Vector2D, v, vadd, vmod} from "./vectors";

const _: LoDashStatic = window._;


const canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
document.body.append(canvas)
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

interface Inputs {
    l: Vector2D;
    y: Vector2D;
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

class PlayerObject extends GameObject {
    pos: Vector2D;

    constructor() {
        super();
        this.pos = v(canvas.width / 2, canvas.height / 2);
    }

    step(data: StepData) {
        this.pos = vadd(this.pos, data.inputs.l);
        this.pos = vmod(this.pos, v(canvas.width, canvas.height));
    }

    render() {
        ctx.fillStyle = "black";
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(45);
        ctx.fillRect(-5, -5, 10, 10);
        console.log("Redered player");
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

    let inputs;
    if (gamepad) {
        inputs = { l: { x: gamepad.axes[0],y: gamepad.axes[1]} , r: { x: gamepad.axes[2],y: gamepad.axes[3] } }
    } else {
        inputs = { l: { x: 0, y: 0 }, r: { x: 0, y: 0 } };
    }

    ctx.resetTransform();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    objectGraph.step({timeDeltaMs: timeDeltaMs, inputs: inputs});
    objectGraph.render();

    setTimeout(step, 1000 / 100);
}

step();

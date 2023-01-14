import {LoDashStatic} from "lodash";

const _: LoDashStatic = window._;


const canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
document.body.append(canvas)
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

interface Vector2D {
    x: number;
    y: number;
}

function v(x: number, y: number): Vector2D {
    return {x, y}
}

function vadd(...vs: Vector2D[]): Vector2D {
    return {
        x: _(vs).map("x").sum(),
        y: _(vs).map("y").sum(),
    }
}

function vmul(v: Vector2D, r: number): Vector2D {
    return {
        x: v.x * r,
        y: v.y * r,
    }
}

function vmod(a: Vector2D, n: Vector2D): Vector2D {
    return {
        x: n.x === undefined ? a.x : (a.x + n.x) % n.x,
        y: n.y === undefined ? a.y : (a.y + n.y) % n.y,
    }
}

function vlength(v: Vector2D) {
    return v.x ** 2 + v.y ** 2;
}

function vunit(v: Vector2D) {
    const length = vlength(v);
    return length == 0 ? v : vmul(v, 1 / length);
}

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
        ctx.transform(1, 0, 0, 1, this.pos.x, this.pos.y);
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

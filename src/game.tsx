const canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
document.body.append(canvas)
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

interface Vector2D {
    x: number;
    y: number;
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
    constructor() {
        super();
    }

    step(data: StepData) {
    }

    render() {
    }
}

const objectGraph = new GameGraph();
objectGraph.add(new PlayerObject());

ctx.fillStyle = "green";
ctx.transform
ctx.fillRect(10, 10, 150, 100);

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
        inputs = { l: {x: gamepad.axes[0],y: gamepad.axes[1]}, r: {x: gamepad.axes[2],y: gamepad.axes[3]} }
    } else {
        inputs = { l: { x: 0, y: 0 }, r: { x: 0, y: 0 } };
    }

    objectGraph.step({timeDeltaMs: timeDeltaMs, input: inputs});
    objectGraph.render();
}

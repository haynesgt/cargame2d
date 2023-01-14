const canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
document.body.append(canvas)
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

class RenderNode {
}

class RenderGraph {
    children: RenderGraph | RenderNode;
}

ctx.fillStyle = "green";
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

    let input;
    if (gamepad) {
        input = { l: {x: gamepad.axes[0],y: gamepad.axes[1]}, r: {x: gamepad.axes[2],y: gamepad.axes[3]} }
    } else {
        input = { l: { x: 0, y: 0 }, r: { x: 0, y: 0 } };
    }
}

import {LoDashStatic} from "lodash";

const _: LoDashStatic = window._;

export interface Vector2D {
    x: number;
    y: number;
}

export function v(x: number, y: number): Vector2D {
    return {x, y}
}

export function vadd(...vs: Vector2D[]): Vector2D {
    return {
        x: _(vs).map("x").sum(),
        y: _(vs).map("y").sum(),
    }
}

export function vmul(v: Vector2D, r: number): Vector2D {
    return {
        x: v.x * r,
        y: v.y * r,
    }
}

export function vmod(a: Vector2D, n: Vector2D): Vector2D {
    return {
        x: n.x === undefined ? a.x : (a.x + n.x) % n.x,
        y: n.y === undefined ? a.y : (a.y + n.y) % n.y,
    }
}

export function vlength(v: Vector2D) {
    return v.x ** 2 + v.y ** 2;
}

export function vunit(v: Vector2D) {
    const length = vlength(v);
    return length == 0 ? v : vmul(v, 1 / length);
}

export function vrotrad(v: Vector2D, theta: number) {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    return {
        x: +v.x * cosTheta - v.y * sinTheta,
        y: -v.x * sinTheta + v.y * cosTheta,
    }    
}

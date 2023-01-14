import {LoDashStatic} from "lodash";

const _: LoDashStatic = window._;

export interface Vector2D {
    x: number;
    y: number;
}

export function vec(x: number, y: number): Vector2D {
    return {x, y}
}

export function vadd(...vs: Vector2D[]): Vector2D {
    return {
        x: _(vs).sumBy("x"),
        y: _(vs).sumBy("y"),
    }
}

export function vsub(v1: Vector2D, v2: Vector2D) {
    return vadd(v1, vmul(v2, -1));
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

export function vunit(v: Vector2D, unit: number = 1) {
    const length = vlength(v);
    return length == 0 ? v : vmul(v, unit / length);
}

export function vrotrad(v: Vector2D, theta: number) {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    return {
        x: +v.x * cosTheta - v.y * sinTheta,
        y: +v.x * sinTheta + v.y * cosTheta,
    }    
}

export function vdeadzone(v: Vector2D, threshold: number) {
    const length = vlength(v);
    if (length < threshold) return vec(0, 0);
    return v;
}

export function vclamp(v: Vector2D, threshold: number) {
    const length = vlength(v);
    if (length > threshold) return vunit(v, threshold);
    return v;
}

export function vincrease(v: Vector2D, amount: number) {
    return vadd(
        v,
        vmul(vunit(v), amount)
    );
}

export function vdecrease(v: Vector2D, amount: number) {
    // reduce (but not less than zero)
    const length = vlength(v);
    if (length < amount) return vec(0, 0);
    return vadd(
        v,
        vmul(vunit(v), -amount)
    );
}

export function vtodeg(v: Vector2D) {
    return Math.atan2(v.y, v.x);
}

export function vdot(v1: Vector2D, v2: Vector2D) {
    return v1.x * v2.x + v1.y * v2.y;
}

export function vscalarproject(v1: Vector2D, v2: Vector2D) {
    return vdot(v1, v2) / (vlength(v2));
}

export function vproject(v1: Vector2D, v2: Vector2D) {
    return vmul(v2, vscalarproject(v1, v2));
}

export function most(...xs: number[]) {
    return _(xs).sortBy(x => -Math.abs(x)).first()
}

export function vmost(...vs: Vector2D[]) {
    return {
        x: _(vs).sortBy(v => Math.abs(v.x))[0].x,
        y: _(vs).sortBy(v => Math.abs(v.y))[0].y,
    }
}
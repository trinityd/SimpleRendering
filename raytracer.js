// Basic Javascript Raytracer, made from Gabriel Gambetta's tutorial here: http://www.gabrielgambetta.com/computer-graphics-from-scratch/introduction.html

class Sphere {
    constructor(center, radius, color, specular, reflective) {
        this.center = center;
        this.radius = radius;
        this.color = color;
        this.specular = specular;
        this.reflective = reflective;
    }
}

class Light {
	constructor(type, intensity, position) {
		this.type = type;
		this.intensity = intensity;
		this.position = position;
	}
}

Light.AMBIENT = 0;
Light.POINT = 1;
Light.DIRECTIONAL = 2;

let spheres = [new Sphere([0, 3, 3], .75, [255, 0, 0], 500, .2),
        new Sphere([2, 4, 4], 1, [0, 0, 255], 500, .3),
        new Sphere([-2, 4, 4], 1, [0, 255, 0], 10, .4),
        new Sphere([0, -5001, 0], 5000, [255, 255, 0], 1000, .5),
        new Sphere([0, 1, 4], .5, [100, 100, 50], 1000, .5),
        new Sphere([1, 1.25, 4], .5, [100, 100, 50], 1000, .5),
        new Sphere([-1, 1.25, 4], .5, [100, 100, 50], 1000, .5)];

let lights = [new Light(Light.AMBIENT, .2),
    			new Light(Light.POINT, .6, [2, 1, 0]),
    			new Light(Light.DIRECTIONAL, .2, [1, 4, 4])];

let reflectionRecursionDepth = 3;

let canvasWidth = 600;
let canvasHeight = 600;
let viewportSize = 1;
let projPlaneZ = 1;
let bgColor = [0, 0, 0];

// let camPos = [3, 0, 1];
// let camRot = [[0.7071, 0, -0.7071],
//                [     0, 1,       0],
//                [0.7071, 0,  0.7071]];

function radFromDeg(deg) {
	return deg * Math.PI / 180;
}

function degFromRad(rad) {
	return rad * 180 / Math.PI;
}


let camPos = [3, 2, -7];
let yRot = radFromDeg(-20);
let camRot = [[Math.cos(yRot), 0, Math.sin(yRot)],
              [0, 1, 0],
              [-Math.sin(yRot), 0, Math.cos(yRot)]];

let EPSILON = 0.001; // Smol number

// Helpers

function drawPixel(x, y, color) {
    stroke(color);
    point(x+canvasWidth/2, canvasHeight/2 - y);
}

function dotProduct(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

function magnitude(v) {
	return sqrt(dotProduct(v, v));
}

function subtract(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function add(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function scalMult(n, v) {
    return [n*v[0], n*v[1], n*v[2]];
}

function matMult(m, v) {
	let result = [0, 0, 0];

	for(let i = 0; i < 3; i++) {
		for(let j = 0; j < 3; j++) {
			result[i] += v[j] * m[i][j];
		}
	}

	return result;
}

function clampColor(vec) {
  return [Math.min(255, Math.max(0, vec[0])),
      Math.min(255, Math.max(0, vec[1])),
      Math.min(255, Math.max(0, vec[2]))]; 
}

function reflectRay(ray, normal) {
	return subtract(scalMult(2.0 * dotProduct(normal, ray), normal), ray);
}

function canvasToViewport(point) {
    return [point[0] * viewportSize / canvasWidth,
        point[1] * viewportSize / canvasWidth,
        projPlaneZ];
}

function numIsInRange(n, a, b) {
    return n > a && n < b;
}

// /Helpers

function closestIntersection(origin, direction, tMin, tMax) {
	let closestT = Infinity;
    let closestSphere = null;
    for (let sphere of spheres) {
        let [t1, t2] = intersectRaySphere(origin, direction, sphere);
        if (numIsInRange(t1, tMin, tMax) && t1 < closestT) {
            closestT = t1;
            closestSphere = sphere;
        }
        if (numIsInRange(t2, tMin, tMax) && t2 < closestT) {
            closestT = t2;
            closestSphere = sphere;
        }
    }
    if(closestSphere != null) return [closestSphere, closestT];
    else return null;
}

function traceRay(origin, direction, tMin, tMax, depth) {
	let intersection = closestIntersection(origin, direction, tMin, tMax);
    if (intersection == null) {
        return bgColor;
    }
    let closestSphere = intersection[0];
    let closestT = intersection[1]
    // return closestSphere.color;
    let point = add(origin, scalMult(closestT, direction));
    let normal = subtract(point, closestSphere.center);
    normal = scalMult(1.0 / magnitude(normal), normal);
    let negDirection = scalMult(-1, direction);
    let localColor = scalMult(computeLighting(point, normal, negDirection, closestSphere.specular), closestSphere.color);

    let reflectivity = closestSphere.reflective;
    if(depth <= 0 || reflectivity <= 0) return localColor;

    // Reflections
    let reflectedRay = reflectRay(negDirection, normal);
    let reflectedColor = traceRay(point, reflectedRay, EPSILON, Infinity, depth-1);

    return add(scalMult(1-reflectivity, localColor), scalMult(reflectivity, reflectedColor));
}

function intersectRaySphere(origin, direction, sphere) {
    let c = sphere.center;
    let r = sphere.radius;
    let OC = subtract(origin, c);

    let k1 = dotProduct(direction, direction);
    let k2 = 2 * dotProduct(OC, direction);
    let k3 = dotProduct(OC, OC) - r * r;

    let discrim = k2 * k2 - 4 * k1 * k3;
    if (discrim < 0) return [Infinity, Infinity];

    let t1 = (-k2 + sqrt(discrim)) / (2 * k1);
    let t2 = (-k2 - sqrt(discrim)) / (2 * k1);

    return [t1, t2];
}

function computeLighting(point, normal, view, specExp) {
	let intensity = 0;

	for(let light of lights) {
		if(light.type == Light.AMBIENT) {
			intensity += light.intensity;
		} else {
			let lightDirection;
			let tMax;
			if(light.type == Light.POINT) {
				lightDirection = subtract(light.position, point);
				tMax = 1;
			} else { // Directional
				lightDirection = light.position;
				tMax = Infinity;
			}
			
			// Shadow Check
			let blocker = closestIntersection(point, lightDirection, EPSILON, tMax)
			if(blocker != null) continue;

			// Diffuse
			let normalDotLightDirection = dotProduct(normal, lightDirection);
			if(normalDotLightDirection > 0) {
				intensity += (light.intensity * normalDotLightDirection)/(magnitude(normal) * magnitude(lightDirection));
			}

			// Specular
			if(specExp != -1) {
				let reflectionDirection = reflectRay(lightDirection, normal);
				let reflectionDirectionDotView = dotProduct(reflectionDirection, view);
				if(reflectionDirectionDotView > 0) {
					intensity += light.intensity * pow(reflectionDirectionDotView / (magnitude(reflectionDirection) * magnitude(view)), specExp);
				}
			}
		}
	}
	return intensity;
}

function setup() {
    createCanvas(canvasWidth, canvasHeight);
}

function draw() {
	noLoop();
    background(bgColor);
    for (let x = -canvasWidth/2; x < canvasWidth/2; x++) {
        for (let y = -canvasHeight/2; y < canvasHeight/2; y++) {
            let directionOfRay = matMult(camRot, canvasToViewport([x, y]));       
            let color = traceRay(camPos, directionOfRay, 1, Infinity, reflectionRecursionDepth);
            drawPixel(x, y, clampColor(color));
        }
    }
}
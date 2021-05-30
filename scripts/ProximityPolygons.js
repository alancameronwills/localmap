/*
 * Draw proximity polygons around a set of pins.
 */


/**
 * Represents a point on the ground. Assumes all points are in approximately the same latitude.
 * Converts between degrees lat-long and km x-y.
 */
 class GeoPoint {
    constructor (p) {
        if (p.e) this.setFromLatLong(p.n, p.e);
        else this.setFromKm(p.x, p.y);
    }
    setFromLatLong (n,e) {
        this.e = e; 
        this.n = n;
        this.x = this.e*this.LatFactor * 111;
        this.y = this.n * 111;
    }
    setFromKm(x,y) {
        this.x = x;
        this.y = y;
        this.e = this.x/111/this.LatFactor;
        this.n = this.y/111;
    }

    get LatFactor () {
        if (!GeoPoint.latFactor) {
            if (!this.n) {
                throw ("First use of GeoPoint should use setFromLatLong");
            }
            GeoPoint.latFactor = Math.cos(this.n / 57.3);
        } 
        return GeoPoint.latFactor;
    }

    distanceSquared(p) {
        let other = p.x ? p : new GeoPoint(p); 
        return (this.x-p.x)*(this.x-p.x) + (this.y-p.y)*(this.y-p.y);
    }
}
/** Represents a line on the ground */
class GeoLine {
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.dx = p2.x - p1.x;
        this.dy = p2.y - p1.y;
    }
    midPoint() {
        if (!this._mid) this._mid = new GeoPoint({x:(this.p2.x+this.p1.x)/2,y:(this.p2.y+this.p1.y)/2});
        return this._mid;
    }
    /** Point at which lines intersect 
     * @param {GeoLine} that
     * @see https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
    */
    intersection (that) {
        let scale = this.dy*that.dx - this.dx*that.dy;
        let cthis = this.p1.x*this.p2.y - this.p1.y*this.p2.x;
        let cthat = that.p1.x*that.p2.y - that.p1.y*that.p2.x;
        return new GeoPoint ({
            x: (cthis*that.dx - cthat*this.dx)/scale,
            y: (cthis*that.dy - cthat*this.dy)/scale
        });
    }
}


class LineCalcs {
    /** Nearest point equidistant between two points */
    midway2(p1, p2) {
        return { e: (p2.e + p1.e) / 2, n: (p2.n + p1.n) / 2 };
    }
    /** Formula for line equidistant from two points - calc N from E */
    perpMidLineN(p1, p2) {
        return E =>
            (p1.n - p2.n) / 2 -
            (E - (p1.e - p2.e) / 2) * (p1.n - p2.n) / (p1.e - p2.e);
    }
    /** Formula for line equidistant from two points - calc E from N */
    perpMidLineE(p1, p2) {
        return N =>
            (p1.e - p2.e) / 2 -
            (N - (p1.n - p2.n) / 2) * (p1.e - p2.e) / (p1.n - p2.n);
    }
    /** Safer to calculate N from E or E from N? */
    MidLineCalcNfromE(p1, p2) {
        return Math.abs(p1.e - p2.e) > Math.abs(p1.n - p2.n);
    }

    /** A bounded line equidistant from two points */
    perpMidLineEnds(p1, p2) {
        if (!this.latFactor) {
            this.latFactor = Math.cos(p1.n/57.3);
        }
        let mid = new GeoPoint({ e: (p1.e + p2.e) / 2, n: (p1.n + p2.n) / 2 });
        let dp = new GeoPoint({ e: (p1.e - p2.e) / 2, n: (p1.n - p2.n) / 2 });

        let extendFactor = 4; //(0.0003 - roughScale) / roughScale;
        let m1 = new GeoPoint({x: mid.x + extendFactor * dp.y, y: mid.y - extendFactor * dp.x});
        let m2 = new GeoPoint({x: mid.x - extendFactor * dp.y, y: mid.y + extendFactor * dp.x});
/*
        let roughScale = dp1.e+dp1.n;

        let m1 = { e: mid.e + extendFactor * dp1.n/this.latFactor, n: mid.n - extendFactor * dp1.e*this.latFactor };
        let m2 = { e: mid.e - extendFactor * dp1.n/this.latFactor, n: mid.n + extendFactor * dp1.e*this.latFactor };
*/
        return new GeoLine(m1, m2);
    }
    /**
     * Equidistant from three points
     * @param {GeoPoint} p1 
     * @param {GeoPoint} p2 
     * @param {GeoPoint} p3 
     * @returns GeoPoint
     * @see https://en.wikipedia.org/wiki/Circumscribed_circle#Circumcenter_coordinates
     */
    midway3(p1, p2, p3) {
        let d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p3.y));
        let mx = ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) +
            (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) +
            (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) / d;
        let my = ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) +
            (p2.x * p2.x + p2.y * p2.y) * (p1.x - p2.x) +
            (p3.x * p3.x + p3.y * p3.y) * (p2.x - p3.x)) / d;
        return new GeoPoint({ x: mx, y: my });
    }
}

class ProximityPolygons extends LineCalcs {
    constructor(pins) {
        super();
        this.pins = pins || [];
    }

    clear() {
        this.pins = [];
    }

    setSelection(pinsOrPlaces) {
        this.pins = [];
        pinsOrPlaces.forEach(pinOrPlace => {
            let pin = pinOrPlace.place ? pinOrPlace : map.placeToPin[pinOrPlace.id];
            this.pins.push(pin);
            if (!pin.midLines) pin.midLines = [];
        });
    }

    showPolygons() {
        if (this.pins.length > 30) {
            alert("Too many pins selected. Use Deselect All first");
            return;
        }
        this.pins.forEach(pin => {
            this.findMidLines(pin);
            this.findIntersections(pin);
            this.drawPolygon(pin);
            this.removeConstructionLines();
        });
    }

    

    clearPolygons() {
        this.pins.forEach(pin => {
            if (pin.polygon) {
                map.removeElement(pin.polygon);
                pin.polygon = null;
            }
        });
    }

    removeConstructionLines() {
        for (let i = 0; i < this.pins.length; i++) {
            this.pins[i].midLines.forEach(line => {
                if (line.drawn) {
                    map.removeElement(line.drawn);
                    line.drawn = null;
                }
                if (line.intersections) {
                    line.intersections.forEach(intersection => {
                        if (intersection.drawn) {
                            map.removeElement(intersection.drawn);
                            intersection.drawn = null;
                        }
                        intersection.lines = null;
                    });
                    line.intersections = [];
                }
            });
            this.pins[i].midLines = [];
        }
    }

    showMidLines() {
        if (this.pins.length > 30) {
            alert("Too many pins selected. Use Deselect All first");
            return;
        }
        for (let i = 0; i < this.pins.length; i++) {
            let pin = this.pins[i];
            this.findMidLines(pin, true);
        }
    }

    findMidLines(pin, draw=false) {
        pin.midLines = [];
        let pinset = map.nearestPlace(pin.place.loc, pin, 0.3).nearestList;
        for (let j = 0; j < pinset.length; j++) {
            let line = this.perpMidLineEnds(pin.place.loc, pinset[j].pin.place.loc);
            if (draw) line.drawn = map.drawLine(line.p1, line.p2);
            pin.midLines.push(line);
            line.parentPin = pin;
        }
    }

    findIntersections(pin, draw=false) {
        let pinxy = new GeoPoint(pin.place.loc);
        let nearestMidLineIntersection = null;
        let nearestDistanceSq = 1000000.0;
        if (!(pin.midLines && pin.midLines.length)) return;
        for (let i = 0; i < pin.midLines.length; i++) {
            for (let j= i+1; j < pin.midLines.length; j++) {
                let midi = pin.midLines[i];
                let midj = pin.midLines[j];
                let intersection = midi.intersection(midj);
                if (draw) intersection.drawn = map.extraPoint(intersection, 5, "yellow");
                intersection.lines = [midi,midj];
                if (!midi.intersections) midi.intersections = [];
                midi.intersections.push(intersection);
                if (!midj.intersections) midj.intersections = [];
                midj.intersections.push(intersection);
                let distanceSq = intersection.distanceSquared(pinxy);
                if (distanceSq < nearestDistanceSq) {
                    nearestDistanceSq = distanceSq;
                    nearestMidLineIntersection = intersection;
                }
            }
        }
        pin.nearestMidLineIntersection = nearestMidLineIntersection;
    }


    goRoundPolygon(currentLine, currentPoint, origin, direction) {
        let path = [];
        for (let count = 0; count<30; count++) {
            let next = this.findNextIntersection(currentLine,currentPoint,origin, direction);
            if (!next) break;
            path.push(next);
            if(path.length > 1 && next==path[0]) break;
            if(!next.lines) break;
            currentLine = next.lines[0]==currentLine ? next.lines[1] : next.lines[0];
            currentPoint = next;
        }
        return path;
    }

    findPolygon(pin) {
        let origin = new GeoPoint(pin.place.loc);
        if (!(pin.midLines && pin.midLines.length)) return null;
        let currentLine = pin.midLines[0]; // nearest
        let currentPoint = currentLine.midPoint();
        let path = this.goRoundPolygon(currentLine,currentPoint, origin, true);
        if (path.length > 1 && path[0] != path[path.length-1]) {
            let backpath = this.goRoundPolygon(currentLine,currentPoint, origin, false).reverse();
            return backpath.concat(path);
        } else {
            return path;
        }
    }

    drawPolygon(pin) {
        let path = this.findPolygon(pin);
        if (path) {
            pin.polygon = map.drawPolyline(path);
        }
    }

    /**
     * Find the next intersection on a line, working around a pin.
     * @param {GeoLine} line Line on which to find next intersection or line end.
     * @param {GeoPoint} intersection Current intersection on line.
     * @param {Pin} origin Point we're computing orientation against.
     * @param {Boolean} anticlockwise Direction to move around the origin.
     * @returns Null if the current intersection is the end of the line.
     */
    findNextIntersection(line, intersection, origin, anticlockwise = true) {
        if (intersection == line.p1 || intersection == line.p2) return null;
        let next = null;
        let nearestNextDistanceSq = 1000000.0;
        let intersectionWrtOrigin = {x:intersection.x-origin.x, y: intersection.y-origin.y};
        let orientation = (c => ((c.x-origin.x)*intersectionWrtOrigin.y < (c.y-origin.y)*intersectionWrtOrigin.x));
        for (let i=0; i<line.intersections.length; i++) {
            let candidate = line.intersections[i];
            if (intersection == candidate) continue;
            if (anticlockwise == orientation(candidate)) {
                let d = candidate.distanceSquared(intersection);
                if (d < nearestNextDistanceSq) {
                    nearestNextDistanceSq = d;
                    next = candidate;
                }
            }
        }
        if (next == null) {
            if (anticlockwise == orientation(line.p1)) next = line.p1;
            else if (anticlockwise == orientation(line.p2)) next = line.p2;
        }
        return next;
    }


}
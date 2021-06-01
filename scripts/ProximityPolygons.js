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
        // Degrees latitude are always approx 111km:
        this.y = this.n * 111;
        // Degrees longitude are 111km at the equator, but 0 at the poles.
        // LatFactor is between 0 and 1 depending on the latitude:
        this.x = this.e*this.LatFactor * 111;
    }
    setFromKm(x,y) {
        this.x = x;
        this.y = y;
        // Inverse calculation of setFromLatLong:
        this.e = this.x/111/this.LatFactor;
        this.n = this.y/111;
    }
    /** Calculate just once for this session: assume all the points we're dealing with 
    *   are roughly at the same latitude
    */
    get LatFactor () {
        // static var:
        if (!GeoPoint.latFactor) {
            if (!this.n) {
                throw ("First use of GeoPoint should use setFromLatLong");
            }
            // Math.cos expects radians, so convert from degrees:
            GeoPoint.latFactor = Math.cos(this.n / 57.3);
        } 
        return GeoPoint.latFactor;
    }

    /** Distance from another point, squared.
     * Don't bother with sqrt as we're just using it to find nearest. 
     * @param {GeoPoint} p - other point
     */
    distanceSquared(p) {
        let other = p.x ? p : new GeoPoint(p); 
        return (this.x-p.x)*(this.x-p.x) + (this.y-p.y)*(this.y-p.y);
    }
}

/** Represents a line on the ground */
class GeoLine {
    /**
     * 
     * @param {GeoPoint} p1 - a point on the line
     * @param {GeoPoint} p2 - another point on the line
     */
    constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.dx = p2.x - p1.x;
        this.dy = p2.y - p1.y;
    }

    /**
     * The mid-point between p1 and p2 used to construct it.
     * @returns {GeoPoint}
     */
    midPoint() {
        if (!this._mid) this._mid = new GeoPoint({x:(this.p2.x+this.p1.x)/2,y:(this.p2.y+this.p1.y)/2});
        return this._mid;
    }

    /** Calculate the point at which two lines intersect 
     * @param {GeoLine} that - the other line. Mustn't be parallel to this.
     * @returns {GeoPoint}
     * @see https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
    */
    intersection (that) {
        let scale = this.dy*that.dx - this.dx*that.dy;
        let cthis = this.p1.x*this.p2.y - this.p1.y*this.p2.x;
        let cthat = that.p1.x*that.p2.y - that.p1.y*that.p2.x;
        // Throws div by zero if the lines are parallel:
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

    /** A line representing the boundary that is equidistant between two points */
    perpMidLineEnds(p1, p2) {

        let mid = new GeoPoint({ e: (p1.e + p2.e) / 2, n: (p1.n + p2.n) / 2 });
        let dp = new GeoPoint({ e: p1.e - p2.e , n: p1.n - p2.n });

        // Sets the length - a bit rough:
        let extendFactor = 4; 

        // Use x,y to set the new line's points, for equal scale of lat and long:
        let m1 = new GeoPoint({x: mid.x + extendFactor * dp.y, y: mid.y - extendFactor * dp.x});
        let m2 = new GeoPoint({x: mid.x - extendFactor * dp.y, y: mid.y + extendFactor * dp.x});

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

/**
 * Draws polygons around places to show where you're closest to each one.
 * Useful for planning points for a walking tour.
 */
class ProximityPolygons extends LineCalcs {
    constructor(pins) {
        super();
        this.pins = pins || [];
    }

    clear() {
        this.pins = [];
    }

    /** Set the array of places to be dealt with, before processing */
    setSelection(pinsOrPlaces) {
        this.pins = [];
        pinsOrPlaces.forEach(pinOrPlace => {
            let pin = pinOrPlace.place ? pinOrPlace : map.placeToPin[pinOrPlace.id];
            this.pins.push(pin);
            if (!pin.midLines) pin.midLines = [];
        });
    }

    /** Draw polygons around the selection */
    showPolygons(showConstruction = false) {
        if (this.pins.length > 30) {
            alert("Too many pins selected. Use Deselect All first");
            return;
        }
        this.pins.forEach(pin => {
            // Find the midway boundaries between each pair of pins:
            this.findMidLines(pin, showConstruction);
            // Find where the lines intersect:
            this.findIntersections(pin, showConstruction);
            // Draw along the line segments enclosing the pin:
            this.drawPolygon(pin);
            // Don't need the midway boundaries now:
            if (!showConstruction) this.removeConstructionLines();
        });
    }

    /** Remove the polygons from the map */
    clearPolygons() {
        this.pins.forEach(pin => {
            if (pin.polygon) {
                map.removeElement(pin.polygon);
                pin.polygon = null;
            }
        });
    }

    /** Remove the midway boundary lines */
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

    /** Determine the boundary midway between two points */
    findMidLines(pin, draw=false) {
        pin.midLines = [];
        // Find all the places on the map within 300m, nearest first:
        let pinset = map.nearestPlace(pin.place.loc, pin, 0.3).nearestList;
        for (let j = 0; j < pinset.length; j++) {
            // Calculate a line perpendicular to, and halfway along, the line joining the places:
            let line = this.perpMidLineEnds(pin.place.loc, pinset[j].pin.place.loc);
            if (draw) line.drawn = map.drawLine(line.p1, line.p2);
            pin.midLines.push(line);
            line.parentPin = pin;
        }
    }

    /** Find all the points where boundaries around this pin cross.
     * Assume we've already done findMidLines()
     */
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


    /** Create one segment of the polygon surrounding a place. 
     * Assume we've already done findMidLines() and findIntersections()
     * @param {GeoLine} currentLine of which we're following a segment
     * @param {GeoPoint} currentPoint previous intersection we're moving along from
     * @param {GeoPoint} origin The place we're encompassing
     * @param {Boolean} direction True => anticlockwise
     */
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
    
    /** Create a polygon around a given pin.
     * Assume we've done findMidLines() and findIntersections().
     */
    findPolygon(pin) {
        let origin = new GeoPoint(pin.place.loc);
        if (!(pin.midLines && pin.midLines.length)) return null;
        // Nearest mid-boundary will be part of the polygon:
        let currentLine = pin.midLines[0]; 
        // Start at its middle. Because nearest, should be a segment of the polygon:
        let currentPoint = currentLine.midPoint();
        let path = this.goRoundPolygon(currentLine,currentPoint, origin, true);
        // If we've not gone around a full loop, start from the middle again going backwards:
        if (path.length > 1 && path[0] != path[path.length-1]) {
            let backpath = this.goRoundPolygon(currentLine,currentPoint, origin, false).reverse();
            // Prepend the first part to the last:
            return backpath.concat(path);
        } else {
            return path;
        }
    }

    /** Draw a polygon around a given pin. */
    drawPolygon(pin) {
        let path = this.findPolygon(pin);
        if (path) {
            pin.polygon = map.drawPolyline(path);
        }
    }

    /**
     * Find the next intersection on a line, working around a pin.
     * @param {GeoLine} line Line on which to find next intersection or line end.
     * @param {GeoPoint} intersection Current intersection on line; we're going to find the next.
     * @param {Pin} origin Point we're computing orientation against.
     * @param {Boolean} anticlockwise Direction to move around the origin.
     * @returns Null if the current intersection is the end of the line.
     */
    findNextIntersection(line, intersection, origin, anticlockwise = true) {
        // If the current point was set to the end of the line, that means we've previously 
        // run this function and it found no further intersections. So stop here.
        if (intersection == line.p1 || intersection == line.p2) return null;

        let next = null;
        let nearestNextDistanceSq = 1000000.0;
        // Use x,y relative to the point we're navigating around
        let intersectionWrtOrigin = {x:intersection.x-origin.x, y: intersection.y-origin.y};
        // Boolean function to determine which direction a particular point is from the current intersection,
        // in terms of being further clockwise or anticlockwise around the origin point.
        let orientation = (c => ((c.x-origin.x)*intersectionWrtOrigin.y < (c.y-origin.y)*intersectionWrtOrigin.x));
        // Look at all the intersections on this line. Find the nearest that's in the right orientation:
        for (let i=0; i<line.intersections.length; i++) {
            let candidate = line.intersections[i];
            // Ignore the current intersection:
            if (intersection == candidate) continue;
            if (anticlockwise == orientation(candidate)) {
                // Work out which is nearest:
                let d = candidate.distanceSquared(intersection);
                if (d < nearestNextDistanceSq) {
                    nearestNextDistanceSq = d;
                    next = candidate;
                }
            }
        }
        if (next == null) {
            // No more intersections on the new line - try one of its ends instead:
            if (anticlockwise == orientation(line.p1)) next = line.p1;
            else if (anticlockwise == orientation(line.p2)) next = line.p2;
            else {
                // Because the "ends" of a line are rather arbitrary, this intersection
                // was actually beyond the "end"; so that both "ends" are in the wrong direction.
                // So let's just make up a point along the line in the right direction:
                let direction = (anticlockwise == intersectionWrtOrigin.x * intersectionWrtOrigin.dy < 0 ? 1 : -1);
                next = new GeoPoint({x:intersection.x + line.dx*0.1*direction,y: intersection.y + line.dy*0.1*direction});
            }
        }
        return next;
    }


}
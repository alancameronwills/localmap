/*
 * Draw proximity polygons around a set of pins.
 */

/**
 * Represents a point on the ground. Assumes all points are in approximately the same latitude.
 * Converts between degrees lat-long and metres x-y.
 */
class GeoPoint {
    /**
     * @param {*} p Either {e,n} or {x,y}
     * @param {*} origin If defined, create relative to this
     */
    constructor(p, origin) {
        if (p.e) this.setFromLatLong(p.n - (origin ? origin.n : 0), p.e - (origin ? origin.e : 0));
        else this.setFromKm(p.x - (origin ? origin.x : 0), p.y - (origin ? origin.y : 0));
    }
    setFromLatLong(n, e) {
        this.e = e;
        this.n = n;
        // Degrees latitude are always approx 111km:
        this.y = this.n * 111000;
        // Degrees longitude are 111km at the equator, but 0 at the poles.
        // LatFactor is between 0 and 1 depending on the latitude:
        this.x = this.e * this.LatFactor * 111000;
    }
    setFromKm(x, y) {
        this.x = x;
        this.y = y;
        // Inverse calculation of setFromLatLong:
        this.e = this.x / 111000 / this.LatFactor;
        this.n = this.y / 111000;
    }
    /** Calculate just once for this session: assume all the points we're dealing with 
    *   are roughly at the same latitude
    */
    get LatFactor() {
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
        return (this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y);
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
        if (!this._mid) this._mid = new GeoPoint({ x: (this.p2.x + this.p1.x) / 2, y: (this.p2.y + this.p1.y) / 2 });
        return this._mid;
    }

    /** Calculate the point at which two lines intersect 
     * @param {GeoLine} that - the other line. Mustn't be parallel to this.
     * @returns {GeoPoint}
     * @see https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
    */
    intersection(that) {
        let scale = this.dy * that.dx - this.dx * that.dy;
        let cthis = this.p1.x * this.p2.y - this.p1.y * this.p2.x;
        let cthat = that.p1.x * that.p2.y - that.p1.y * that.p2.x;
        // Throws div by zero if the lines are parallel:
        return new GeoPoint({
            x: (cthis * that.dx - cthat * this.dx) / scale,
            y: (cthis * that.dy - cthat * this.dy) / scale
        });
    }

    /** -1 --> p is outside p1, 0 --> p is between p1 and p2, 1 --> p is outside p2
     * @pre p is on line
     */
    whichSegment(p) {
        let dp1 = this.dx * (p.x - this.p1.x) + this.dy * (p.y - this.p1.y);
        let dp2 = this.dx * (p.x - this.p2.x) + this.dy * (p.y - this.p2.y);
        return dp1 < 0 ? -1 : dp2 > 0 ? 1 : 0;
    }

    orientLikeThis(s) {
        let aligned = (this.p1.x < this.p2.x) == (s.p1.x < s.p2.x) ||
            (this.p1.y < this.p2.y) == (s.p1.y < s.p2.y);
        if (aligned) return s;
        else return new GeoLine(s.p2, s.p1);
    }

    /** How far s is from p1, squared; negative if on the other side from p2 */
    distanceAlongLineSquaredSigned(s) {
        let sr = { x: s.x - this.p1.x, y: s.y - this.p1.y };
        return (sr.x * sr.x + sr.y * sr.y) * Math.sign(sr.x * this.p2.x + sr.y * this.p2.y);
    }
}

class PolygonClipper {
    constructor(path, circle) {
        this.circle = circle;
        this.path = path || [];
        this.newPath = [];
        this.lowIx = 0;
        this.highIx = this.path.length - 1;
    }
    copyVertex() {
        if (this.lowIx <= this.highIx) {
            this.newPath.push(this.path[this.lowIx]);
            this.lowIx++;
        }
    }

    /** Create an arc inside a vertex that goes outside the circle */
    bridge() {
        //this.copyVertex();

        if (this.highIx - this.lowIx < 1) {
            this.copyVertex();
            return;
        }
        let startLine = this.lowIx == 0
            ? new GeoLine(this.path[this.highIx - 1], this.path[this.highIx])
            : this.lowIx == 1 && this.newPath.length > 0
                // if this is an open polyline, point 0 may be in an odd place - use our last point instead:
                ? new GeoLine(this.newPath[this.newPath.length - 1], this.path[this.lowIx])
                : new GeoLine(this.path[this.lowIx - 1], this.path[this.lowIx]);
        let fromPoint = this.circle.intersectionPoint(startLine, true, false);
        if (!fromPoint) {
            this.copyVertex();
            return;
        }
        let currentVertex = this.lowIx;
        let toLine = null;
        let toPoint = null;
        while (toPoint == null && currentVertex < this.highIx) {
            toLine = new GeoLine(this.path[currentVertex], this.path[currentVertex + 1]);
            toPoint = this.circle.intersectionPoint(toLine, false, false);
            currentVertex++;
        }
        this.circle.appendArc(this.newPath, fromPoint, toLine);
        this.lowIx = currentVertex;

    }

    /** Create an arc between the ends of an open polyline */
    joinAcross(trimPolygon = true) {
        let fromIx = 0, toIx = 0, fromPoint = null, toPoint = null, toLine = null;
        if (this.path && this.highIx >= this.lowIx + 1) {
            // Find where the circle intersects the path, which might not be its current end lines:
            // Starting at the final segment of the polyline, work back until we find an intersection:
            for (fromIx = this.highIx, fromPoint = null; !fromPoint && fromIx > this.lowIx; !fromPoint && fromIx--) {
                fromPoint = this.circle.intersectionPoint(new GeoLine(this.path[fromIx - 1], this.path[fromIx]), true, this.highIx == fromIx && 2);
            }
            // Starting at the first segment of the polyline, work forward until we find an intersection:
            for (toIx = this.lowIx, toPoint = null; !toPoint && toIx < this.path.length - 1; !toPoint && toIx++) {
                toLine = new GeoLine(this.path[toIx], this.path[toIx + 1]);
                toPoint = this.circle.intersectionPoint(toLine, false, toIx == this.lowIx && 1);
            }
            // Trim the polyline to drop the segments before and after the intersections with the circle:
            this.lowIx = toIx;
            this.highIx = fromIx;
        }
        fromPoint = fromPoint || { x: this.circle.radius + this.circle.centre.x, y: this.circle.centre.y };
        // Join the path ends with part of the circle:
        this.circle.appendArc(this.newPath, fromPoint, toLine);

        // Copy the first vertex of the old polyline across:
        if (this.lowIx <= this.highIx) {
            if (toPoint && trimPolygon)
                // Adjust the path start to meet the circle:
                this.newPath.push(new GeoPoint(toPoint));
            else
                // Copy the path start to the new path:
                this.newPath.push(this.path[this.lowIx]);
            // ... and move on ready to process the next vertex:
            this.lowIx++;
        }
    }

    closePath() {
        this.newPath[this.newPath.length - 1] = this.newPath[0];
        return this.newPath;
    }
}

class GeoCircle {
    constructor(centre, radius, title) {
        this.radius = parseInt(radius);
        this.radiusSquared = this.radius * this.radius;
        this.centre = centre;
        this.title = title;
    }

    isOutside(point) {
        return this.centre.distanceSquared(point) > this.radiusSquared;
    }


    appendArc(path, fromPoint, toLine) {
        const degreeStep = 1;
        const incrementRoot = (-360 / degreeStep) / (2 * Math.PI);
        let x = fromPoint.x - this.centre.x;
        let y = fromPoint.y - this.centre.y;
        for (var i = 0; i < 360; i += degreeStep) {
            if (i > 0 && toLine && (x + this.centre.x - toLine.p1.x) * toLine.dy > (y + this.centre.y - toLine.p1.y) * toLine.dx) {
                break;
            }
            path.push(new GeoPoint({ x: x + this.centre.x, y: y + this.centre.y }));
            y = y - x / incrementRoot;
            x = x + y / incrementRoot;
        }
    }

    /** Intersection point on a line such that the circle then runs in a given direction */
    intersectionPoint(line, anticlockwise, openEnd) {
        let secant = line && this.intersection(line);
        if (!secant) return null;
        // Secant is the stretch of line between its two crossings of the circle.
        // The point we want is one end or the other:
        secant = line.orientLikeThis(secant);
        let point = anticlockwise ? secant.p2 : secant.p1;

        // Is the point actually in a part of the line that's in the polygon?
        let segment = line.whichSegment(point);
        if (openEnd) {
            // One of the points doesn't matter because it's the end of the path
            let isOnCorrectSideOfInnerPoint =
                segment == 0 ||
                // if anticlockwise, it's OK if point is beyond p2:
                anticlockwise == (segment > 0);
            if (!isOnCorrectSideOfInnerPoint) return null;
        } else {
            // intersection must be between endpoints of line
            if (segment != 0) return null;
        }
        return point;
    }

    /**
     * The intersection points of a line and the circle
     * @param {GeoLine} line 
     * @returns GeoLine whose endpoints are the intersections
     * @see https://mathworld.wolfram.com/Circle-LineIntersection.html
     */
    intersection(line) {
        // Shift coords so that circle is centred at origin:
        let LR = new GeoLine(new GeoPoint(line.p1, this.centre), new GeoPoint(line.p2, this.centre));
        let D = LR.p1.x * LR.p2.y - LR.p2.x * LR.p1.y;
        let LRlensq = (LR.dy * LR.dy + LR.dx * LR.dx);
        if (this.radius * this.radius * LRlensq < D * D) return null; // Line doesn't cross circle
        let RDD = Math.sqrt(this.radius * this.radius * LRlensq - D * D);
        let i1 = new GeoPoint({
            x: (D * LR.dy + Math.sign(LR.dy) * LR.dx * RDD) / LRlensq + this.centre.x,
            y: (-D * LR.dx + Math.abs(LR.dy) * RDD) / LRlensq + this.centre.y
        });
        let i2 = new GeoPoint({
            x: (D * LR.dy - Math.sign(LR.dy) * LR.dx * RDD) / LRlensq + this.centre.x,
            y: (-D * LR.dx - Math.abs(LR.dy) * RDD) / LRlensq + this.centre.y
        });
        return new GeoLine(i1, i2)
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
        let dp = new GeoPoint({ e: p1.e - p2.e, n: p1.n - p2.n });

        // Sets the length - a bit rough:
        let extendFactor = 4;

        // Use x,y to set the new line's points, for equal scale of lat and long:
        let m1 = new GeoPoint({ x: mid.x + extendFactor * dp.y, y: mid.y - extendFactor * dp.x });
        let m2 = new GeoPoint({ x: mid.x - extendFactor * dp.y, y: mid.y + extendFactor * dp.x });

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
        this.defaultRange = 100; // 100m
        this.pins = pins || [];
        this.donePins = [];
        this.drawnMarkers = [];
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
    showPolygons(showConstruction = false, noTrimPolygon = false) {
        if (this.pins.length > 100) {
            alert("Too many pins selected. Use Deselect All first");
            return;
        }
        this.pins.forEach(pin => {
            this.donePins.push(pin);
            // Find the midway boundaries between each pair of pins:
            this.findMidLines(pin, showConstruction);
            // Find where the lines intersect:
            this.findIntersections(pin, showConstruction);
            // Draw along the line segments enclosing the pin:
            this.drawPolygon(pin);
            // Don't need the midway boundaries now:
            if (!showConstruction) this.removeConstructionLines();

            this.clickHandler = window.map.onclick((loc, event) => this.mapClicked(loc, event));
            window.paused = false;
            window.Cypress = window.Cypress || true;
            g("target").classList.add("targetShift");
        });
    }

    /** Remove the polygons from the map */
    clearPolygons() {
        this.drawnMarkers.forEach(p => map.removeElement(p));
        this.drawnMarkers = [];
        
        this.removeConstructionLines();

        window.map.removeHandler(this.clickHandler);
        window.paused = true;
    }

    mapClicked(loc, event) {
        updatePosition({coords:{longitude:loc.e, latitude:loc.n}});
    }



    /** Remove the midway boundary lines */
    removeConstructionLines() {
        for (let i = 0; i < this.donePins.length; i++) {
            this.donePins[i].midLines.forEach(line => {
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
            this.donePins[i].midLines = [];
        }
        this.donePins = [];
    }

    /** Determine the boundary midway between two points */
    findMidLines(pin, draw = false) {
        pin.midLines = [];
        // Find all the places on the map within 200m, nearest first:
        let pinset = map.nearestPlace(pin.place.loc, false, pin, pin.place.range * 2).nearestList;
        for (let j = 0; j < pinset.length; j++) {
            if (!pinset[j].pin.place) continue;
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
    findIntersections(pin, draw = false) {
        let pinxy = new GeoPoint(pin.place.loc);
        let nearestMidLineIntersection = null;
        let nearestDistanceSq = 1000000000000.0;
        if (!(pin.midLines && pin.midLines.length)) return;
        for (let i = 0; i < pin.midLines.length; i++) {
            for (let j = i + 1; j < pin.midLines.length; j++) {
                let midi = pin.midLines[i];
                let midj = pin.midLines[j];
                let intersection = midi.intersection(midj);
                if (draw) intersection.drawn = map.extraPoint(intersection, 5, "yellow");
                intersection.lines = [midi, midj];
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
        for (let count = 0; count < 30; count++) {
            let next = this.findNextIntersection(currentLine, currentPoint, origin, direction);
            if (!next) break;
            path.push(next);
            if (path.length > 1 && next == path[0]) break;
            if (!next.lines) break;
            currentLine = next.lines[0] == currentLine ? next.lines[1] : next.lines[0];
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
        let path = this.goRoundPolygon(currentLine, currentPoint, origin, true);
        // If we've not gone around a full loop, start from the middle again going backwards:
        if (path.length <= 1 || path[0] != path[path.length - 1]) {
            let backpath = this.goRoundPolygon(currentLine, currentPoint, origin, false).reverse();
            // Prepend the first part to the last:
            return backpath.concat(path);
        } else {
            return path;
        }
    }

    /** Draw a polygon around a given pin. */
    drawPolygon(pin) {
        let path = this.findPolygon(pin);
        let origin = new GeoPoint(pin.place.loc);
        let circle = new GeoCircle(origin, pin.place.range || this.defaultRange, pin.place.Title);
        path = this.clipPolygonWithCircle(path, circle);

        this.drawnMarkers.push(map.drawPolyline(path));


    }

    /** Create a path that follows the innermost of circle and polygon
     * @param {Array(GeoPoint)} path Polyline. Points should be in anticlockwise order around the centre of the circle.
     */
    clipPolygonWithCircle(path, circle) {
        let clipper = new PolygonClipper(path, circle);
        if (!path || path[0] != path[path.length - 1]) {
            // This is an open polyline. Join the ends with an arc:
            clipper.joinAcross();
        }
        while (clipper.lowIx <= clipper.highIx) {
            if (circle.isOutside(path[clipper.lowIx])) {
                clipper.bridge();
            } else {
                clipper.copyVertex();
            }
        }
        return clipper.closePath();
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
        let intersectionWrtOrigin = { x: intersection.x - origin.x, y: intersection.y - origin.y };
        // Boolean function to determine which direction a particular point is from the current intersection,
        // in terms of being further clockwise or anticlockwise around the origin point.
        let orientation = (c => ((c.x - origin.x) * intersectionWrtOrigin.y < (c.y - origin.y) * intersectionWrtOrigin.x));
        // Look at all the intersections on this line. Find the nearest that's in the right orientation:
        if (line.intersections) for (let i = 0; i < line.intersections.length; i++) {
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
                next = new GeoPoint({ x: intersection.x + line.dx * 0.1 * direction, y: intersection.y + line.dy * 0.1 * direction });
            }
        }
        return next;
    }


}
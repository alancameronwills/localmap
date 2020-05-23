
var cookies;
var ui;
var game;

function g(s) { return document.getElementById(s); }

/** Persist strings between sessions. */
class Cookies {
    /** Persist a string.
     * @param cookieName {string}
     * @param cookieValue {string}
     * @param expiryDays {int} How long to keep the cookie. Default 30.
     */
    Set(cookieName, cookieValue, expiryDays) {
        if (!expiryDays) expiryDays = 30;
        var d = new Date();
        d.setTime(d.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
        document.cookie = cookieName + "=" + cookieValue + "; expires=" + d.toUTCString();
    }
    /** Retrieve. Returns null if not found. */
    Get(cookieName) {
        var name = cookieName + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
}


/** Most(!) of the manipulation of what's on the screen.
 * Also routing of keystrokes.
  */
class UI {
    constructor() {
        this.keyStrokeReceivers = [];
        document.body.addEventListener("keydown", (event) => { ui.Key(event); });
        this.bigTipsShown = {};
    }

    // Keystroke routing ===============

    RegisterKeyStrokeReceiver(receiver) {
        this.keyStrokeReceivers.push(receiver);
    }
    RemoveKeyStrokeReceiver(receiver) {
        this.keyStrokeReceivers.pop();
    }

    Key(event) {
        // Send key to the last registered, then work down
        // until one returns null or false
        for (var i = this.keyStrokeReceivers.length - 1; i >= 0; i--) {
            if (!this.keyStrokeReceivers[i].KeyStroke(event.key)) {
                break;
            }
        }

    }

    EnterKey() {
        this.Key({ key: "Enter" });
    }

    /**
     * Connect an element of the UI to a handler in an object
     * @param {string} elementId 
     * @param {Object} listener 
     * @param {string} eventId 
     * @param {fn(event)} handler 
     */
    AddListener(elementId, listener, eventName, handler) {
        let element = g(elementId);
        element.uilistener = listener;
        element.addEventListener(eventName, e => handler(e, element.uilistener));
    }

    // ================================
    //
    // Display various fields on page
    //

    SetBestTime(t, emphasize) {
        if (t) {
            g("bestTimeUI").innerHTML = "" + t;
            g("bestTimeUI").style.backgroundColor =
                emphasize ? "darkgreen" : "transparent";
            g("bestUI").style.display = "inline"; // is a span, so inline    
        } else {
            ui.Hide("bestUI");
        }
    }
    SetElapsed(t) {
        g("timeUI").innerHTML = "" + t;
    }
    SetEggCount(popped, total) {
        g("eggsFoundUI").innerHTML = "" + popped;
        g("eggCountUI").innerHTML = "" + total;
        if (popped >= total) {
            g("eggsFoundUI").style.backgroundColor = "green";
        } else {
            g("eggsFoundUI").style.backgroundColor = "transparent";
        }
    }
    AlarmEggCount() {
        g("eggsFoundUI").style.backgroundColor = "orange";
    }
    EndGame() {
        g("eggsFoundUI").style.backgroundColor = "transparent";
        g("timeUI").style.backgroundColor = "green";
        g("tipsBar").innerHTML = "Whoohooo!!!";
        g("playAgainButton").style.display = "block";
        g("bottomBar").className = "endThings";
    }
    SetUserNameAndLevelName(name, level) {
        g("uidUI").value = name;
        g("userNameUI").innerHTML = name;
        g("levelUI").innerHTML = level;
    }
    SetLevelSelector(previousQuizLevel, levelSelectors) {
        let optionList = "";
        for (var i = 0; i < levelSelectors.length; i++) {
            let s = i == previousQuizLevel ? "selected" : "";
            optionList += `<option ${s}>${levelSelectors[i]}</option>`;
        }
        g("levelSelector").innerHTML = optionList;
    }
    GetNameAndLevel() {
        return {
            name: g("uidUI").value.replace(/[|]/g, "").substring(0, 20).trim(),
            level: g("levelSelector").selectedIndex
        };
    }

    ShowLeaders(leaders) {
        let level = g("levelUI").innerText;
        let t = `<u>${level}</u> <table>`;
        for (let i = 0; i < leaders.length; i++) {
            t += `<tr><td>${leaders[i].name}</td><td>${leaders[i].time}</td></tr>`;
        }
        t += "</table><br/>";
        g("leaderUI").innerHTML = t;
    }

    Hide(elementName) {
        g(elementName).style.display = "none";
    }

    ActivateButton(button, ok = true) {
        g(button).className = ok ? "bigButton" : "inactiveButton";
    }

    /** Fudge to make bottom bar line up with maze image.
        * There's probably a better way of doing this.
    */
    fixTableWidth() {
        g("bottomBar").style.width = g("mazeImg").width + "px";
    }

    ShowTips() {
        g("tipsBar").style.display = "block";
        this.showBigTips = true;
    }

    Tip(s) {
        g("tipsBar").innerHTML = s;
        if (this.showBigTips) {
            if (!this.bigTipsShown[s]) {
                this.bigTipsShown[s] = true;
                g("bigTip").innerHTML = s;
                g("bigTip").style.display = "block";
                setTimeout(() => ui.Hide("bigTip"), 3000);
            }
        }
    }

    FrontMessage(m) {
        g("frontMessage").innerHTML = m;
        g("frontMessage").style.display = m ? "block" : "none";
    }

    clickAnswer(i) { this.Key({ key: "" + i }) }
}

/** Displays a question and selects the answer. */
class QuestionUI {
    /**
     * 
     * @param {Question} q 
     * @param {string} text - Question text
     * @param {string} aa - Array of answers. aa[n].a == answer; aa[n].c == correct
     * @param {string} pic - End of URI
     */
    constructor(q, text, aa, pic) {
        ui.RegisterKeyStrokeReceiver(this);
        let qtext = text;
        qtext += "<ol>";
        for (var i = 0; i < aa.length; i++) {
            qtext += `<li onclick=ui.clickAnswer(${i + 1}) id='qa${i + 1}'>${aa[i].a}</li>`;
        }
        qtext += "</ol>";
        g("qtext").innerHTML = qtext;
        g("qimg").src = pic ? "images/" + pic : "";
        g("qbox").style.display = "block";
        this.currentQuestion = q;
        this.selectedAnswer = 0;
        this.answerCount = aa.length;
        ui.Tip("Arrow up/down to select, then Enter");
    }


    /**
     * Called per keystroke when there is a currentQuestion.
     * 
     */
    KeyStroke(key) {
        switch (key) {
            case "Enter":
                this.currentQuestion.Answer(this.selectedAnswer);
                this.closeQuestion();
                break;
            case "ArrowDown": case "s": case "S":
                this.highlightAnswer(this.selectedAnswer % this.answerCount + 1);
                break;
            case "ArrowUp": case "w": case "W":
                this.highlightAnswer((this.selectedAnswer + this.answerCount - 2) % this.answerCount + 1);
                break;
            case "1": case "2": case "3": case "4":
                this.selectedAnswer = parseInt(key);
                this.currentQuestion.Answer(this.selectedAnswer);
                this.closeQuestion();
                break;
            case "ArrowLeft": case "ArrowRight": case "a": case "A": case "d": case "D":
                break;
            default: return true;
        }
    }

    closeQuestion() {
        ui.Hide("qbox");
        ui.RemoveKeyStrokeReceiver(this);

        // Avoid old pic showing up briefly while new one loads:
        g("qimg").src = "";
        g("qtext").innerHTML = "";
    }

    highlightAnswer(i) {
        if (this.selectedAnswer > 0) {
            g("qa" + this.selectedAnswer).style.borderWidth = "0px";
        }
        this.selectedAnswer = i;
        g("qa" + this.selectedAnswer).style.border = "1px solid red";
    }
}



var qui;
/**
 * Represents a multiple-choice question.
 */
class Question {
    /** Display the question. Caller can await for the user's answer. */
    async PopIt() {
        qui = new QuestionUI(this, this.q, this.aa, this.pic);
        return new Promise((resolve, reject) => {
            this.answerCallback = resolve;
        })
    }

    /** Call when user selects an answer. Resolves the Promise, continues the awaiting code. */
    Answer(aindex) {
        if (this.answerCallback) {
            // selectedAnswer ranges 1..length
            this.answerCallback(aindex > 0 &&
                this.aa[aindex - 1].c);
            this.answerCallback = null;
        }
    }
}

/** A set of questions partitioned into different levels. 
 * @property level {int} - Currently chosen level. 0 == no questions, just find the eggs; 1-3 are sets of questions 
 * @property levelSelectors {string[]} - Level names displayed in selector UI
 * @property levelShows {string[]} - Short level names 
 * @property questions {Question[][]} - List of levels, each of which is Question[]
*/
class Quiz {
    constructor() {
        this.levelSelectors = ["No questions", "Nice questions", "Interesting questions", "Impossible questions"];
        this.levelShows = ["No questions", "Nice", "Interesting", "Impossible"];
        this.questions = [];
        this.level = 0; // Level 0 == no questions, just find the eggs.
        this.getQuestions();
    }
    /** Private initializer */
    async getQuestionsX() {
        this.questions = await fetch("questions.json")
            .then(r => r.json())
            .then(qq => {
                for (var i = 0; i < qq.length; i++) {
                    for (var j = 0; j < qq[i].length; j++) {
                        qq[i][j].__proto__ = Question.prototype;
                    }
                }
                return qq;
            })
    }

    /**
     * Get a question in the current level
     * @param {int} i - index of a question in the current level
     */
    Question(i) {
        if (this.level < 1) return null;
        return this.questions[this.level - 1][i];
    }

    /**
     * Set the initial selection in the level selector UI
     * @param {int} level 
     */
    SetLevelSelector(level) {
        ui.SetLevelSelector(level, this.levelSelectors);
    }

    /** Read from Excel exported to text
     * Expected columns, first row is header: Level	Egg	Q	A#	A#	A#	Correct	Pic
     */
    async getQuestions() {
        this.questions = [[], [], []];
        let rows = await TSVread("questions.txt");
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let level = parseInt(row.Level);
            if (level < 1 || level > 3) continue;
            let q = new Question();
            q.q = row.Q;
            q.aa = row.A.map(x => { return { a: x } });
            let correct = parseInt(row.Correct) - 1;
            if (!q.q || isNaN(correct) || correct < 0 || correct >= q.aa.length) continue;
            q.aa[correct].c = true;
            q.pic = row.Pic;
            this.questions[level - 1].push(q);
        }
    }

}

async function TSVread(url) {
    return await fetch(url)
        .then(data => data.text())
        .then(data => {
            let items = [];
            let rows = data.split("\n");
            let fieldNames = null;
            if (rows.length == 0) return null;
            for (let i = 0; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                let ff = rows[i].split("\t");
                if (ff.length < 5) continue;
                if (!fieldNames) fieldNames = ff.map(f => f.trim()).filter(x => x.length > 0);
                else {
                    let item = {};
                    for (let j = 0; j < Math.min(ff.length, fieldNames.length); j++) {
                        let cell = ff[j].replace(/"/g, "").trim();
                        let fn = fieldNames[j];
                        if (fn.endsWith("#")) {
                            fn = fn.substring(0, fn.length - 1);
                            if (!item[fn]) item[fn] = [];
                            item[fn].push(cell);
                        } else {
                            item[fn] = cell;
                        }
                    }
                    items.push(item);
                }
            }
            return items;
        });
}


/** The sprite */
class Bunny {
    constructor(game) {
        this.sprite = g("bunny");
        this.setGlyph("bunnyR");
        this.game = game;
        this.lastMove = [0, 0, null]; // x,y, orientation
    }

    Move(direction) {
        switch (direction) {
            case "R": this.lastMove = [10, 0, "bunnyR"]; break;
            case "L": this.lastMove = [-10, 0, "bunnyL"]; break;
            case "D": this.lastMove = [0, 10, "bunnyD"]; break;
            case "U": this.lastMove = [0, -10, "bunnyU"]; break;
            default: return;
        }
        this.moveBy(this.lastMove);
    }

    Reverse() {
        this.moveBy([0 - this.lastMove[0], 0 - this.lastMove[1], null]);
    }

    moveBy(m) {
        if (m[0] != 0) { //x
            this.sprite.style.left = this.sprite.offsetLeft + m[0] + "px";
        }
        if (m[1] != 0) { //y
            this.sprite.style.top = this.sprite.offsetTop + m[1] + "px";
        }
        if (m[2]) { // orientation
            this.setGlyph(m[2]);
            if (this.moveTimeout) clearTimeout(this.moveTimeout);
            this.moveTimeout = setTimeout(() => this.setGlyph(m[2]+"S"), 1000);
        }
    }

    /** Set the bunny's facing direction by switching on the appropriate pic */
    setGlyph(glyphName) {
        let glyph = g(glyphName);
        if (this.currentGlyph) this.currentGlyph.style.display = "none";
        this.currentGlyph = glyph;
        this.currentGlyph.style.display = "block";
    }

    /** Are we at a wall, egg, or exit? If so, do the appropriate. */
    Encounter(thing) {
        if (this.intersects(thing.b)) {
            thing.Bump(this); // Polymorphic - depends on type of thing
        }
    }

    /** Is the bunny on a wall etc?
     */
    intersects(bounds) {
        // Some size & offset adjustments to allow passage with bigger icon
        return this.sprite.offsetLeft + this.sprite.clientWidth - 20 > bounds.x
            && this.sprite.offsetLeft + 10 < bounds.x + bounds.width
            && this.sprite.offsetTop + this.sprite.clientHeight - 20 > bounds.y
            && this.sprite.offsetTop + 10 < bounds.y + bounds.height;
    }
}

//
// Things =============================
//
// All have bounds, as read from file
//

class Wall {

    /** The wall is already drawn on the background, so no init to do */
    init(game) {

    }
    Bump(bunny) {
        bunny.Reverse();
    }
}

class Exit {
    init(game) {
        this.game = game;
    }
    Bump(bunny) {
        this.game.BunnyAtExit();
    }
}


class Egg {
    /** Draw an egg at the location specified by the bounds. */
    init(game) {
        this.game = game;
        this.index = game.AddEgg(this);
        this.egg = document.createElement("img");
        g("eggsLayer").append(this.egg);
        this.egg.title = "" + this.index;
        this.egg.src = `images/egg${(this.index) % 10}.png`;
        this.egg.style.position = "absolute";
        this.egg.style.width = this.b.width + "px";
        this.egg.style.height = this.b.height + "px";
        this.egg.style.left = (this.b.x + 10) + "px";
        this.egg.style.top = (this.b.y + 10) + "px";

        this.isPopped = false;
    }
    Bump(bunny) {
        this.popEgg(bunny);
    }
    /** Bunny has hit an egg
     */
    async popEgg(bunny) {
        if (this.isPopped) return; // Been here already
        else {
            let question = this.game.quiz.Question(this.index);
            if (question) {
                // Ask q, and wait for user's answer:
                let correct = await question.PopIt();
                if (correct) {
                    this.popped();
                    ui.Tip("Correct! On to the next ...");
                } else {
                    bunny.Reverse();
                    ui.Tip("Try again...");
                    // User can move onto egg again
                }
            } else {
                this.popped();
            }
        }
    }

    /** Bunny successfully visited this egg. */
    popped() {
        this.isPopped = true;
        this.egg.src = "images/Gold Coin.png";
        let allGot = this.game.UpdatePoppedEggCount();

        ui.Tip(allGot ? "Got all the eggs! Now head for the eggsit!" : "Got one... on to the next!");
    }
}

/** The user
 * @property name {string} - From cookie or supplied by user
 * @property quizLevel {int} - From cookie or selected by user
 */
class Player {
    /** At initial setup, prompt with previous user and level from cookie */
    constructor() {
        let previous = cookies.Get("previousUser") || "|0";
        if (previous) {
            let previousSplit = previous.split("|");
            this.name = previousSplit[0];
            this.quizLevel = parseInt(previousSplit[1]) || 0;
            this.userOriginCode = previousSplit[2] || "" + Date.now();
        } else {
            this.userOriginCode = "" + Date.now();
        }
    }

    userLevelCode() {return this.name + "|" + this.quizLevel + "|" + this.userOriginCode; }

    /** Update name and selected quiz level from front page. Get previous best time. */
    SetNameAndLevel(name, level) {
        this.name = name;
        this.quizLevel = level;
        cookies.Set("previousUser", this.userLevelCode());
        let bestTimeAndOriginCode = cookies.Get(this.userLevelCode().toLowerCase());
        if (bestTimeAndOriginCode) {
            let btoc = bestTimeAndOriginCode.split(" ");
            this.bestTime = parseInt(btoc[0]);
        } else {
            ui.ShowTips(); // new player
            ui.Tip("Use arrow keys to move around. Collect all the eggs, then exit");
        }
        ui.SetBestTime(this.bestTime);
    }

    /** End of game, record time */
    CompletedTime(t) {
        if (this.bestTime) {
            if (t < this.bestTime) {
                this.setBestTime(t, this.quizLevel, true);
            }
        } else {
            this.setBestTime(t, this.quizLevel);
        }
        this.getLeaderBoard();
    }

    setBestTime(t, emphasize) {
        this.bestTime = t;
        ui.SetBestTime(t, emphasize);
        if (t && this.name) {
            cookies.Set(this.userLevelCode().toLowerCase(), t);
        }
    }

    getLeaderBoard() {
        let uid = this.userOriginCode + this.name.toLowerCase();
        fetch(`https://deep-map.azurewebsites.net/api/mazeleader?`
            + `level=${this.quizLevel}&uid=${uid}&name=${this.name}&time=${this.bestTime}`)
            .then(r => r.json())
            .then(r => {
                let table = r.map(row => { return { name: row.Name._, time: row.Time._ } });
                table.sort((a, b) => a.time - b.time);
                let ifirst = 0; let ilast = Math.min(6,table.length - 1);
                let meix = table.findIndex(x => x.name == this.name);
                if (meix >= 0) {
                    ifirst = Math.max(0, meix - 2);
                    ilast = Math.min(table.length, meix + 4);
                }
                ui.ShowLeaders(table.slice(ifirst, ilast));
            });
    }

}

/** Form to supply name and select quiz level */
class FrontPage {
    constructor(game) {
        this.EnterButtonActive = false;
        this.game = game;
        ui.RegisterKeyStrokeReceiver(this);
        if (this.tooSmall()) {
            ui.FrontMessage("This app works best in a bigger window than this, on a computer with a keyboard");
            let sizeChecker = setInterval((e, o) => {
                if (!this.tooSmall()) {
                    ui.FrontMessage("");
                    clearInterval(sizeChecker);
                    this.TryActivateEnterButton();
                }
            }, 500);
        }
        ui.AddListener("uidUI", this, "keyup", (e, fp) => fp.TryActivateEnterButton());
        this.TryActivateEnterButton();
    }

    TryActivateEnterButton() {
        let shouldBeActive = !this.tooSmall() && g("uidUI").value;
        if (shouldBeActive != this.EnterButtonActive) {
            this.EnterButtonActive = shouldBeActive;
            ui.ActivateButton("enterMazeButton", shouldBeActive);
        }
    }

    tooSmall() { return window.innerWidth < 900 || window.innerHeight < 600; }

    KeyStroke(key) {
        if (key == "Enter") {
            this.EnterMaze();
        } else return true;
    }

    EnterMaze() {
        if (!this.EnterButtonActive) return;
        ui.RemoveKeyStrokeReceiver(this);
        this.game.SetNameAndLevel(ui.GetNameAndLevel());
        ui.Hide("frontScreen");
        this.game.Start();
    }
}

/** Main class */
class Game {
    constructor() {
        this.bunny = new Bunny(this);
        this.quiz = new Quiz();
        this.player = new Player();
        ui.SetUserNameAndLevelName(this.player.name, "");
        this.frontPage = new FrontPage(this);
        ui.SetLevelSelector(this.player.quizLevel, this.quiz.levelSelectors);
        this.elapsed = 0;
        this.loadWalls();
        this.keyMeanings = {
            "ArrowRight": "R", "d": "R", "D": "R",
            "ArrowLeft": "L", "a": "L", "A": "L",
            "ArrowDown": "D", "s": "D", "S": "D",
            "ArrowUp": "U", "w": "U", "W": "U"
        };
        this.isComplete = false;
    }
    SetNameAndLevel(nameAndLevel) {
        this.player.SetNameAndLevel(nameAndLevel.name, nameAndLevel.level);
        ui.SetUserNameAndLevelName(nameAndLevel.name, this.quiz.levelShows[nameAndLevel.level]);
    }

    Start() {
        ui.fixTableWidth();
        ui.RegisterKeyStrokeReceiver(this);
        this.quiz.level = this.player.quizLevel;
        this.showEggs();

        this.startTime = Date.now();
        this.timer = setInterval(e => { // Do this every second:
            this.SetElapsed(this.timeElapsed());
        }, 1000);
    }

    /** 
     * @private
     */
    timeElapsed() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
    SetElapsed(t) {
        this.elapsed = t;
        ui.SetElapsed(t);
    }

    /** Bunny has arrived at the exit. */
    BunnyAtExit() {
        if (this.UpdatePoppedEggCount()) {
            this.Complete();
        } else {
            ui.AlarmEggCount();
            ui.Tip("You haven't got all the eggs yet - go back in");
        }
    }

    Complete() {
        if (this.isComplete) return;
        this.isComplete = true;
        clearInterval(this.timer);
        this.player.CompletedTime(this.elapsed, this.quiz.level);
        this.restarter = new Restarter();
    }

    /** Get the list of walls, eggs, exit.
     */
    loadWalls() {
        this.eggBasket = [];
        fetch("walls.json") // load file
            .then(r => r.json()) // convert to structure from JSON
            .then(data => {
                // Turn it into a list of typed objects
                this.things = data;
                for (var i = 0; i < data.length; i++) {
                    switch (data[i].t) {
                        case "wall":
                            data[i].__proto__ = Wall.prototype;
                            break;
                        case "egg":
                            data[i].__proto__ = Egg.prototype;
                            break;
                        case "end":
                            data[i].__proto__ = Exit.prototype;
                            break;
                    }
                    data[i].init(this);
                }
            });
    }

    AddEgg(egg) {
        let index = this.eggBasket.length;
        this.eggBasket.push(egg);
        return index;
    }

    /** Display the eggs prescribed in walls.json
    */
    showEggs() {
        this.UpdatePoppedEggCount();
    }

    /** Keep the UI up to date. Returns true if all eggs collected. */
    UpdatePoppedEggCount() {
        let count = this.eggBasket.filter(e => e.isPopped).length;
        if (window.location.hostname == "localhost") count += 9;
        ui.SetEggCount(count, this.eggBasket.length);
        return count >= this.eggBasket.length;
    }

    KeyStroke(key) {
        this.bunny.Move(this.keyMeanings[key]);
        this.encounters(this.bunny);
    }

    encounters(bunny) {
        for (var i = 0; i < this.things.length; i++) {
            if (bunny.Encounter(this.things[i])) break;
        }
    }
}

class Restarter {
    constructor() {
        ui.RegisterKeyStrokeReceiver(this);
        ui.EndGame();
    }
    KeyStroke(key) {
        if (key == "Enter") {
            playAgain();
        }
        else return true;
    }
}

function playAgain() {
    location.reload();
}

/** Called on page load */
function init() {
    cookies = new Cookies();
    ui = new UI();
    game = new Game();
}

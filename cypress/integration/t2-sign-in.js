import { MapTest } from "../bits/MapTest.js";

describe("Add, edit, delete places", function () {

    it("Add, edit, delete a place", function () {
        let mapTest = new MapTest(this);
        // Initial place - don't change this place:
        mapTest.indexContains("Modern meridian", 1);
        // Shift map a bit to avoid stacking places:
        mapTest.addPlaceAtPostcode("SE10 8XJ", (editorTest) => {
            editorTest.textInput("Test item 1", "petri");
        });
        mapTest.indexContains("Test item 1", 2);

        // Check it's still there when we refresh:
        mapTest.visit();

        mapTest.openEditorFromIndex("Test item 1", (editorTest) => {
            editorTest.textInput("Updated item 1");
            // But at first, still got the old search term, so index is empty:
            //mapTest.indexContains(null, 0);
        });

        // Check the index has changed:
        // Clear the index search and check again:
        mapTest.indexContains("Updated item 1", 2);

        // Find and edit the place we created previously:
        mapTest.openEditorFromIndex("Updated item", (editorTest) => {
            // Delete all its text:
            editorTest.textInput("{del}");
        });
        // Place is gone from index:
        mapTest.indexContains("Modern meridian", 1);

        // Check it's still like that after refresh:
        mapTest.visit();
        mapTest.indexContains("Modern meridian", 1);
    });

    it("Add a place with right click", function() {
        let mapTest = new MapTest(this);
        mapTest.addPlaceAtCentre((editorTest)=>{
            editorTest.textInput("Test item 2", "ego");
        });
        mapTest.indexContains("Test item 2", 2);
        // Find and edit the place we created previously:
        mapTest.openEditorFromIndex("Test item 2", (editorTest) => {
            // Delete all its text:
            editorTest.textInput("{del}");
        });
        mapTest.indexContains("Modern meridian", 1);
    });

})
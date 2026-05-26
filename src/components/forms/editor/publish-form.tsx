"use client";

export function PublishForm() {
    return(
        <div>
           <form id="publish-manuscript">
                <h2>Publish Manuscript</h2>

                <label>Select Manuscript</label>
                <select name="manuscriptId" required>
                    <option>Select Accepted Manuscript</option>
                </select>

                <label>Issue Number</label>
                <input type="text" name="issue" required/>

                <label>Volume</label>
                <input type="text" name="volume" required/>

                <label>Publication Date</label>
                <input type="date" name="date" required/>

                <button type="submit">Publish</button>
            </form>
 
        </div>
    );
}
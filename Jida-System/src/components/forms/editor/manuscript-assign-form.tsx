"use client";

export function ManuscriptAssignForm() {
    return(
        <div>
            <form id="assign-reviewer">
                <h2>Assign Reviewer</h2>

                <label>Manuscript</label>
                <select name="manuscriptId" required>
                    <option>Select Manuscript</option>
                </select>

                <label>Select Reviewer</label>
                <select name="reviewerId" required>
                    <option>Select Reviewer</option>
                </select>

                <label>Review Deadline</label>
                <input type="date" name="deadline" required/>

                <button type="submit">Assign</button>
            </form>
  
        </div>
    );
}
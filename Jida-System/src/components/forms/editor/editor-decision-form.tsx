"use client";

export function EditorDecisionForm() {
    return (
        <div>
            <form id="editor-decision">
                <h2>Editorial Decision</h2>

                <label>Decision</label>
                <select name="decision" required>
                    <option value="">--Select--</option>
                    <option value="accept">Accept</option>
                    <option value="minor">Minor Revision</option>
                    <option value="major">Major Revision</option>
                    <option value="reject">Reject</option>
                </select>

                <label>Comments to Author</label>
                <textarea name="comments" rows={5}></textarea>

                <button type="submit">Submit Decision</button>
            </form>

        </div>
    );
}
"use client";

export function ReviewerEvaluationForm() {
    return (
        <div>
            <form id="review-evaluation">
                <h2>Review Manuscript</h2>

                <label>Comments to Author</label>
                <textarea name="commentsToAuthor" rows={5} required></textarea>

                <label>Comments to Editor</label>
                <textarea name="commentsToEditor" rows={5} required></textarea>

                <label>Recommendation</label>
                <select name="recommendation" required>
                    <option value="">--Select--</option>
                    <option value="accept">Accept</option>
                    <option value="minor-revision">Minor Revision</option>
                    <option value="major-revision">Major Revision</option>
                    <option value="reject">Reject</option>
                </select>

                <label>Upload Annotated PDF (optional)</label>
                <input type="file" name="annotatedFile" accept=".pdf"/>

                    <button type="submit">Submit Review</button>
            </form>

        </div>
    );

}
"use client";

export function ReviewProgressForm() {
    return (
        <div>
            <form id="review-progress">
                <h2>Review Progress</h2>

                <label>Update Status</label>
                <select name="status">
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                </select>

                <button type="submit">Update</button>
            </form>

        </div>
    );
}
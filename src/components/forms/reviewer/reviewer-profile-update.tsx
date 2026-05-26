"use client";

export function ReviewerProfileUpdate() {
    return (
        <div>
            <form id="reviewer-profile">
                <h2>Update Reviewer Profile</h2>

                <label>Full Name</label>
                <input type="text" name="fullName" />

                <label>Email</label>
                <input type="email" name="email" />

                <label>Expertise Areas</label>
                <input type="text" name="expertise" />

                <label>Affiliation</label>
                <input type="text" name="affiliation" />

                <button type="submit">Update</button>
            </form>

        </div>
    );
}
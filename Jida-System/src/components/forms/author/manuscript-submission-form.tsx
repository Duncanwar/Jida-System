"use client";

export function ManuscriptSubmissionForm() {
    return(
        <div>
            <form id="manuscript-submission" encType="multipart/form-data">
                <h2>Submit Manuscript</h2>

                <label>Title</label>
                <input type="text" name="title" required/>

                <label>Abstract</label>
                <textarea name="abstract" rows={6} required></textarea>

                <label>Keywords (comma separated)</label>
                <input type="text" name="keywords" required/>

                <label>References</label>
                <textarea name="references" rows={5} required></textarea>

                <label>Upload Manuscript (PDF or DOCX)</label>
                <input type="file" name="file" accept=".pdf, .docx" required/>

                <button type="submit">Submit</button>
            </form>


        </div>
    );
}
"use client";

export function AuthRevisionForm() { 
    return(
        <div>
            <form id="revision-form" encType="multipart/form-data">
                <h2>Upload Revision</h2>

                <label>Upload Revised Manuscript</label>
                <input type="file" name="revisedFile" accept=".pdf, .docx" required/>

                <label>Response to Reviewer Comments</label>
                <textarea name="response" rows={5} required></textarea>

                <button type="submit">Submit Revision</button>
            </form>
  
        </div>
     ); 
} 
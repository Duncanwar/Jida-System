"use client";

export function AuthSearchManuscriptForm() {
    return(
        <div>
            <form id="search-manuscripts">
                <h2>Search Manuscripts</h2>

                <label>Search</label>
                <input type="text" name="query" placeholder="Title, keyword or status"/>

                <button type="submit">Search</button>
            </form>
 
        </div>
    );
}
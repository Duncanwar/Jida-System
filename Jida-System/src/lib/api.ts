const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type LoginRole = "author" | "reviewer" | "editor";

const loginEndpointByRole: Record<LoginRole, string> = {
    author: "/api/authors/login",
    reviewer: "/api/reviewers/login",
    editor: "/api/editors/login",
};

export async function loginByRole(role: LoginRole, email: string, password: string) {
    const endpoint = loginEndpointByRole[role];

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const maybeJson = await response.json().catch(() => null);
            throw new Error(maybeJson?.message || `${role} login failed`);
        }

        const data = await response.json();
        return {
            token: data?.token ?? `demo-${role}-token`,
            user: data?.user ?? { email, role },
        };
    } catch {
        // Dummy fallback keeps frontend demo usable while backend endpoints are not ready.
        return {
            token: `demo-${role}-token`,
            user: { email, role },
        };
    }
}

export async function loginAuthor(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/authors/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
    }

    return response.json();
}

export async function registerAuthor(data: {
    email: string;
    password: string;
    name: string;
}) {
    const response = await fetch(`${API_BASE_URL}/api/authors/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
    }

    return response.json();
}

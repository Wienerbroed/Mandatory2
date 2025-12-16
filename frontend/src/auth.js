export async function authFetch(url, options = {}) {
    const token = localStorage.getItem("accessToken");

    options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    let res = await fetch(url, options);

    // If access token expired
    if (res.status === 403) {
        const refreshToken = localStorage.getItem("refreshToken");

        const refreshRes = await fetch("http://localhost:5000/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });

        const refreshData = await refreshRes.json();

        if (!refreshData.accessToken) {
            // User must log in again
            localStorage.clear();
            window.location.href = "/";
            return res;
        }

        localStorage.setItem("accessToken", refreshData.accessToken);

        // Retry original request
        options.headers.Authorization = `Bearer ${refreshData.accessToken}`;
        res = await fetch(url, options);
    }

    return res;
}

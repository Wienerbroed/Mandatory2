<script>
    import Login from "./components/Login.svelte";
    import Content from "./components/Content.svelte";
    import ResetPassword from "./components/ResetPassword.svelte";
    import UserPage from "./components/UserPage.svelte";
    import { Toaster } from "svelte-french-toast";

    let loggedIn = false;

    if (localStorage.getItem("accessToken")) {
        loggedIn = true;
    }

    function handleLoginSuccess() {
        loggedIn = true;
    }

    async function logout() {
        const refreshToken = localStorage.getItem("refreshToken");

        await fetch("http://localhost:5000/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });

        localStorage.clear();
        loggedIn = false;
        window.location.href = "/";
    }

    // Hash routing
    let hash = window.location.hash;
    window.addEventListener("hashchange", () => {
        hash = window.location.hash;
    });

    // Detect user ID from hash
    let userId = null;
    if (hash.startsWith("#/user/")) {
        userId = Number(hash.split("/")[2]);
    }
</script>

<Toaster />

<header>
    {#if loggedIn}
        <button class="logout" on:click={logout}>Log out</button>
    {/if}
</header>

{#if hash.startsWith("#/reset-password")}
    <ResetPassword />
{:else if hash.startsWith("#/user/") && userId !== null}
    <UserPage {userId} />
{:else if loggedIn}
    <Content />
{:else}
    <Login on:loginSuccess={handleLoginSuccess} />
{/if}

<style>
header {
    display: flex;
    justify-content: flex-end;
    padding: 10px;
}

.logout {
    background: #d9534f;
    color: white;
    border: none;
    padding: 8px 14px;
    border-radius: 5px;
    cursor: pointer;
}

.logout:hover {
    background: #b52b27;
}
</style>

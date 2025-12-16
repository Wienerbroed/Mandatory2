<script>
    import { createEventDispatcher } from "svelte";
    import toast from "svelte-french-toast";

    const dispatch = createEventDispatcher();

    let email = "";
    let password = "";
    let confirmPassword = "";
    let resetEmail = "";

    let message = "";
    let isLogin = true;
    let forgot = false;

    // -----------------------------
    // LOGIN
    // -----------------------------
    async function login() {
        try {
            const res = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem("accessToken", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                localStorage.setItem("userId", data.userId);

                toast.success("Login successful");
                dispatch("loginSuccess");
            } else {
                toast.error(data.error || data.message || "Login failed");
            }
        } catch {
            toast.error("Unable to connect to server");
        }
    }

    // -----------------------------
    // SIGNUP
    // -----------------------------
    async function signUp() {
        if (!email || !password || !confirmPassword) {
            toast.error("All fields are required");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/signUp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Signup successful! Please log in.");
                isLogin = true;
                confirmPassword = "";
            } else {
                toast.error(data.error || data.message || "Signup failed");
            }
        } catch {
            toast.error("Unable to connect to server");
        }
    }

    // -----------------------------
    // FORGOT PASSWORD
    // -----------------------------
    async function forgotPassword() {
        if (!resetEmail) {
            toast.error("Email is required");
            return;
        }

        try {
            await fetch("http://localhost:5000/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: resetEmail })
            });

            toast.success("If the email exists, a reset link was sent");
            forgot = false;
            resetEmail = "";
        } catch {
            toast.error("Unable to send reset email");
        }
    }

    function resetState() {
        email = "";
        password = "";
        confirmPassword = "";
        message = "";
    }
</script>

<main>
    <!-- LOGIN -->
    {#if isLogin && !forgot}
        <h1>Login</h1>

        <input type="email" placeholder="Email" bind:value={email} />
        <input type="password" placeholder="Password" bind:value={password} />

        <button on:click={login}>Login</button>

        <p>
            <a href="#" on:click|preventDefault={() => { isLogin = false; resetState(); }}>
                Create account
            </a>
        </p>

        <p>
            <a href="#" on:click|preventDefault={() => { forgot = true; resetState(); }}>
                Forgot password?
            </a>
        </p>
    {/if}

    <!-- SIGNUP -->
    {#if !isLogin && !forgot}
        <h1>Sign Up</h1>

        <input type="email" placeholder="Email" bind:value={email} />
        <input type="password" placeholder="Password" bind:value={password} />
        <input type="password" placeholder="Confirm password" bind:value={confirmPassword} />

        <button on:click={signUp}>Sign Up</button>

        <p>
            <a href="#" on:click|preventDefault={() => { isLogin = true; resetState(); }}>
                Back to login
            </a>
        </p>
    {/if}

    <!-- FORGOT PASSWORD -->
    {#if forgot}
        <h1>Forgot Password</h1>

        <input
            type="email"
            placeholder="Enter your email"
            bind:value={resetEmail}
        />

        <button on:click={forgotPassword}>
            Send reset link
        </button>

        <p>
            <a href="#" on:click|preventDefault={() => { forgot = false; resetState(); }}>
                Back to login
            </a>
        </p>
    {/if}
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        width: 320px;
        margin: 60px auto;
        font-family: 'Times New Roman', Times, serif;
    }

    h1 {
        text-align: center;
        margin-bottom: 16px;
    }

    input {
        margin-bottom: 10px;
        padding: 8px;
        font-size: 1rem;
    }

    button {
        padding: 10px;
        font-size: 1rem;
        background-color: #007BFF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background-color: #0056b3;
    }

    p {
        text-align: center;
        margin-top: 10px;
    }

    a {
        color: #007BFF;
        text-decoration: none;
        cursor: pointer;
    }

    a:hover {
        text-decoration: underline;
    }
</style>

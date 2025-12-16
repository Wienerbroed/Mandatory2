<script>
    import toast from "svelte-french-toast";

    const params = new URLSearchParams(
    window.location.hash.split("?")[1]
    );
    const token = params.get("token");

    let password = "";
    let confirmPassword = "";

    async function resetPassword() {
        const res = await fetch("http://localhost:5000/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password, confirmPassword })
        });

        const data = await res.json();

        if (data.success) {
            toast.success("Password updated!");
            window.location.href = "/";
        } else {
            toast.error(data.error);
        }
    }
</script>

<input type="password" placeholder="New password" bind:value={password} />
<input type="password" placeholder="Confirm password" bind:value={confirmPassword} />
<button on:click={resetPassword}>Reset Password</button>

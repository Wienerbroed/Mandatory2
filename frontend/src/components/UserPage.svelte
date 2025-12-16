<script>
    import { onMount } from "svelte";
    import { authFetch } from "../auth.js";
    import toast from "svelte-french-toast";

    let posts = [];
    let text = "";
    let image = "";
    let editingId = null;
    let email = "";

    let userId = null; // Current user page we are viewing
    const myId = Number(localStorage.getItem("userId"));

    // Parse hash to get userId
    function checkHash() {
        const hash = window.location.hash;
        if (hash.startsWith("#/user/")) {
            userId = Number(hash.split("/")[2]);
            loadUserPosts();
        } else {
            userId = null;
            posts = [];
        }
    }

    // Load posts for this specific user
    async function loadUserPosts() {
        if (!userId) return;

        // Fetch all posts
        const res = await fetch("http://localhost:5000/api/auth/posts");
        const allPosts = await res.json();

        // Filter posts for this user only
        posts = allPosts.filter(p => Number(p.userId) === userId);

        // Get user email
        if (posts.length > 0) {
            email = posts[0].email;
        } else {
            // fallback if user has no posts
            const userRes = await fetch(`http://localhost:5000/api/auth/user/${userId}`);
            const userData = await userRes.json();
            email = userData.email || "Unknown User";
        }
    }

    async function createPost() {
        if (!text.trim() && !image.trim()) {
            toast.error("Cannot post empty content");
            return;
        }

        const res = await authFetch("http://localhost:5000/api/auth/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, image })
        });

        const data = await res.json();

        if (data.success) {
            toast.success("Post created!");
            text = "";
            image = "";
            loadUserPosts();
        }
    }

    function startEdit(post) {
        editingId = post.id;
        text = post.text;
        image = post.image;
    }

    async function saveEdit() {
        const res = await authFetch(`http://localhost:5000/api/auth/posts/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, image })
        });

        const data = await res.json();

        if (data.success) {
            toast.success("Post updated!");
            editingId = null;
            text = "";
            image = "";
            loadUserPosts();
        }
    }

    async function deletePost(id) {
        if (!confirm("Delete this post?")) return;

        const res = await authFetch(`http://localhost:5000/api/auth/posts/${id}`, {
            method: "DELETE"
        });

        const data = await res.json();

        if (data.success) {
            toast.success("Post deleted!");
            loadUserPosts();
        }
    }

    // Run on mount and listen to hash changes
    onMount(() => {
        checkHash();
        window.addEventListener("hashchange", checkHash);
    });
</script>

<main>
    {#if userId !== null}
        <h1>{email}'s Posts</h1>
        <a href="#/">← Back to All Posts</a>

        {#if userId === myId}
            <section>
                <h2>{editingId ? "Edit Post" : "New Post"}</h2>
                <input placeholder="Write something..." bind:value={text} />
                <input placeholder="Image URL (optional)" bind:value={image} />

                {#if editingId}
                    <button on:click={saveEdit}>Save</button>
                    <button on:click={() => { editingId = null; text=""; image=""; }}>Cancel</button>
                {:else}
                    <button on:click={createPost}>Post</button>
                {/if}
            </section>
        {/if}

        <hr />

        {#each posts as post}
            <div class="post">
                <p><strong><a href={`#/user/${post.userId}`}>{post.email}</a></strong></p>
                <p>{post.text}</p>

                {#if post.image}
                    <img src={post.image} alt="Post image" width="250" />
                {/if}

                {#if Number(post.userId) === myId}
                    <button class="edit" on:click={() => startEdit(post)}>Edit</button>
                    <button class="delete" on:click={() => deletePost(post.id)}>Delete</button>
                {/if}
            </div>
        {/each}
    {:else}
        <p>Select a user to view their posts.</p>
    {/if}
</main>

<style>
main {
    max-width: 600px;
    margin: auto;
    padding: 20px;
}

section {
    margin-bottom: 20px;
}

.post {
    border: 1px solid #ccc;
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 8px;
}

.edit {
    background: #ffc107;
    border: none;
    padding: 6px;
    margin-right: 8px;
    cursor: pointer;
}

.delete {
    background: #dc3545;
    border: none;
    padding: 6px;
    color: white;
    cursor: pointer;
}

img {
    margin-top: 10px;
    border-radius: 8px;
}

a {
    color: #007bff;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}
</style>

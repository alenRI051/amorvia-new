// Aeonic Loom v1 — minimal stable loader

window.AeonicLoom = {
    load() {
        try {
            const panel = document.getElementById("aeonicLoom");
            if (!panel) {
                console.error("[AeonicLoom] Missing #aeonicLoom element");
                return;
            }

            panel.style.display = "block";
            panel.scrollIntoView({ behavior: "smooth" });

            document.getElementById("loomCategories").innerHTML = `
                <p style="color:white;">Loom v1 loaded successfully.</p>
            `;
            document.getElementById("loomContent").innerHTML = `
                <p style="color:white;">Your scenario library will appear here.</p>
            `;
        }
        catch (err) {
            console.error("Aeonic Loom failed:", err);
        }
    }
};

console.info("[AeonicLoom] v1 loaded");
